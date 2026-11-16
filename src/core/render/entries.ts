import { formatDateRange, formatYearMonth, type FormattedRange } from "../i18n-doc/dates";
import { EXTRA_FIELD_LABELS, LEVEL_TEXT } from "../i18n-doc/labels";
import { isRichTextEmpty } from "../model/richtext";
import type { RichText } from "../model/richtext";
import type { CvDocument, DateRange, Language, Section, SectionItem, Theme, YearMonth } from "../model/schema";

/**
 * Format-independent view of a section item. Templates, the DOCX exporter
 * and the plain-text/ATS view all render from this, so every output shows
 * the same fields in the same order.
 */
export type Entry = {
  title: string;
  subtitle: string;
  location: string;
  date: FormattedRange | null;
  /** True when the date text contains only digits and separators (safe to isolate as LTR). */
  numericDate: boolean;
  /** Short extra lines, e.g. grade, rank, distinctions, link. */
  meta: Array<{ label: string; value: string; kind?: "link" | "text" }>;
  description: RichText | null;
};

export const DOC_LABELS: Record<Language, Record<string, string>> = {
  he: { grade: "ממוצע", rank: "דרגה", distinctions: "הצטיינות", link: "קישור", email: "דוא״ל", phone: "טלפון" },
  en: { grade: "GPA", rank: "Rank", distinctions: "Distinctions", link: "Link", email: "Email", phone: "Phone" },
};

const NUMERIC_DATE = /^[\d/.\s–-]+$/;

function range(r: DateRange, lang: Language, theme: Theme) {
  const f = formatDateRange(r, lang, theme.dateFormat, theme.presentLabelHe);
  return f.text ? f : null;
}

function single(ym: YearMonth | null, lang: Language, theme: Theme): FormattedRange | null {
  const text = formatYearMonth(ym, lang, theme.dateFormat);
  return text ? { start: text, end: "", text } : null;
}

function desc(rt: RichText): RichText | null {
  return isRichTextEmpty(rt) ? null : rt;
}

/** Joins non-empty parts. */
export function join(parts: Array<string | undefined | null>, sep: string): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(sep);
}

export function toEntry(section: Section, item: SectionItem, lang: Language, theme: Theme): Entry {
  const L = DOC_LABELS[lang];
  const e: Entry = { title: "", subtitle: "", location: "", date: null, numericDate: false, meta: [], description: null };
  switch (section.type) {
    case "experience":
    case "volunteering": {
      const it = item as Extract<SectionItem, { organization: string; role: string; dates: DateRange }>;
      Object.assign(e, { title: it.role, subtitle: it.organization, location: it.location, date: range(it.dates, lang, theme), description: desc(it.description) });
      break;
    }
    case "education": {
      const it = item as Extract<Section, { type: "education" }>["items"][number];
      Object.assign(e, {
        title: join([it.degree, it.field], " – "),
        subtitle: it.institution,
        location: it.location,
        date: range(it.dates, lang, theme),
        description: desc(it.description),
      });
      if (it.grade.trim()) e.meta.push({ label: L.grade, value: it.grade });
      break;
    }
    case "military": {
      const it = item as Extract<Section, { type: "military" }>["items"][number];
      Object.assign(e, { title: it.role, subtitle: it.unit, date: range(it.dates, lang, theme), description: desc(it.description) });
      if (it.rank.trim()) e.meta.push({ label: L.rank, value: it.rank });
      if (it.distinctions.trim()) e.meta.push({ label: L.distinctions, value: it.distinctions });
      break;
    }
    case "projects": {
      const it = item as Extract<Section, { type: "projects" }>["items"][number];
      Object.assign(e, { title: it.name, subtitle: it.role, date: range(it.dates, lang, theme), description: desc(it.description) });
      if (it.link.trim()) e.meta.push({ label: L.link, value: it.link, kind: "link" });
      break;
    }
    case "courses": {
      const it = item as Extract<Section, { type: "courses" }>["items"][number];
      Object.assign(e, { title: it.name, subtitle: it.issuer, date: single(it.date, lang, theme), description: desc(it.description) });
      if (it.link.trim()) e.meta.push({ label: L.link, value: it.link, kind: "link" });
      break;
    }
    case "awards": {
      const it = item as Extract<Section, { type: "awards" }>["items"][number];
      Object.assign(e, { title: it.title, subtitle: it.issuer, date: single(it.date, lang, theme), description: desc(it.description) });
      break;
    }
    case "custom": {
      const it = item as Extract<Section, { type: "custom" }>["items"][number];
      Object.assign(e, { title: it.title, subtitle: it.subtitle, location: it.location, date: range(it.dates, lang, theme), description: desc(it.description) });
      if (it.link.trim()) e.meta.push({ label: L.link, value: it.link, kind: "link" });
      break;
    }
    case "references": {
      const it = item as Extract<Section, { type: "references" }>["items"][number];
      Object.assign(e, { title: it.name, subtitle: join([it.role, it.organization], ", ") });
      if (it.email.trim()) e.meta.push({ label: L.email, value: it.email, kind: "link" });
      if (it.phone.trim()) e.meta.push({ label: L.phone, value: it.phone, kind: "link" });
      if (it.note.trim()) e.meta.push({ label: "", value: it.note });
      break;
    }
    default:
      break;
  }
  e.numericDate = !!e.date && NUMERIC_DATE.test(e.date.text);
  return e;
}

/** True if an item has any user content worth rendering. */
export function itemHasContent(section: Section, item: SectionItem): boolean {
  const skip = new Set(["id", "visible", "level"]);
  const walk = (v: unknown, key?: string): boolean => {
    if (key && skip.has(key)) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((x) => walk(x));
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.type === "doc") return !isRichTextEmpty(o as RichText);
      if ("year" in o) return typeof o.year === "number";
      return Object.entries(o).some(([k, x]) => walk(x, k));
    }
    return false;
  };
  void section;
  return walk(item);
}

/** Sections that should appear in rendered output, with only their visible, non-empty items. */
export function renderableSections(doc: CvDocument): Section[] {
  const out: Section[] = [];
  for (const s of doc.sections) {
    if (!s.visible) continue;
    if (s.type === "summary") {
      if (!isRichTextEmpty(s.content)) out.push(s);
      continue;
    }
    const items = (s.items as SectionItem[]).filter((it) => it.visible && itemHasContent(s, it));
    if (items.length) out.push({ ...s, items } as Section);
  }
  return out;
}

export function levelLabel(level: number, lang: Language): string {
  return LEVEL_TEXT[lang][level] ?? "";
}

export function extraLabel(kind: string, label: string, lang: Language): string {
  if (kind === "custom") return label;
  return EXTRA_FIELD_LABELS[lang][kind as keyof (typeof EXTRA_FIELD_LABELS)["he"]] ?? label;
}
