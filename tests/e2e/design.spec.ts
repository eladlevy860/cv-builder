import { expect, test, type Page } from "@playwright/test";

/** Creates a sample CV and opens it in the editor (UI in the given locale). */
async function openSample(page: Page, language: "he" | "en", template = "classic", ui: "he" | "en" = "en") {
  await page.context().addCookies([{ name: "ui-locale", value: ui, url: "http://localhost:3100" }]);
  await page.goto("/dashboard?new=1");
  await page.getByTestId(`create-lang-${language}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-template-${template}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId("create-start-sample").click();
  await page.getByTestId("doc-title").first().click();
  await expect(page.getByTestId("preview-page").first()).toBeVisible();
}

/** Visible pages only: the renderer also keeps hidden measuring copies. */
const firstPage = (page: Page) => page.getByTestId("preview").locator(".cv-pages .cv-page").first();
const cssVar = (page: Page, name: string) => firstPage(page).evaluate((el, n) => el.style.getPropertyValue(n), name);

test.describe("design panel", () => {
  test("changes apply live, undo reverts them, reset restores the template defaults", async ({ page }) => {
    await openSample(page, "he");
    await page.getByTestId("design-button").click();
    await expect(page.getByTestId("design-panel")).toBeVisible();
    await expect(page.getByTestId("design-template-name")).toHaveText("Classic");

    await page.getByTestId("accent-presets").getByRole("radio").nth(2).click();
    expect(await cssVar(page, "--cv-accent")).toBe("#0f766e");
    await page.getByTestId("accent-hex").fill("#AA3300");
    expect(await cssVar(page, "--cv-accent")).toBe("#aa3300");

    await page.getByTestId("font-size").fill("11");
    expect(await cssVar(page, "--cv-fs")).toBe("11pt");
    await page.getByTestId("font-body").selectOption("rubik");
    expect(await cssVar(page, "--cv-font-body")).toContain("Rubik");

    await page.getByTestId("heading-style-caps").click();
    await expect(firstPage(page)).toHaveClass(/cv-hs-caps/);
    await page.keyboard.press("Control+z");
    await expect(firstPage(page)).toHaveClass(/cv-hs-line/);

    await page.getByTestId("show-icons").click();
    await expect(firstPage(page)).toHaveClass(/cv-no-icons/);
    await expect(firstPage(page).locator(".cv-icon")).toHaveCount(0);

    await page.getByTestId("page-size-Letter").click();
    expect(await cssVar(page, "--cv-page-w")).toBe("215.9mm");

    await page.getByTestId("reset-design").click();
    expect(await cssVar(page, "--cv-accent")).toBe("#1f4e79");
    expect(await cssVar(page, "--cv-fs")).toBe("10pt");
    expect(await cssVar(page, "--cv-page-w")).toBe("210mm");
    await expect(firstPage(page)).not.toHaveClass(/cv-no-icons/);
    // Changes are saved like any other edit.
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
  });

  test("photo switch is disabled for templates without a photo", async ({ page }) => {
    await openSample(page, "en", "classic");
    await page.getByTestId("design-button").click();
    await expect(page.getByTestId("show-photo")).toBeDisabled();
  });
});

test.describe("template drawer", () => {
  test("shows the user's own CV in every template, filters, and switches without losing content", async ({ page }) => {
    await openSample(page, "he", "classic", "he");
    await page.getByTestId("field-name").fill("דנה לוי");
    const before = await firstPage(page).locator(".cv-region").first().innerText();

    await page.getByTestId("template-menu").click();
    const drawer = page.getByTestId("template-drawer");
    await expect(drawer).toBeVisible();
    const cards = drawer.locator('[data-testid^="template-card-"]');
    await expect(cards).toHaveCount(10);
    // Each thumbnail is the real first page of this CV.
    for (const id of ["minimal", "bold", "engineer", "student"]) {
      const card = drawer.getByTestId(`template-card-${id}`);
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator(".cv-pages .cv-page .cv-name")).toHaveText("דנה לוי");
      await expect(card.locator(".cv-pages .cv-page")).toHaveAttribute("dir", "rtl");
    }
    await expect(drawer.getByTestId("template-card-classic")).toHaveAttribute("aria-pressed", "true");

    await drawer.getByTestId("template-filter-two").click();
    await expect(cards).toHaveCount(4);
    await drawer.getByTestId("template-filter-ats").click();
    await expect(cards).toHaveCount(4);
    await drawer.getByTestId("template-filter-all").click();

    await drawer.getByTestId("template-card-engineer").click();
    await expect(drawer.getByTestId("template-card-engineer")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(firstPage(page)).toHaveClass(/tpl-engineer/);
    // Hebrew: the side panel is on the left (inline end), the main column on the right.
    const side = await firstPage(page).locator('[data-region="side"]').boundingBox();
    const main = await firstPage(page).locator('[data-region="main"]').boundingBox();
    expect(side!.x).toBeLessThan(main!.x);
    await expect(firstPage(page)).toContainText("דנה לוי");

    await page.keyboard.press("Control+z");
    await expect(firstPage(page)).toHaveClass(/tpl-classic/);
    expect(await firstPage(page).locator(".cv-region").first().innerText()).toBe(before);
  });

  test("Student moves education up, right after the summary", async ({ page }) => {
    await openSample(page, "en");
    await page.getByTestId("template-menu").click();
    await page.getByTestId("template-card-student").click();
    await page.keyboard.press("Escape");
    await expect(firstPage(page)).toHaveClass(/tpl-student/);
    const headings = await page.getByTestId("preview").locator(".cv-pages .cv-heading").allInnerTexts();
    expect(headings.slice(0, 3)).toEqual(["Professional Summary", "Education", "Work Experience"]);
  });
});

test.describe("page length", () => {
  test("a few lines on the last page: warning, then fit back on one page (undoable)", async ({ page }) => {
    await openSample(page, "he");
    await expect(page.getByTestId("preview-page")).toHaveCount(1);
    await page.getByTestId("design-button").click();
    await page.getByTestId("font-size").fill("10.5");
    await expect(page.getByTestId("preview-page")).toHaveCount(2);
    await expect(page.getByTestId("sparse-warning")).toBeVisible();

    await page.getByTestId("fit-pages").click();
    await expect(page.getByTestId("preview-page")).toHaveCount(1);
    await expect(page.getByTestId("sparse-warning")).toHaveCount(0);
    // The user's font size is kept; spacing is what gets tightened first.
    expect(await cssVar(page, "--cv-fs")).toBe("10.5pt");

    await page.keyboard.press("Control+z");
    await expect(page.getByTestId("preview-page")).toHaveCount(2);
  });

  test("an item taller than a page is reported as cut off", async ({ page }) => {
    await openSample(page, "en");
    const panel = page.locator("[data-section-panel]", { has: page.getByTestId("section-trigger-summary") });
    await panel.getByTestId("section-trigger-summary").click();
    const editor = panel.locator('[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press("End");
    // One summary paragraph per line: far more than a page, and a summary is a single block.
    for (let i = 0; i < 75; i++) {
      await page.keyboard.press("Enter");
      await page.keyboard.insertText(`Line ${i + 1} of a very long summary.`);
    }
    await expect(page.getByTestId("clip-warning")).toBeVisible();
  });
});
