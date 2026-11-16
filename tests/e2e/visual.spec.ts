import { expect, test } from "@playwright/test";

/**
 * Visual snapshots of every implemented template × {he, en} with the sample
 * data. Baselines live in tests/e2e/visual.spec.ts-snapshots/. Regenerate
 * after intentional design changes with:
 *   npx playwright test visual --update-snapshots
 */
const TEMPLATES = ["classic", "modern-sidebar", "professional-header"];

for (const template of TEMPLATES) {
  for (const lang of ["he", "en"] as const) {
    test(`${template} · ${lang}`, async ({ page }) => {
      await page.goto(`/render?sample=${lang}&template=${template}`);
      await page.waitForFunction(() => window.__RENDER_DONE__ === true);
      const pages = page.locator(".cv-pages > .cv-page");
      const count = await pages.count();
      expect(count).toBeGreaterThan(0);
      await expect(pages.first()).toHaveAttribute("dir", lang === "he" ? "rtl" : "ltr");
      for (let i = 0; i < count; i++) {
        await expect(pages.nth(i)).toHaveScreenshot(`${template}-${lang}-p${i + 1}.png`, { maxDiffPixelRatio: 0.01 });
      }
    });
  }
}
