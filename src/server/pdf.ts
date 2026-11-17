import { chromium, type Browser } from "playwright";
import type { CvDocument } from "@/core/model/schema";

/**
 * Server-side PDF rendering with headless Chromium.
 *
 * Chromium opens the app's own `/render` page with the document injected,
 * waits until fonts are loaded and the paginator has laid out the pages,
 * then prints to PDF. The preview and the PDF therefore share the same HTML,
 * CSS, fonts and page breaks, and Chromium shapes Hebrew/bidi text correctly.
 */

export class PdfUnavailableError extends Error {}

const globalForPdf = globalThis as unknown as { __cvPdfBrowser?: Promise<Browser> };

function getBrowser(): Promise<Browser> {
  if (!globalForPdf.__cvPdfBrowser) {
    const launching = chromium.launch({ args: ["--font-render-hinting=none", "--disable-dev-shm-usage"] }).then((b) => {
      b.on("disconnected", () => {
        globalForPdf.__cvPdfBrowser = undefined;
      });
      return b;
    });
    launching.catch(() => {
      globalForPdf.__cvPdfBrowser = undefined;
    });
    globalForPdf.__cvPdfBrowser = launching;
  }
  return globalForPdf.__cvPdfBrowser;
}

const TIMEOUT = 45_000;

export async function renderPdf(doc: CvDocument, origin: string): Promise<Buffer> {
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (e) {
    throw new PdfUnavailableError(
      `Headless Chromium could not start. Install it with "npx playwright install chromium" (on Linux add --with-deps). ${(e as Error).message.split("\n")[0]}`,
    );
  }
  const context = await browser.newContext({ locale: doc.language === "he" ? "he-IL" : "en-US" });
  try {
    const page = await context.newPage();
    const allowed = new URL(origin).origin;
    // The render page may only load this app's own assets. User data (links,
    // photos) can never make the server fetch anything else.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith(allowed) || url.startsWith("data:") ? route.continue() : route.abort();
    });
    await page.addInitScript((d) => {
      (window as unknown as { __CV_DOC__: unknown }).__CV_DOC__ = d;
    }, doc);
    await page.goto(`${allowed}/render`, { waitUntil: "load", timeout: TIMEOUT });
    await page.waitForFunction(() => (window as unknown as { __RENDER_DONE__?: boolean }).__RENDER_DONE__ === true, null, {
      timeout: TIMEOUT,
    });
    return await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true });
  } finally {
    await context.close();
  }
}
