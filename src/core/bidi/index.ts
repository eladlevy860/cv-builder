/**
 * Bidi helpers shared by templates, DOCX export and the plain-text view.
 * Rendering primitives build on these so bidi handling lives in one place.
 */

const HEBREW = /[֐-׿יִ-ﭏ]/;
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;

export function hasHebrew(s: string): boolean {
  return HEBREW.test(s);
}

/** Direction of the first strong character (like `dir="auto"`). */
export function detectDir(s: string): "rtl" | "ltr" | null {
  for (const ch of s) {
    if (HEBREW.test(ch)) return "rtl";
    if (/[A-Za-z]/.test(ch)) return "ltr";
  }
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;
export const PHONE_RE = /^\+?[\d\s\-().]{7,}$/;

export type ContactKind = "email" | "url" | "phone" | "text";

export function classifyContact(value: string): ContactKind {
  const v = value.trim();
  if (EMAIL_RE.test(v)) return "email";
  if (PHONE_RE.test(v) && /\d{3}/.test(v.replace(/\D/g, ""))) return "phone";
  if (URL_RE.test(v)) return "url";
  return "text";
}

/** Values that must always be displayed as an isolated LTR run. */
export function isAlwaysLtr(value: string): boolean {
  const k = classifyContact(value);
  return k === "email" || k === "url" || k === "phone";
}

/**
 * Splits text into runs of RTL text and "LTR tokens" (Latin words, numbers,
 * and their joining punctuation such as `C++`, `GD&T`, `ISO 9001:2015`,
 * `05/2025`). Used by the DOCX exporter, which needs explicit run direction.
 */
export function splitBidiRuns(s: string): Array<{ text: string; rtl: boolean }> {
  const runs: Array<{ text: string; rtl: boolean }> = [];
  // An LTR run starts at a Latin letter/digit and extends over Latin/digits,
  // spaces and neutral punctuation as long as no Hebrew letter appears.
  const re = /[A-Za-z0-9+#@][A-Za-z0-9+#@&.:/_%\-–—()'"\s,]*[A-Za-z0-9+#%)]|[A-Za-z0-9]/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) runs.push({ text: s.slice(last, idx), rtl: true });
    runs.push({ text: m[0], rtl: false });
    last = idx + m[0].length;
  }
  if (last < s.length) runs.push({ text: s.slice(last), rtl: true });
  return runs.filter((r) => r.text.length > 0);
}

export function containsLatin(s: string): boolean {
  return LATIN_OR_DIGIT.test(s);
}

// ---------------------------------------------------------------------------
// Israeli phone numbers
// ---------------------------------------------------------------------------

/**
 * Formats Israeli phone numbers:
 *   0521234567      → 052-1234567
 *   +972521234567   → +972-52-123-4567
 *   031234567       → 03-1234567
 *   0771234567      → 077-1234567
 *   1800123456      → 1-800-123-456
 * Anything unrecognised is returned trimmed and unchanged.
 */
export function formatIsraeliPhone(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  // International format
  if ((hasPlus || digits.startsWith("00972")) && /^(00)?972/.test(digits)) {
    const national = digits.replace(/^(00)?972/, "").replace(/^0/, "");
    if (/^5\d{8}$/.test(national) || /^7\d{8}$/.test(national)) {
      return `+972-${national.slice(0, 2)}-${national.slice(2, 5)}-${national.slice(5)}`;
    }
    if (/^[23489]\d{7}$/.test(national)) {
      return `+972-${national.slice(0, 1)}-${national.slice(1, 4)}-${national.slice(4)}`;
    }
    return raw;
  }
  if (hasPlus) return raw;

  if (/^05\d{8}$/.test(digits) || /^07\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (/^0[23489]\d{7}$/.test(digits)) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  if (/^1[78]00\d{6}$/.test(digits)) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}
