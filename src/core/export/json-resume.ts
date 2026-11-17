import { hasHebrew } from "../bidi";
import { createCv, createItem, createSection, createSkill, newId } from "../model/factory";
import { richTextFromBullets, richTextFromPlain } from "../model/richtext";
import type { CvDocument, DateRange, Language, Section, YearMonth } from "../model/schema";

/** Minimal shape of https://jsonresume.org/schema (all optional). */
type JR = {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; region?: string };
    profiles?: Array<{ network?: string; username?: string; url?: string }>;
  };
  work?: Array<{ name?: string; position?: string; location?: string; startDate?: string; endDate?: string; summary?: string; highlights?: string[] }>;
  volunteer?: Array<{ organization?: string; position?: string; startDate?: string; endDate?: string; summary?: string; highlights?: string[] }>;
  education?: Array<{ institution?: string; area?: string; studyType?: string; startDate?: string; endDate?: string; score?: string; courses?: string[] }>;
  awards?: Array<{ title?: string; date?: string; awarder?: string; summary?: string }>;
  certificates?: Array<{ name?: string; date?: string; issuer?: string; url?: string }>;
  skills?: Array<{ name?: string; level?: string; keywords?: string[] }>;
  languages?: Array<{ language?: string; fluency?: string }>;
  projects?: Array<{ name?: string; description?: string; highlights?: string[]; startDate?: string; endDate?: string; url?: string; roles?: string[] }>;
  references?: Array<{ name?: string; reference?: string }>;
};

export function looksLikeJsonResume(v: unknown): v is JR {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.basics === "object" && ("work" in o || "education" in o || "skills" in o || "basics" in o) && !("schemaVersion" in o);
}

export function parseIsoYearMonth(s: string | undefined): YearMonth | null {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : undefined;
  return month && month >= 1 && month <= 12 ? { year, month } : { year };
}

function range(start?: string, end?: string): DateRange {
  return { start: parseIsoYearMonth(start), end: parseIsoYearMonth(end), present: !!start && !end };
}

function desc(summary?: string, highlights?: string[]) {
  return richTextFromBullets(highlights?.filter(Boolean) ?? [], summary?.trim() || undefined);
}

/** Converts a JSON Resume object into a CV document. */
export function fromJsonResume(jr: JR, language?: Language): CvDocument {
  const b = jr.basics ?? {};
  const lang: Language = language ?? (hasHebrew(`${b.name ?? ""}${b.summary ?? ""}${b.label ?? ""}`) ? "he" : "en");
  const doc = createCv({ language: lang, title: b.name ? b.name : undefined });
  doc.basics = {
    ...doc.basics,
    name: b.name ?? "",
    headline: b.label ?? "",
    email: b.email ?? "",
    phone: b.phone ?? "",
    city: [b.location?.city, b.location?.region].filter(Boolean).join(", "),
    links: [
      ...(b.url ? [{ id: newId(), label: "", url: b.url }] : []),
      ...(b.profiles ?? []).filter((p) => p.url).map((p) => ({ id: newId(), label: p.network ?? "", url: p.url ?? "" })),
    ],
  };

  const sections: Section[] = [];
  if (b.summary) {
    const s = createSection("summary");
    s.content = richTextFromPlain(b.summary);
    sections.push(s);
  }
  if (jr.work?.length) {
    const s = createSection("experience");
    s.items = jr.work.map((w) => ({
      ...createItem("experience"),
      role: w.position ?? "",
      organization: w.name ?? "",
      location: w.location ?? "",
      dates: range(w.startDate, w.endDate),
      description: desc(w.summary, w.highlights),
    }));
    sections.push(s);
  }
  if (jr.education?.length) {
    const s = createSection("education");
    s.items = jr.education.map((e) => ({
      ...createItem("education"),
      degree: e.studyType ?? "",
      field: e.area ?? "",
      institution: e.institution ?? "",
      dates: range(e.startDate, e.endDate),
      grade: e.score ?? "",
      description: desc(undefined, e.courses),
    }));
    sections.push(s);
  }
  if (jr.projects?.length) {
    const s = createSection("projects");
    s.items = jr.projects.map((p) => ({
      ...createItem("projects"),
      name: p.name ?? "",
      role: p.roles?.join(", ") ?? "",
      link: p.url ?? "",
      dates: range(p.startDate, p.endDate),
      description: desc(p.description, p.highlights),
    }));
    sections.push(s);
  }
  if (jr.skills?.length) {
    const s = createSection("skills");
    s.items = jr.skills.map((g) => ({
      ...createItem("skills"),
      name: g.name ?? "",
      skills: (g.keywords ?? []).map((k) => createSkill(k)),
    }));
    sections.push(s);
  }
  if (jr.certificates?.length) {
    const s = createSection("courses");
    s.items = jr.certificates.map((c) => ({
      ...createItem("courses"),
      name: c.name ?? "",
      issuer: c.issuer ?? "",
      date: parseIsoYearMonth(c.date),
      link: c.url ?? "",
    }));
    sections.push(s);
  }
  if (jr.awards?.length) {
    const s = createSection("awards");
    s.items = jr.awards.map((a) => ({
      ...createItem("awards"),
      title: a.title ?? "",
      issuer: a.awarder ?? "",
      date: parseIsoYearMonth(a.date),
      description: desc(a.summary),
    }));
    sections.push(s);
  }
  if (jr.volunteer?.length) {
    const s = createSection("volunteering");
    s.items = jr.volunteer.map((v) => ({
      ...createItem("volunteering"),
      role: v.position ?? "",
      organization: v.organization ?? "",
      dates: range(v.startDate, v.endDate),
      description: desc(v.summary, v.highlights),
    }));
    sections.push(s);
  }
  if (jr.languages?.length) {
    const s = createSection("languages");
    s.items = jr.languages.map((l) => ({ ...createItem("languages"), language: l.language ?? "", fluency: l.fluency ?? "" }));
    sections.push(s);
  }
  if (jr.references?.length) {
    const s = createSection("references");
    s.items = jr.references.map((r) => ({ ...createItem("references"), name: r.name ?? "", note: r.reference ?? "" }));
    sections.push(s);
  }
  doc.sections = sections;
  return doc;
}
