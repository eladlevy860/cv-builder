import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { docxToBuffer } from "@/core/export/docx";
import { sectionTitle } from "@/core/i18n-doc/labels";
import { renderableSections } from "@/core/render/entries";
import { BIDI_FIXTURE_STRINGS, createSampleCv } from "@/core/samples";

const OUT = path.resolve("test-output/docx");

type Run = { text: string; rtl: boolean };
type Para = { bidi: boolean; runs: Run[]; text: string };

// Directional marks (LRM/RLM) are invisible; strip them before comparing text.
const unescape = (s: string) =>
  s.replace(/[\u200E\u200F\u2060]/g, "").replace(/\u00A0/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Minimal parse of word/document.xml: paragraphs, runs, run direction. */
async function readDocx(buf: Buffer): Promise<Para[]> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  const paras: Para[] = [];
  for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    const runs: Run[] = [];
    for (const r of p.match(/<w:r>[\s\S]*?<\/w:r>|<w:r [\s\S]*?<\/w:r>/g) ?? []) {
      const t = (r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? []).map((x) => unescape(x.replace(/<[^>]+>/g, ""))).join("");
      if (!t) continue;
      runs.push({ text: t, rtl: /<w:rtl\/>|<w:rtl w:val="(true|1)"\/>/.test(r) });
    }
    paras.push({ bidi: /<w:bidi\/>|<w:bidi w:val="(true|1)"\/>/.test(pPr), runs, text: runs.map((r) => r.text).join("") });
  }
  return paras;
}

describe("DOCX export", () => {
  it("Hebrew: bidirectional paragraphs, RTL Hebrew runs, LTR tokens, all fixture strings", async () => {
    const doc = createSampleCv("he");
    const buf = await docxToBuffer(doc);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "sample-he.docx"), buf);
    const paras = await readDocx(buf);
    const withText = paras.filter((p) => p.text.trim());
    expect(withText.every((p) => p.bidi)).toBe(true);

    const all = withText.map((p) => p.text).join("\n");
    for (const s of BIDI_FIXTURE_STRINGS) expect(all).toContain(s);
    expect(all).toContain("05/2025 – היום");

    // Number-only LTR runs are pinned with LRM marks so Word keeps their order.
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    const plainXml = xml.replace(/\u2060/g, "").replace(/\u00A0/g, " ");
    expect(plainXml).toContain("\u200E10/2023 – 02/2025\u200E");
    expect(plainXml).toContain("\u200E(2023–2025)\u200E");
    // …and never wrap inside: no ordinary spaces in number-only runs.
    expect(xml).toContain("\u200E10/2023\u00A0–\u00A002/2025\u200E");
    expect(xml).not.toContain("\u2060");

    const runs = withText.flatMap((p) => p.runs);
    // Hebrew words are in RTL runs; pure-LTR tokens are in LTR runs.
    expect(runs.find((r) => r.text.includes("ניסיון תעסוקתי"))?.rtl).toBe(true);
    expect(runs.find((r) => r.text === "C++, MATLAB, ISO 9001:2015")?.rtl).toBe(false);
    expect(runs.find((r) => r.text === "(2023–2025)")?.rtl).toBe(false);
    expect(runs.find((r) => r.text === "SolidWorks 2024, GD&T")?.rtl).toBe(false);
    expect(runs.find((r) => r.text === "elad@example.com")?.rtl).toBe(false);
    for (const r of runs) if (/[֐-׿]/.test(r.text)) expect(r.rtl, r.text).toBe(true);
  });

  it("section order and titles match the CV", async () => {
    for (const lang of ["he", "en"] as const) {
      const doc = createSampleCv(lang);
      doc.sections.reverse(); // order must follow the document, whatever it is
      const paras = await readDocx(await docxToBuffer(doc));
      const titles = renderableSections(doc).map((s) => sectionTitle(s, lang));
      const found = titles.map((t) => paras.findIndex((p) => p.text === t));
      expect(found.every((i) => i >= 0)).toBe(true);
      expect([...found].sort((a, b) => a - b)).toEqual(found);
    }
  });

  it("English: LTR paragraphs and no RTL runs", async () => {
    const doc = createSampleCv("en");
    const buf = await docxToBuffer(doc);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "sample-en.docx"), buf);
    const paras = (await readDocx(buf)).filter((p) => p.text.trim());
    expect(paras.some((p) => p.bidi)).toBe(false);
    expect(paras.flatMap((p) => p.runs).some((r) => r.rtl)).toBe(false);
    expect(paras.map((p) => p.text).join("\n")).toContain("05/2025 – Present");
  });

  it("hidden sections and items are left out", async () => {
    const doc = createSampleCv("he");
    const military = doc.sections.find((s) => s.type === "military")!;
    military.visible = false;
    const exp = doc.sections.find((s) => s.type === "experience");
    if (exp?.type === "experience") exp.items[1].visible = false;
    const all = (await readDocx(await docxToBuffer(doc))).map((p) => p.text).join("\n");
    expect(all).not.toContain("שירות צבאי");
    expect(all).not.toContain("מדריך מעבדה");
  });
});
