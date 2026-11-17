import { countBullets, isRichTextEmpty, type RichText } from "../model/richtext";
import type { CvDocument, DateRange, Section, SectionItem } from "../model/schema";
import { itemHasContent, toEntry } from "../render/entries";
import { BULLETS_MIN_SECONDARY, BULLETS_PER_ROLE, bulletIssues, summaryVerdict } from "./analysis";

/**
 * Completeness score: a weighted checklist over the CV. Every issue points
 * at the section (and item) to fix, so the UI can link to it. Messages are
 * keys; the UI translates them, with `params` filled in.
 */

export type CheckId =
  | "contact"
  | "headline"
  | "summary"
  | "experience"
  | "bullets"
  | "bulletQuality"
  | "dates"
  | "education"
  | "skills"
  | "emptySections"
  | "pages";

export type Target = { sectionId: string; itemId?: string };

export type Issue = {
  key: string;
  params?: Record<string, string | number>;
  target?: Target;
};

export type Check = {
  id: CheckId;
  weight: number;
  /** 0–1: share of this check that passes (per-item checks give partial credit). */
  score: number;
  status: "ok" | "warning" | "error";
  issues: Issue[];
};

export type Completeness = { score: number; checks: Check[] };

export type LayoutInfo = { pages: number; lastPageFill: number } | null;

const BASICS = "basics";
const ROLE_TYPES = ["experience", "military", "volunteering"] as const;
const DATED_TYPES = ["experience", "education", "military", "volunteering", "projects"] as const;

type WithDescription = SectionItem & { description: RichText };
type WithDates = SectionItem & { dates: DateRange };

function visibleItems(s: Section): SectionItem[] {
  if (s.type === "summary") return [];
  return (s.items as SectionItem[]).filter((it) => it.visible && itemHasContent(s, it));
}

function itemName(doc: CvDocument, s: Section, it: SectionItem): string {
  const e = toEntry(s, it, doc.language, doc.theme);
  return e.title || e.subtitle || "—";
}

function check(id: CheckId, weight: number, score: number, issues: Issue[], severity: "warning" | "error" = "warning"): Check {
  const s = Math.max(0, Math.min(1, score));
  return { id, weight, score: s, status: issues.length === 0 ? "ok" : s === 0 ? severity : "warning", issues };
}

