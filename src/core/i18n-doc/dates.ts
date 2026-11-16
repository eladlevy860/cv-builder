import type { DateRange, Language, Theme, YearMonth } from "../model/schema";

const MONTHS_LONG: Record<Language, string[]> = {
  he: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const MONTHS_SHORT: Record<Language, string[]> = {
  // Hebrew has no customary month abbreviations on CVs; use the full name.
  he: MONTHS_LONG.he,
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export type DateFormat = Theme["dateFormat"];

export const EN_DASH = "–";

export function formatYearMonth(ym: YearMonth | null | undefined, lang: Language, format: DateFormat): string {
  if (!ym) return "";
  const { year, month } = ym;
  if (!month || format === "YYYY") return String(year);
  switch (format) {
    case "MM/YYYY":
      return `${String(month).padStart(2, "0")}/${year}`;
    case "MMM YYYY":
      return `${MONTHS_SHORT[lang][month - 1]} ${year}`;
    case "MMMM YYYY":
      return `${MONTHS_LONG[lang][month - 1]} ${year}`;
  }
}

export function presentLabel(lang: Language, presentLabelHe: Theme["presentLabelHe"] = "היום"): string {
  return lang === "he" ? presentLabelHe : "Present";
}

export type FormattedRange = { start: string; end: string; text: string };

/**
 * Formats a date range. The `text` form is always written in logical order
 * "start – end"; templates render it inside an LTR-isolated span only when
 * both ends are numeric, so the bidi algorithm never flips the punctuation.
 */
export function formatDateRange(
  range: DateRange,
  lang: Language,
  format: DateFormat,
  presentLabelHe: Theme["presentLabelHe"] = "היום",
): FormattedRange {
  const start = formatYearMonth(range.start, lang, format);
  const end = range.present ? presentLabel(lang, presentLabelHe) : formatYearMonth(range.end, lang, format);
  let text = "";
  if (start && end) text = start === end ? start : `${start} ${EN_DASH} ${end}`;
  else text = start || end;
  return { start, end, text };
}

/** Sort key for reverse-chronological ordering (present first). */
export function rangeSortKey(range: DateRange): number {
  if (range.present) return Number.MAX_SAFE_INTEGER;
  const ym = range.end ?? range.start;
  return ym ? ym.year * 100 + (ym.month ?? 0) : 0;
}
