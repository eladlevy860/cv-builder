import { isDefaultSectionTitle } from "../i18n-doc/labels";
import { defaultTheme, newId, nowIso, reId } from "./factory";
import type { AnyDocument, Language } from "./schema";

export function otherLanguage(lang: Language): Language {
  return lang === "he" ? "en" : "he";
}

const COPY_SUFFIX: Record<Language, string> = { he: " (עותק)", en: " (copy)" };

/** Duplicates a document with new ids and a "(copy)" title suffix. */
export function duplicateDocument<T extends AnyDocument>(doc: T, uiLang: Language = doc.language): T {
  const ts = nowIso();
  const copy = reId(structuredClone(doc));
  return { ...copy, id: newId(), title: doc.title + COPY_SUFFIX[uiLang], createdAt: ts, updatedAt: ts };
}

/**
 * Clones a document into the other language: same structure, design and
 * content; section titles that were left at (or set to) a default are reset
 * so they show the default of the new language. The Hebrew-only "present"
 * label and fonts adapt to the target language when they were at defaults.
 */
export function cloneToOtherLanguage<T extends AnyDocument>(doc: T): T {
  const target = otherLanguage(doc.language);
  const copy = duplicateDocument(doc);
  const srcDefaults = defaultTheme(doc.language);
  const dstDefaults = defaultTheme(target);
  const theme = { ...copy.theme };
  if (theme.fontBody === srcDefaults.fontBody) theme.fontBody = dstDefaults.fontBody;
  if (theme.fontHeading === srcDefaults.fontHeading) theme.fontHeading = dstDefaults.fontHeading;

  const lang = target === "he" ? "עברית" : "English";
  const result = { ...copy, language: target, theme, title: `${doc.title} (${lang})` };
  if (result.type === "cv") {
    result.sections = result.sections.map((s) =>
      isDefaultSectionTitle(s.type, s.title) ? { ...s, title: null } : s,
    );
  } else if (result.type === "coverLetter") {
    const l = result.letter;
    const swaps: Record<string, string> = target === "en"
      ? { "שלום רב,": "Dear Hiring Manager,", "בברכה,": "Sincerely," }
      : { "Dear Hiring Manager,": "שלום רב,", "Sincerely,": "בברכה," };
    result.letter = { ...l, opening: swaps[l.opening] ?? l.opening, closing: swaps[l.closing] ?? l.closing };
  }
  return result as T;
}

export function touch<T extends AnyDocument>(doc: T): T {
  return { ...doc, updatedAt: nowIso() };
}
