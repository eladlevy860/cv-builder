import { expect, test, type Page } from "@playwright/test";

async function open(page: Page, language: "he" | "en", start: "sample" | "blank" = "sample", ui: "he" | "en" = "en") {
  await page.context().addCookies([{ name: "ui-locale", value: ui, url: "http://localhost:3100" }]);
  await page.goto("/dashboard?new=1");
  await page.getByTestId(`create-lang-${language}`).click();
  await page.getByTestId("create-next").click();
  await page.getByTestId("create-template-classic").click();
  await page.getByTestId("create-next").click();
  await page.getByTestId(`create-start-${start}`).click();
  await page.getByTestId("doc-title").first().click();
  await expect(page.getByTestId("preview-page").first()).toBeVisible();
}

const pages = (page: Page) => page.getByTestId("preview").locator(".cv-pages");
const sectionPanel = (page: Page, type: string) => page.locator("[data-section-panel]", { has: page.getByTestId(`section-trigger-${type}`) });

test.describe("writing help", () => {
  test("examples insert as editable bullets in the chosen role, and Ctrl+Z removes them", async ({ page }) => {
    await open(page, "en");
    const exp = sectionPanel(page, "experience");
    await exp.getByTestId("writing-help-toggle").click();
    const help = exp.getByTestId("writing-help");
    await expect(help).toBeVisible();
    await expect(help.getByTestId("example").first()).toContainText("Designed [12] mechanical assemblies");
    // Defaults to the first role
    await expect(help.getByTestId("example-target").locator("option:checked")).toHaveText("Mechanical Engineering Intern");

    await help.getByTestId("add-example").first().click();
    const firstJob = pages(page).locator(".cv-item--experience").first();
    await expect(firstJob).toContainText("Designed [12] mechanical assemblies in SolidWorks");

    // Into a new role
    await help.getByTestId("example-target").selectOption("new");
    await help.getByTestId("example-field-general").click();
    await help.getByTestId("add-example").first().click();
    await expect(pages(page).locator(".cv-item--experience")).toHaveCount(3);
    await expect(pages(page).locator(".cv-item--experience").nth(2)).toContainText("Led a team of [6]");

    await page.keyboard.press("Control+z");
    await expect(pages(page).locator(".cv-item--experience")).toHaveCount(2);
    await page.keyboard.press("Control+z");
    await expect(firstJob).not.toContainText("Designed [12]");
  });

  test("Hebrew: tips, bilingual action words and Hebrew examples", async ({ page }) => {
    await open(page, "he", "sample", "he");
    const exp = sectionPanel(page, "experience");
    await exp.getByTestId("writing-help-toggle").click();
    const help = exp.getByTestId("writing-help");
    await help.getByTestId("help-tab-tips").click();
    await expect(help).toContainText("פתחו כל שורה בשם פעולה");
    await help.getByTestId("help-tab-verbs").click();
    await help.getByTestId("verb-cat-improve").click();
    const verb = help.getByTestId("verb").first();
    await expect(verb).toContainText("הפחתת");
    await expect(verb).toContainText("Reduced");
    await verb.click();
    await expect(page.getByText("הועתק: הפחתת")).toBeVisible();
    await help.getByTestId("help-tab-examples").click();
    await help.getByTestId("add-example").nth(1).click();
    await expect(pages(page).locator(".cv-item--experience").first()).toContainText("הפחתת משקל המכלול ב־[15]%");
  });

  test("length hints flag weak openings and long bullets as you type", async ({ page }) => {
    await open(page, "en");
    const exp = sectionPanel(page, "experience");
    await exp.getByTestId("section-trigger-experience").click();
    await exp.getByTestId("item-toggle").first().click();
    const editor = exp.getByTestId("field-description").first();
    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("Responsible for weekly audits");
    const hints = exp.getByTestId("bullet-hints").first();
    await expect(hints.getByTestId("bullet-issue")).toContainText("starts with “responsible for”");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText("Designed ".repeat(25));
    await expect(hints.getByTestId("bullet-issue").filter({ hasText: "is long" })).toBeVisible();
    await expect(hints).toContainText(/\d bullets \(2–6 work well for a role\)/);
  });
});

