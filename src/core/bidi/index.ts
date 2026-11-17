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

export type BidiRun = { text: string; rtl: boolean };

const isHebrewChar = (ch: string) => /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(ch);
const isLatinOrDigit = (ch: string) => /[A-Za-z0-9\u00C0-\u024F]/.test(ch);
/** Characters that may close an LTR token right after a letter/digit (C++, C#, 12%). */
const LTR_TRAILERS = new Set(["+", "#", "%"]);
const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function balanced(s: string): boolean {
  const stack: string[] = [];
  for (const ch of s) {
    if (OPEN[ch]) stack.push(ch);
    else if (CLOSE[ch]) {
      if (stack.pop() !== CLOSE[ch]) return false;
    }
  }
  return stack.length === 0;
}

/**
 * Splits text into direction runs relative to a base direction.
 *
 * - Base **rtl**: finds LTR tokens — spans that start and end with a Latin
 *   letter or digit and contain no Hebrew (`C++`, `GD&T`, `ISO 9001:2015`,
 *   `SolidWorks 2024`, `05/2025`, `(2023–2025)`). Surrounding brackets are
 *   included only in balanced pairs so they never get mirrored apart.
 * - Base **ltr**: finds Hebrew spans (start and end with a Hebrew letter,
 *   no Latin letters or digits inside).
 *
 * Renderers isolate each opposite-direction run (`<span dir unicode-bidi:
 * isolate>`); the DOCX exporter maps runs to `rightToLeft` runs.
 */
export function splitRuns(text: string, base: "rtl" | "ltr"): BidiRun[] {
  const chars = Array.from(text);
  const out: BidiRun[] = [];
  const baseRtl = base === "rtl";
  let i = 0;
  let plainStart = 0;

  const flushPlain = (end: number) => {
    if (end > plainStart) out.push({ text: chars.slice(plainStart, end).join(""), rtl: baseRtl });
  };

  while (i < chars.length) {
    const ch = chars[i];
    const opens = baseRtl ? isLatinOrDigit(ch) || (ch === "+" && isLatinOrDigit(chars[i + 1] ?? "")) : isHebrewChar(ch);
    if (!opens) {
      i++;
      continue;
    }
    // Extend to the furthest strong char of the run's direction without crossing the other script.
    let j = i;
    let lastStrong = i;
    while (j < chars.length) {
      const c = chars[j];
      if (baseRtl ? isHebrewChar(c) : isLatinOrDigit(c)) break;
      if (baseRtl ? isLatinOrDigit(c) : isHebrewChar(c)) lastStrong = j;
      j++;
    }
    let end = lastStrong + 1;
    if (baseRtl) {
      while (end < chars.length && LTR_TRAILERS.has(chars[end])) end++;
      // Abbreviations keep their final dot: "B.Sc.", "M.Sc.", "Ph.D."
      if (chars[end] === "." && /[A-Za-z]\.[A-Za-z]+$/.test(chars.slice(i, end).join(""))) end++;
    } else {
      // Hebrew abbreviations end with geresh/gershayim or a quote: צב"ד, ת"א
      while (end < chars.length && /["'\u05F3\u05F4]/.test(chars[end]) && isHebrewChar(chars[end - 1])) {
        if (end + 1 < chars.length && isHebrewChar(chars[end + 1])) end++;
        else break;
      }
    }
    let start = i;
    // Include an enclosing bracket pair: "(2023–2025)"
    while (start > 0 && end < chars.length && OPEN[chars[start - 1]] === chars[end]) {
      start--;
      end++;
    }
    // Drop unbalanced brackets from the inside of the run.
    let runText = chars.slice(start, end).join("");
    while (!balanced(runText) && end > start + 1 && CLOSE[chars[end - 1]]) {
      end--;
      while (end > start + 1 && /\s/.test(chars[end - 1])) end--;
      runText = chars.slice(start, end).join("");
    }
    if (!balanced(runText)) {
      // Give up isolating brackets; isolate only the core token.
      start = i;
      end = lastStrong + 1;
      runText = chars.slice(start, end).join("");
    }
    flushPlain(start);
    out.push({ text: runText, rtl: !baseRtl });
    i = end;
    plainStart = end;
  }
  flushPlain(chars.length);
  return out;
}

/** Backwards-compatible helper: runs relative to an RTL base. */
export function splitBidiRuns(s: string): BidiRun[] {
  return splitRuns(s, "rtl");
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
