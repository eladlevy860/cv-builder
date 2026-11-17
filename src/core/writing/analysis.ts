import { richTextToPlain, type RichText } from "../model/richtext";
import type { Language } from "../model/schema";
import { WEAK_STARTS } from "./content";

/** Recommended summary length in characters (both languages). */
export const SUMMARY_RANGE = { min: 200, max: 600 } as const;
/** A bullet longer than this runs past two lines in most templates. */
export const BULLET_MAX = 180;
/** Shorter than this is usually a fragment. */
export const BULLET_MIN = 20;
/** Recommended bullets per role (military and volunteering roles are fine with one). */
export const BULLETS_PER_ROLE = { min: 2, max: 6 } as const;
export const BULLETS_MIN_SECONDARY = 1;

function normalizeStart(text: string): string {
  return text
    .trim()
    .replace(/^[•\-–*·\s]+/, "")
    .replace(/[־‐-]/g, "")
    .toLowerCase();
}

/** The weak opening phrase a bullet starts with, if any ("Responsible for", "אחראי על"). */
export function weakStart(text: string, lang: Language): string | null {
  const t = normalizeStart(text);
  // Hebrew "and" prefix: "ואחראי על" is just as weak.
  const variants = lang === "he" && t.startsWith("ו") ? [t, t.slice(1)] : [t];
  // Longest phrase first, so "helped with" wins over "helped".
  const phrases = [...WEAK_STARTS[lang]].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const p = phrase.replace(/[־‐-]/g, "");
    // Hebrew phrases ending in a one-letter preposition ("השתתפות ב") attach to the next word.
    const attached = lang === "he" && /\s[בלמ]$/.test(p);
    for (const v of variants) {
      if (v === p) return phrase;
      if (v.startsWith(p) && (attached || /[\s,:;.]/.test(v[p.length] ?? ""))) return phrase;
    }
  }
  return null;
}

/** Plain-text lines of every bullet (list item) in a rich-text value. */
export function bulletTexts(rt: RichText): string[] {
  const out: string[] = [];
  for (const block of rt.content) {
    if (block.type === "paragraph") continue;
    for (const li of block.content) out.push(richTextToPlain({ type: "doc", content: li.content }).trim());
  }
  return out;
}

export type BulletIssue = { index: number; text: string; long: boolean; short: boolean; weak: string | null };

/** Bullets that are too long, too short or start with a weak phrase. */
export function bulletIssues(rt: RichText, lang: Language): BulletIssue[] {
  return bulletTexts(rt)
    .map((text, index) => ({
      index,
      text,
      long: text.length > BULLET_MAX,
      short: text.length > 0 && text.length < BULLET_MIN,
      weak: weakStart(text, lang),
    }))
    .filter((b) => b.long || b.short || b.weak);
}

/** Paragraph text (not bullets) that starts with a weak phrase. */
export function weakParagraphs(rt: RichText, lang: Language): string[] {
  const out: string[] = [];
  for (const block of rt.content) {
    if (block.type !== "paragraph") continue;
    const text = richTextToPlain({ type: "doc", content: [block] });
    const w = weakStart(text, lang);
    if (w) out.push(w);
  }
  return out;
}

export function textLength(rt: RichText): number {
  return richTextToPlain(rt, "").replace(/\s+/g, " ").trim().length;
}

export type LengthVerdict = "empty" | "short" | "ok" | "long";

export function summaryVerdict(rt: RichText): { length: number; verdict: LengthVerdict } {
  const length = textLength(rt);
  const verdict: LengthVerdict = length === 0 ? "empty" : length < SUMMARY_RANGE.min ? "short" : length > SUMMARY_RANGE.max ? "long" : "ok";
  return { length, verdict };
}