test.describe("review", () => {
  test("score and checklist; each issue links to the field to fix", async ({ page }) => {
    await open(page, "en", "blank");
    await page.getByTestId("panel-tab-review").click();
    const score = Number(await page.getByTestId("score").innerText());
    expect(score).toBeLessThan(25);
    await expect(page.getByTestId("check-contact")).toHaveAttribute("data-status", "error");
    await page.getByTestId("check-contact").getByTestId("issue-go").click();
    await expect(page.getByTestId("panel-tab-content")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("field-name")).toBeVisible();
    await page.getByTestId("field-name").fill("Dana Levi");
    await page.getByTestId("field-email").fill("dana@example.com");
    await page.getByTestId("field-phone").fill("0521234567");
    await page.getByTestId("panel-tab-review").click();
    await expect(page.getByTestId("check-contact")).toHaveCount(0); // passed checks are folded away
    expect(Number(await page.getByTestId("score").innerText())).toBeGreaterThan(score);

    await page.getByTestId("check-summary").getByTestId("issue-go").click();
    await expect(page.getByTestId("field-summary")).toBeVisible();
  });

  test("the sample CV scores high and the badge shows it", async ({ page }) => {
    await open(page, "he", "sample", "he");
    expect(Number(await page.getByTestId("score-badge").innerText())).toBeGreaterThanOrEqual(85);
  });
});

test.describe("ATS tools", () => {
  test("keyword match: highlights, adds a missing tool to skills, keeps the ad after reload", async ({ page }) => {
    await open(page, "en");
    await page.getByTestId("panel-tab-ats").click();
    await page.getByTestId("job-ad").fill("Requirements: B.Sc. in mechanical engineering, SolidWorks, GD&T and FEA. Six Sigma is an advantage.");
    await expect(page.getByTestId("kw-matched").filter({ hasText: "SolidWorks" })).toBeVisible();
    await expect(page.getByTestId("kw-missing").filter({ hasText: "FEA" })).toBeVisible();
    await expect(page.getByTestId("highlighted-ad").locator('mark[data-matched="true"]', { hasText: "GD&T" })).toBeVisible();
    const before = Number((await page.getByTestId("match-score").innerText()).replace("%", ""));

    await page.getByTestId("kw-missing").filter({ hasText: "FEA" }).getByTestId("kw-add").click();
    await expect(page.getByTestId("kw-matched").filter({ hasText: "FEA" })).toBeVisible();
    await expect(pages(page).locator(".cv-skills").first()).toContainText("FEA");
    expect(Number((await page.getByTestId("match-score").innerText()).replace("%", ""))).toBeGreaterThan(before);

    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
    await page.reload();
    await page.getByTestId("panel-tab-ats").click();
    await expect(page.getByTestId("job-ad")).toHaveValue(/Six Sigma/);
  });

  test("Hebrew ad against a Hebrew CV, with prefixes", async ({ page }) => {
    await open(page, "he", "sample", "he");
    await page.getByTestId("panel-tab-ats").click();
    await page.getByTestId("job-ad").fill("דרוש/ה מהנדס/ת מכונות. ניסיון בתכנון מכני ובהכנת שרטוטי ייצור, שליטה ב-SolidWorks. יתרון לניסיון בניהול פרויקטים.");
    await expect(page.getByTestId("kw-matched").filter({ hasText: "תכנון" })).toBeVisible();
    await expect(page.getByTestId("kw-matched").filter({ hasText: "SolidWorks" })).toBeVisible();
    await expect(page.getByTestId("kw-missing").filter({ hasText: "ניהול פרויקטים" })).toBeVisible();
  });

  test("plain-text view shows what an ATS extracts", async ({ page }) => {
    await open(page, "en");
    await page.getByTestId("panel-tab-ats").click();
    await page.getByTestId("ats-view-text").click();
    const text = page.getByTestId("plain-text");
    await expect(text).toContainText("WORK EXPERIENCE");
    await expect(text).toContainText("Mechanical Engineering Intern, Defense industry company | Haifa | 05/2025 – Present");
  });
});

test("clone to the other language from the editor", async ({ page }) => {
  await open(page, "he", "sample", "en");
  const url = page.url();
  await page.getByTestId("clone-language").click();
  await expect(page).not.toHaveURL(url);
  await expect(pages(page).locator(".cv-page").first()).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("doc-title-input")).toHaveValue(/\(English\)$/);
  // Content is carried over as is, for the user to translate.
  await expect(pages(page)).toContainText("נועם כהן");
});
