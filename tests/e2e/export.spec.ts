import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";
import { pdfLogicalLines } from "./pdf-text";

/** The bidi fixture strings (same as BIDI_FIXTURE_STRINGS in src/core/samples). */
const FIXTURE_HE = [
  "מהנדס מכונות, SolidWorks 2024, GD&T",
  "elad@example.com",
  "052-1234567",
  "linkedin.com/in/example",
  "05/2025 – היום",
  "(2023–2025)",
  'תכנון עגלות ל-צב"ד, כולל BOM ו-SOW',
  "C++, MATLAB, ISO 9001:2015",
];

/** Generated files are kept for manual inspection. */
const OUT = path.resolve("test-output/e2e-exports");

async function openSample(page: Page, language: "he" | "en", template = "classic") {
  await page.context().addCookies([{ name: "ui-locale", value: "en", url: "http://localhost:3100" }]);
  await page.goto("/dashboard?new=1");
  await page.getByTestId(`create-lang-${language}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-template-${template}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId("create-start-sample").click();
  await page.getByTestId("doc-title").first().click();
  await expect(page.getByTestId("preview-page").first()).toBeVisible();
}

async function download(page: Page, testId: string, file: string) {
  await page.getByTestId("download-menu").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId(testId).click()]);
  fs.mkdirSync(OUT, { recursive: true });
  const target = path.join(OUT, file);
  await dl.saveAs(target);
  return { target, name: dl.suggestedFilename(), data: new Uint8Array(fs.readFileSync(target)) };
}

test.describe("export", () => {
  for (const template of ["classic", "modern-sidebar", "professional-header"]) {
    test(`Hebrew PDF keeps every bidi fixture string in logical order (${template})`, async ({ page }) => {
      await openSample(page, "he", template);
      const pdf = await download(page, "download-pdf", `bidi-fixture-he-${template}.pdf`);
      expect(pdf.name).toBe("קורות חיים – דוגמה.pdf");
      expect(Buffer.from(pdf.data.slice(0, 5)).toString()).toBe("%PDF-");
      const text = (await pdfLogicalLines(pdf.data, true)).join("\n");
      for (const s of FIXTURE_HE) expect(text, `missing "${s}"`).toContain(s);
      expect(text).toContain("B.Sc. – הנדסת מכונות");
      // Same number of pages as the preview.
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdfDoc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdf.target)) }).promise;
      expect(pdfDoc.numPages).toBe(await page.getByTestId("preview-page").count());
    });
  }

  test("English PDF", async ({ page }) => {
    await openSample(page, "en");
    const pdf = await download(page, "download-pdf", "sample-en.pdf");
    const text = (await pdfLogicalLines(pdf.data, false)).join("\n");
    for (const s of ["Noam Cohen", "05/2025 – Present", "C++ and MATLAB", "ISO 9001:2015", "Military Service"]) expect(text).toContain(s);
  });

  test("Hebrew DOCX: bidirectional paragraphs and fixture strings", async ({ page }) => {
    await openSample(page, "he");
    const docx = await download(page, "download-docx", "bidi-fixture-he.docx");
    expect(docx.name).toBe("קורות חיים – דוגמה.docx");
    const xml = await (await JSZip.loadAsync(docx.data)).file("word/document.xml")!.async("string");
    expect(xml).toContain("<w:bidi/>");
    const plain = xml
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[\u200E\u200F\u2060]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
    for (const s of FIXTURE_HE) expect(plain, `missing "${s}"`).toContain(s);
  });

  test("Print / Save as PDF opens the print view (menu and Ctrl+P)", async ({ page, context }) => {
    // Stub the print dialog in every page of this context (including pop-ups).
    await context.addInitScript(() => {
      (window as unknown as { __printed: boolean }).__printed = false;
      window.print = () => {
        (window as unknown as { __printed: boolean }).__printed = true;
      };
    });
    await openSample(page, "he");
    for (const trigger of ["menu", "shortcut"] as const) {
      const popupPromise = context.waitForEvent("page");
      if (trigger === "menu") {
        await page.getByTestId("download-menu").click();
        await page.getByTestId("print").click();
      } else {
        await page.keyboard.press("Control+p");
      }
      const popup = await popupPromise;
      await popup.waitForURL(/\/render\?id=.+&print=1/);
      await popup.waitForFunction(() => (window as unknown as { __printed: boolean }).__printed === true);
      await expect(popup.locator(".cv-pages > .cv-page")).toHaveCount(1);
      await expect(popup.locator(".cv-pages > .cv-page").first()).toHaveAttribute("dir", "rtl");
      await popup.close();
    }
  });

  test("PDF API rejects invalid and cross-origin requests", async ({ request }) => {
    const bad = await request.post("/api/pdf", { data: { document: { hello: 1 } } });
    expect(bad.status()).toBe(400);
    const cross = await request.post("/api/pdf", { data: { document: {} }, headers: { origin: "https://evil.example" } });
    expect(cross.status()).toBe(403);
  });
});
