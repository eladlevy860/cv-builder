import { expect, test, type Page } from "@playwright/test";

async function setUiLocale(page: Page, locale: "he" | "en") {
  await page.context().addCookies([{ name: "ui-locale", value: locale, url: "http://localhost:3100" }]);
}

function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** Creates a sample CV in the given language and opens it in the editor. */
async function openSample(page: Page, language: "he" | "en", template = "classic") {
  await page.goto("/dashboard?new=1");
  await page.getByTestId(`create-lang-${language}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-template-${template}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId("create-start-sample").click();
  await page.getByTestId("doc-title").first().click();
  await expect(page.getByTestId("editor")).toBeVisible();
  await expect(page.getByTestId("preview-page").first()).toBeVisible();
}

const preview = (page: Page) => page.getByTestId("preview").locator(".cv-pages");

test.describe("editor", () => {
  test("live preview, autosave, reload persistence, undo/redo", async ({ page }) => {
    const errors = trackConsole(page);
    await setUiLocale(page, "en");
    await openSample(page, "he");

    const name = page.getByTestId("field-name");
    await name.fill("דנה לוי");
    await expect(preview(page).locator(".cv-name")).toHaveText("דנה לוי");
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");

    // Undo / redo via keyboard
    await page.keyboard.press("Control+z");
    await expect(preview(page).locator(".cv-name")).toHaveText("נועם כהן");
    await page.keyboard.press("Control+Shift+z");
    await expect(preview(page).locator(".cv-name")).toHaveText("דנה לוי");

    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
    await page.reload();
    await expect(preview(page).locator(".cv-name")).toHaveText("דנה לוי");
    await expect(name).toHaveValue("דנה לוי");
    expect(errors).toEqual([]);
  });

  test("Hebrew document is RTL with isolated LTR tokens; English UI keeps LTR shell", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    const pageEl = preview(page).locator(".cv-page").first();
    await expect(pageEl).toHaveAttribute("dir", "rtl");
    await expect(pageEl).toHaveAttribute("lang", "he");
    // Fixture tokens are rendered inside LTR-isolated spans.
    for (const token of ["C++, MATLAB, ISO 9001:2015", "(2023–2025)", "05/2025", "SolidWorks 2024, GD&T", "elad@example.com", "052-1234567"]) {
      await expect(preview(page).locator('[dir="ltr"]', { hasText: token }).first()).toBeVisible();
    }
  });

  test("switching templates keeps content; two-column sidebar mirrors in RTL", async ({ page }) => {
    await setUiLocale(page, "he");
    await openSample(page, "he");
    const text = await preview(page).locator(".cv-region").first().innerText();
    await page.getByTestId("template-menu").click();
    await page.getByTestId("template-option-modern-sidebar").click();
    const pageEl = preview(page).locator(".cv-page").first();
    await expect(pageEl).toHaveClass(/tpl-modern-sidebar/);
    const side = await pageEl.locator(".ms-side").boundingBox();
    const main = await pageEl.locator(".ms-main").boundingBox();
    expect(side!.x).toBeGreaterThan(main!.x); // sidebar on the right in Hebrew
    await expect(pageEl).toContainText("מהנדס מכונות (סטודנט)");

    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.getByTestId("template-menu").click();
    await page.getByTestId("template-option-classic").click();
    await expect(preview(page).locator(".cv-page").first()).toHaveClass(/tpl-classic/);
    expect(await preview(page).locator(".cv-region").first().innerText()).toBe(text);
  });

  test("English two-column sidebar sits on the left", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "en", "modern-sidebar");
    const pageEl = preview(page).locator(".cv-page").first();
    const side = await pageEl.locator(".ms-side").boundingBox();
    const main = await pageEl.locator(".ms-main").boundingBox();
    expect(side!.x).toBeLessThan(main!.x);
  });

  test("sections: add, hide, rename, reorder by keyboard drag-and-drop", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "en");
    const headings = () => preview(page).locator(".cv-heading").allInnerTexts();

    // Add a volunteering section with one item
    await page.getByTestId("add-section").click();
    await page.getByTestId("add-section-volunteering").click();
    const panel = page.locator('[data-section-panel]').last();
    await panel.getByTestId("add-item-volunteering").click();
    await panel.getByTestId("field-role").fill("Robotics mentor");
    await expect(preview(page)).toContainText("Robotics mentor");
    expect(await headings()).toContain("Volunteering");

    // Rename
    await panel.getByTestId("section-title-input").fill("Community");
    await expect.poll(headings).toContain("Community");

    // Hide
    await panel.getByTestId("section-visibility").click();
    await expect.poll(headings).not.toContain("Community");
    await panel.getByTestId("section-visibility").click();

    // Keyboard drag: move "Professional Summary" down one place
    const before = await headings();
    expect(before[0]).toBe("Professional Summary");
    const handle = page.getByRole("button", { name: "Drag to reorder Professional Summary" });
    await handle.focus();
    // dnd-kit measures between key steps; give it a moment like a real user would.
    for (const key of ["Space", "ArrowDown", "Space"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(250);
    }
    await expect.poll(async () => (await headings()).slice(0, 2)).toEqual(["Work Experience", "Professional Summary"]);
  });

  test("Military Service section works in Hebrew and English", async ({ page }) => {
    await setUiLocale(page, "he");
    await openSample(page, "he");
    await expect(preview(page).locator(".cv-heading", { hasText: "שירות צבאי" })).toBeVisible();
    await expect(preview(page)).toContainText("מכונאי מטוסים");
    await expect(preview(page)).toContainText("מצטיין יחידה");
  });

  test("clicking the preview opens the matching form item", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "en");
    await preview(page).getByText("Lab Instructor").click();
    const itemPanel = page.locator('[data-item-panel]', { has: page.getByText("Lab Instructor") });
    await expect(itemPanel.getByTestId("field-role")).toHaveValue("Lab Instructor");
  });

  test("pagination: content flows to page 2 without crossing page edges", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "en");
    const exp = page.locator('[data-section-panel]', { has: page.getByTestId("section-trigger-experience") });
    await exp.getByTestId("section-trigger-experience").click();
    // Duplicate the first job several times to force a second page.
    for (let i = 0; i < 6; i++) {
      await exp.getByRole("button", { name: /^Actions for Mechanical Engineering Intern$/ }).first().click();
      await page.getByRole("menuitem", { name: "Duplicate" }).click();
      await expect(page.getByRole("menu")).toHaveCount(0);
    }
    await expect(page.getByTestId("preview-page")).toHaveCount(2);
    await expect(page.getByTestId("page-count")).toHaveText("2 pages");

    // Every block lies fully inside its region on its page.
    const overflow = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll<HTMLElement>(".cv-pages .cv-region").forEach((region) => {
        const r = region.getBoundingClientRect();
        region.querySelectorAll<HTMLElement>(":scope > .cv-block").forEach((b) => {
          const br = b.getBoundingClientRect();
          if (br.bottom > r.bottom + 1) bad.push(b.dataset.blockKey ?? "?");
        });
        // A heading is never the last block on a page.
        const last = region.querySelector<HTMLElement>(":scope > .cv-block:last-child");
        if (last?.querySelector(".cv-heading")) bad.push(`orphan heading ${last.dataset.blockKey}`);
      });
      return bad;
    });
    expect(overflow).toEqual([]);
  });

  test("version history: save and restore", async ({ page }) => {
    await setUiLocale(page, "en");
    await openSample(page, "en");
    await page.getByTestId("history-btn").click();
    await page.getByTestId("version-name").fill("Original");
    await page.getByTestId("save-version").click();
    await expect(page.getByTestId("version-list")).toContainText("Original");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByTestId("field-name").fill("Someone Else");
    await expect(preview(page).locator(".cv-name")).toHaveText("Someone Else");
    await page.getByTestId("history-btn").click();
    await page.getByTestId("version-list").locator("li", { hasText: "Original" }).getByRole("button", { name: "Restore" }).click();
    await expect(preview(page).locator(".cv-name")).toHaveText("Noam Cohen");
  });
});
