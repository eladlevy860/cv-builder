import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { docxToBuffer } from "@/core/export/docx";
import { reId } from "@/core/model/factory";
import type { CvDocument } from "@/core/model/schema";
import { createSampleCv } from "@/core/samples";
import { applyTemplate } from "@/templates/apply";

/**
 * Regression test: a CV that fits on N pages in the template (PDF) must not
 * need more pages as a Word file. Word documents are laid out with
 * LibreOffice (metric-compatible with Word's Arial/Times New Roman).
 * Skipped when LibreOffice is not installed.
 */
const soffice = ["soffice", "libreoffice"].find((bin) => spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0);
const OUT = path.resolve("test-output/docx-fit");

async function webPages(page: import("@playwright/test").Page, doc: CvDocument) {
  await page.addInitScript((d) => {
    (window as unknown as { __CV_DOC__: unknown }).__CV_DOC__ = d;
  }, doc);
  await page.goto("/render");
  await page.waitForFunction(() => (window as unknown as { __RENDER_DONE__?: boolean }).__RENDER_DONE__ === true);
  return page.evaluate(() => (window as unknown as { __RENDER_PAGES__: number }).__RENDER_PAGES__);
}

/** Pages of the Word file and how far down its last page the text reaches (0–1 of the area inside the margins). */
async function docxLayout(doc: CvDocument, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.docx`);
  fs.writeFileSync(file, await docxToBuffer(doc));
  execFileSync(soffice!, ["--headless", "--convert-to", "pdf", "--outdir", OUT, file], { stdio: "ignore", timeout: 120_000 });
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(file.replace(/\.docx$/, ".pdf"))) }).promise;
  const last = await pdf.getPage(pdf.numPages);
  const { height } = last.getViewport({ scale: 1 });
  const margin = (doc.theme.pageMargins / 25.4) * 72;
  const items = (await last.getTextContent()).items.filter((it) => "str" in it && it.str.trim());
  const lowest = Math.min(...items.map((it) => ("transform" in it ? it.transform[5] : height)));
  return { pages: pdf.numPages, fill: (height - margin - lowest) / (height - 2 * margin) };
}

test.describe("Word export is about as long as the template, never longer", () => {
  test.skip(!soffice, "LibreOffice is not installed");

  for (const template of ["classic", "modern-sidebar", "professional-header"]) {
    for (const lang of ["he", "en"] as const) {
      test(`${template} · ${lang}`, async ({ browser }) => {
        // Grow the CV item by item; check the fullest one-page version and the first two-page version.
        let lastOnePage: CvDocument | null = null;
        let firstTwoPage: CvDocument | null = null;
        for (let extra = 0; extra < 8 && !firstTwoPage; extra++) {
          const doc = createSampleCv(lang);
          applyTemplate(doc, template, true);
          const exp = doc.sections.find((s) => s.type === "experience");
          if (exp?.type === "experience") for (let i = 0; i < extra; i++) exp.items.push(reId(structuredClone(exp.items[1])));
          const page = await browser.newPage();
          const pages = await webPages(page, doc);
          await page.close();
          if (pages === 1) lastOnePage = doc;
          else firstTwoPage = doc;
        }
        expect(lastOnePage, "sample should fit one page").not.toBeNull();
        const full = await docxLayout(lastOnePage!, `${template}-${lang}-full-page`);
        expect(full.pages, "a one-page CV must be one page in Word").toBe(1);
        // …without a big empty gap: a nearly full template page should fill most of the Word page.
        expect(full.fill, "Word page is much emptier than the template page").toBeGreaterThan(0.78);
        if (firstTwoPage) expect((await docxLayout(firstTwoPage, `${template}-${lang}-two-pages`)).pages).toBeLessThanOrEqual(2);
      });
    }
  }
});
