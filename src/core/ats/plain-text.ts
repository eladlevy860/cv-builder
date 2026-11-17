import { formatIsraeliPhone } from "../bidi";
import { sectionTitle } from "../i18n-doc/labels";
import { richTextToPlain } from "../model/richtext";
import type { CvDocument, Section, SectionItem } from "../model/schema";
import { extraLabel, join, levelLabel, renderableSections, toEntry } from "../render/entries";

/**
 * The CV as an applicant-tracking system would extract it: plain text in
 * reading order, one field per line, no columns, icons or graphics. Built
 * from the same entry model as the templates and the Word export, so it
 * shows exactly the content of the CV.
 */
export function cvToPlainText(doc: CvDocument): string {
  const lang = doc.language;
  const lines: string[] = [];
  const b = doc.basics;
  const push = (s: string) => lines.push(s.trimEnd());

  if (b.name.trim()) push(b.name.trim());
  if (b.headline.trim()) push(b.headline.trim());
  const contacts = [b.phone.trim() ? formatIsraeliPhone(b.phone) : "", b.email.trim(), b.city.trim(), ...b.links.map((l) => l.url.trim())].filter(Boolean);
  if (contacts.length) push(contacts.join(" | "));
  for (const x of b.extras) {
    if (!x.visible || !x.value.trim()) continue;
    const label = extraLabel(x.kind, x.label, lang);
    push(label ? `${label}: ${x.value.trim()}` : x.value.trim());
  }

  for (const s of renderableSections(doc)) {
    lines.push("");
    const title = sectionTitle(s, lang);
    push(lang === "en" ? title.toUpperCase() : title);
    sectionLines(doc, s).forEach(push);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sectionLines(doc: CvDocument, s: Section): string[] {
  const lang = doc.language;
  const out: string[] = [];
  if (s.type === "summary") return richTextToPlain(s.content, "- ").split("\n");
  const items = s.items as SectionItem[];
  if (s.type === "skills") {
    for (const g of s.items) {
      const names = g.skills
        .filter((k) => k.name.trim())
        .map((k) => (s.levelDisplay !== "none" && (k.levelText || k.level) ? `${k.name.trim()} (${k.levelText || levelLabel(k.level, lang)})` : k.name.trim()));
      if (!names.length) continue;
      out.push(g.name.trim() ? `${g.name.trim()}: ${names.join(", ")}` : names.join(", "));
    }
    return out;
  }
  if (s.type === "languages") {
    for (const l of s.items) {
      const level = l.fluency || (l.level ? levelLabel(l.level, lang) : "");
      out.push(join([l.language, s.levelDisplay === "none" ? "" : level], " – "));
    }
    return out;
  }
  items.forEach((it, i) => {
    const e = toEntry(s, it, lang, doc.theme);
    if (i > 0) out.push("");
    const head = join([join([e.title, e.subtitle], ", "), e.location, e.date?.text], " | ");
    if (head) out.push(head);
    if (e.meta.length) out.push(e.meta.map((m) => (m.label ? `${m.label}: ${m.value}` : m.value)).join(" | "));
    if (e.description) out.push(...richTextToPlain(e.description, "- ").split("\n"));
  });
  return out;
}
