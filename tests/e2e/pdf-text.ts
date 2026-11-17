/**
 * Extracts *logical* text lines from a PDF so tests can check that bidi text
 * kept its order. pdf.js returns text items in content-stream order with
 * their positions; we rebuild each line visually (sort by x) and then apply
 * the inverse of the RTL layout: runs of LTR items stay in order, everything
 * else is reversed, and mirrored brackets are swapped back.
 */
type Item = { str: string; x: number; y: number; w: number; h: number };

const STRONG_LTR = /[A-Za-z0-9]/;
const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[" };

function logicalRtl(items: Item[]): string {
  // Group LTR items with the neutrals strictly between them.
  const units: Array<{ text: string; ltr: boolean }> = [];
  let i = 0;
  while (i < items.length) {
    if (STRONG_LTR.test(items[i].str)) {
      let j = i;
      let lastStrong = i;
      while (j + 1 < items.length && !/[֐-׿]/.test(items[j + 1].str)) {
        j++;
        if (STRONG_LTR.test(items[j].str)) lastStrong = j;
      }
      units.push({ text: items.slice(i, lastStrong + 1).map((x) => x.str).join(""), ltr: true });
      i = lastStrong + 1;
    } else {
      units.push({ text: items[i].str, ltr: false });
      i++;
    }
  }
  return units
    .reverse()
    .map((u) => (u.ltr ? u.text : Array.from(u.text).map((c) => MIRROR[c] ?? c).join("")))
    .join("");
}

export async function pdfLogicalLines(data: Uint8Array, rtl: boolean): Promise<string[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: data.slice(), disableFontFace: true, useSystemFonts: false }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: Item[] = [];
    for (const it of content.items) {
      if (!("str" in it) || it.str === "") continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || 10 });
    }
    // Group into lines by baseline.
    const rows: Item[][] = [];
    for (const it of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.find((r) => Math.abs(r[0].y - it.y) < 2);
      if (row) row.push(it);
      else rows.push([it]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      // Split visually distant groups (e.g. a title and its date column).
      const segments: Item[][] = [[]];
      row.forEach((it, idx) => {
        const prev = row[idx - 1];
        if (prev && it.x - (prev.x + prev.w) > prev.h * 2) segments.push([]);
        segments[segments.length - 1].push(it);
      });
      const texts = segments.map((s) => (rtl ? logicalRtl(s) : s.map((x) => x.str).join("")));
      lines.push((rtl ? texts.reverse() : texts).join("\t"));
    }
  }
  return lines;
}