export function analyzeCompleteness(doc: CvDocument, layout: LayoutInfo = null): Completeness {
  const checks: Check[] = [];
  const b = doc.basics;
  const sections = doc.sections.filter((s) => s.visible);
  const ofType = (t: Section["type"]) => sections.filter((s) => s.type === t);

  // Contact details
  const missing = (["name", "email", "phone"] as const).filter((k) => !b[k].trim());
  checks.push(
    check(
      "contact",
      15,
      1 - missing.length / 3,
      missing.length ? [{ key: "contactMissing", params: { fields: missing.join(",") }, target: { sectionId: BASICS } }] : [],
      "error",
    ),
  );
  checks.push(check("headline", 5, b.headline.trim() ? 1 : 0, b.headline.trim() ? [] : [{ key: "headlineMissing", target: { sectionId: BASICS } }]));

  // Summary
  const summary = ofType("summary")[0];
  if (!summary || summary.type !== "summary") {
    checks.push(check("summary", 10, 0, [{ key: "summaryMissing" }], "error"));
  } else {
    const { length, verdict } = summaryVerdict(summary.content);
    const target = { sectionId: summary.id };
    if (verdict === "empty") checks.push(check("summary", 10, 0, [{ key: "summaryEmpty", target }], "error"));
    else if (verdict === "short") checks.push(check("summary", 10, 0.6, [{ key: "summaryShort", params: { length }, target }]));
    else if (verdict === "long") checks.push(check("summary", 10, 0.7, [{ key: "summaryLong", params: { length }, target }]));
    else checks.push(check("summary", 10, 1, []));
  }

  // Experience (projects count for students without a job yet)
  const exp = [...ofType("experience"), ...ofType("projects")].filter((s) => visibleItems(s).length > 0);
  const expSection = ofType("experience")[0];
  checks.push(
    check(
      "experience",
      15,
      exp.length ? 1 : 0,
      exp.length ? [] : [{ key: "experienceMissing", target: expSection ? { sectionId: expSection.id } : undefined }],
      "error",
    ),
  );

  // Bullets per role, and bullet quality
  const roleIssues: Issue[] = [];
  const qualityIssues: Issue[] = [];
  let roles = 0;
  let goodRoles = 0;
  let bullets = 0;
  let badBullets = 0;
  for (const s of sections) {
    if (!(ROLE_TYPES as readonly string[]).includes(s.type) && s.type !== "projects") continue;
    for (const it of visibleItems(s)) {
      const desc = (it as WithDescription).description;
      const target = { sectionId: s.id, itemId: it.id };
      const name = itemName(doc, s, it);
      if ((ROLE_TYPES as readonly string[]).includes(s.type)) {
        roles++;
        const n = countBullets(desc);
        const min = s.type === "experience" ? BULLETS_PER_ROLE.min : BULLETS_MIN_SECONDARY;
        if (n < min) roleIssues.push({ key: n === 0 && !isRichTextEmpty(desc) ? "bulletsAsParagraph" : "bulletsFew", params: { name, count: n }, target });
        else if (n > BULLETS_PER_ROLE.max) roleIssues.push({ key: "bulletsMany", params: { name, count: n }, target });
        else goodRoles++;
      }
      const issues = bulletIssues(desc, doc.language);
      bullets += countBullets(desc);
      badBullets += issues.length;
      for (const bi of issues) {
        if (bi.weak) qualityIssues.push({ key: "bulletWeak", params: { name, phrase: bi.weak }, target });
        else if (bi.long) qualityIssues.push({ key: "bulletLong", params: { name, length: bi.text.length }, target });
        else qualityIssues.push({ key: "bulletShort", params: { name }, target });
      }
    }
  }
  checks.push(check("bullets", 15, roles ? goodRoles / roles : 0, roleIssues));
  checks.push(check("bulletQuality", 5, bullets ? 1 - badBullets / bullets : 1, qualityIssues));

  // Dates
  const dateIssues: Issue[] = [];
  let dated = 0;
  for (const s of sections) {
    if (!(DATED_TYPES as readonly string[]).includes(s.type)) continue;
    for (const it of visibleItems(s)) {
      dated++;
      const d = (it as WithDates).dates;
      if (!d.start || (!d.end && !d.present)) {
        dateIssues.push({ key: d.start ? "dateEndMissing" : "dateStartMissing", params: { name: itemName(doc, s, it) }, target: { sectionId: s.id, itemId: it.id } });
      }
    }
  }
  checks.push(check("dates", 10, dated ? 1 - dateIssues.length / dated : 1, dateIssues));

  // Education and skills
  const edu = ofType("education").find((s) => visibleItems(s).length > 0);
  const eduAny = ofType("education")[0];
  checks.push(check("education", 10, edu ? 1 : 0, edu ? [] : [{ key: "educationMissing", target: eduAny ? { sectionId: eduAny.id } : undefined }], "error"));
  const skills = ofType("skills").find((s) => s.type === "skills" && s.items.some((g) => g.visible && g.skills.some((k) => k.name.trim())));
  const skillsAny = ofType("skills")[0];
  checks.push(check("skills", 10, skills ? 1 : 0, skills ? [] : [{ key: "skillsMissing", target: skillsAny ? { sectionId: skillsAny.id } : undefined }], "error"));

  // Visible sections with nothing to show
  const empty = sections.filter((s) => (s.type === "summary" ? isRichTextEmpty(s.content) : visibleItems(s).length === 0));
  checks.push(
    check(
      "emptySections",
      5,
      sections.length ? 1 - empty.length / sections.length : 1,
      empty.map((s) => ({ key: "sectionEmpty", params: { sectionType: s.type, title: s.title ?? "" }, target: { sectionId: s.id } })),
    ),
  );

  // Page count (from the live layout, when known)
  if (layout) {
    const issues: Issue[] = [];
    if (layout.pages > 2) issues.push({ key: "pagesTooMany", params: { pages: layout.pages } });
    else if (layout.pages > 1 && layout.lastPageFill < 0.3) issues.push({ key: "pagesSparse", params: { pages: layout.pages } });
    checks.push(check("pages", 5, issues.length ? 0.5 : 1, issues));
  }

  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + c.weight * c.score, 0);
  return { score: Math.round((got / total) * 100), checks };
}
