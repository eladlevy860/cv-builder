import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

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

/** The card whose title is exactly `title`. */
function cardByTitle(page: Page, title: string) {
  return page.getByTestId("doc-card").filter({ has: page.getByTestId("doc-title").getByText(title, { exact: true }) });
}

/** Opens a card's action menu, waiting for any previous menu to finish closing. */
async function openMenu(page: Page, card: ReturnType<Page["getByTestId"]>) {
  await expect(page.getByRole("menu")).toHaveCount(0);
  await card.getByTestId("doc-menu").click();
  await expect(page.getByRole("menu")).toBeVisible();
}

async function createCv(page: Page, opts: { language: "he" | "en"; template: string; start: "blank" | "sample" }) {
  await page.getByTestId("new-cv").click();
  await page.getByTestId(`create-lang-${opts.language}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-template-${opts.template}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-start-${opts.start}`).click();
  await expect(page.getByTestId("create-dialog")).toBeHidden();
}

test.describe("app shell", () => {
  test("Hebrew UI is RTL, English UI is LTR, and the switcher persists", async ({ page }) => {
    const errors = trackConsole(page);
    await setUiLocale(page, "he");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");

    await page.getByTestId("locale-switcher").click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hebrew and English");
    expect(errors).toEqual([]);
  });
});

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await setUiLocale(page, "en");
  });

  test("create, rename, duplicate, clone, delete and persist across reload", async ({ page }) => {
    const errors = trackConsole(page);
    await page.goto("/dashboard");
    await expect(page.getByTestId("doc-count")).toHaveText("No documents");

    await createCv(page, { language: "he", template: "classic", start: "sample" });
    await createCv(page, { language: "en", template: "modern-sidebar", start: "blank" });
    await expect(page.getByTestId("doc-card")).toHaveCount(2);
    await expect(page.getByTestId("doc-count")).toHaveText("2 documents");

    // The Hebrew sample card renders its thumbnail right-to-left.
    const heCard = page.getByTestId("doc-card").filter({ hasText: "קורות חיים – דוגמה" });
    await expect(heCard.getByTestId("lang-badge")).toHaveText("עב");
    await expect(heCard.locator('[dir="rtl"]').first()).toBeVisible();

    // Rename
    await openMenu(page, heCard);
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByTestId("rename-input").fill("קו״ח – מהנדס מכונות");
    await page.getByRole("button", { name: "Save" }).click();
    const renamed = cardByTitle(page, "קו״ח – מהנדס מכונות");
    await expect(renamed).toHaveCount(1);

    // Duplicate
    await openMenu(page, renamed);
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByTestId("doc-card")).toHaveCount(3);
    await expect(page.getByTestId("doc-card").filter({ hasText: "(copy)" })).toHaveCount(1);

    // Clone to the other language
    await openMenu(page, renamed);
    await page.getByRole("menuitem", { name: "Clone to English" }).click();
    await expect(page.getByTestId("doc-card")).toHaveCount(4);
    const clone = page.getByTestId("doc-card").filter({ hasText: "(English)" });
    await expect(clone.getByTestId("lang-badge")).toHaveText("EN");
    await expect(clone).toContainText("Professional Summary");

    // Language filter
    await page.getByTestId("filter-he").click();
    await expect(page.getByTestId("doc-card")).toHaveCount(2);
    await page.getByTestId("filter-all").click();

    // Delete with confirmation
    const copyCard = page.getByTestId("doc-card").filter({ hasText: "(copy)" });
    await openMenu(page, copyCard);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByTestId("doc-card")).toHaveCount(3);

    // Persisted in IndexedDB
    await page.reload();
    await expect(page.getByTestId("doc-card")).toHaveCount(3);
    await expect(cardByTitle(page, "קו״ח – מהנדס מכונות")).toHaveCount(1);

    // Open → editor route resolves the document by id
    await cardByTitle(page, "קו״ח – מהנדס מכונות").getByTestId("doc-title").click();
    await expect(page.getByTestId("editor-title")).toHaveText("קו״ח – מהנדס מכונות");
    expect(errors).toEqual([]);
  });

  test("full backup export and import round-trip", async ({ page }, testInfo) => {
    await page.goto("/dashboard");
    await createCv(page, { language: "he", template: "classic", start: "sample" });
    await expect(page.getByTestId("doc-card")).toHaveCount(1);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("backup-btn").click();
    const download = await downloadPromise;
    const file = testInfo.outputPath("backup.json");
    await download.saveAs(file);
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(backup.format).toBe("cv-builder-backup");
    expect(backup.documents).toHaveLength(1);
    expect(backup.documents[0].basics.email).toBe("elad@example.com");

    // Replace-import into a "fresh" browser: delete, then restore from backup.
    const card = page.getByTestId("doc-card").first();
    await openMenu(page, card);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByTestId("doc-card")).toHaveCount(0);

    await page.getByTestId("import-btn").click();
    await page.getByTestId("import-file").setInputFiles(file);
    await expect(page.getByTestId("doc-card")).toHaveCount(1);
    await expect(page.getByText("Imported 1 document")).toBeVisible();

    // Importing the same file again does not create duplicates.
    await page.getByTestId("import-btn").click();
    await page.getByTestId("import-file").setInputFiles(file);
    await expect(page.getByText("1 already up to date")).toBeVisible();
    await expect(page.getByTestId("doc-card")).toHaveCount(1);
  });
});
