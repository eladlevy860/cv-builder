import { describe, expect, it } from "vitest";
import { cvToPlainText } from "@/core/ats/plain-text";
import { hebrewStems, matchKeywords, normalizeHebrew, tokenize } from "@/core/ats/keywords";
import { createCv, createItem } from "@/core/model/factory";
import { richTextFromBullets, richTextFromPlain } from "@/core/model/richtext";
import { BIDI_FIXTURE_STRINGS, createSampleCv } from "@/core/samples";
import { bulletIssues, summaryVerdict, weakStart } from "@/core/writing/analysis";
import { analyzeCompleteness } from "@/core/writing/completeness";
import { ACTION_VERBS, EXAMPLES, GUIDANCE } from "@/core/writing/content";

describe("Hebrew normalization", () => {
  it("removes geresh, gershayim, quotes and niqqud, and maps final letters", () => {
    expect(normalizeHebrew('צה"ל')).toBe("צהל");
    expect(normalizeHebrew("צה״ל")).toBe("צהל");
    expect(normalizeHebrew("ג׳וניור")).toBe("גוניור");
    expect(normalizeHebrew("פייתון")).toBe("פייתונ");
    expect(normalizeHebrew("שָׁלוֹם")).toBe("שלומ");
    expect(normalizeHebrew("מכונות")).toBe("מכונות");
  });

  it("strips one-letter prefixes and common suffixes into candidate stems", () => {
    expect(hebrewStems("בתכנון")).toContain("תכנונ");
    expect(hebrewStems("והמכונות")).toEqual(expect.arrayContaining(["מכונות", "מכונ"]));
    expect(hebrewStems("מכונה")).toContain("מכונ");
    expect(hebrewStems("הנדסת")).toContain("הנדס");
    expect(hebrewStems("פרויקטים")).toContain("פרויקט");
    // Never stems below three letters
    for (const s of hebrewStems("שלוש")) expect(s.length).toBeGreaterThanOrEqual(3);
  });

  it("tokenizes C++, GD&T, צה\"ל and Hebrew prefixes on Latin words", () => {
    expect(tokenize('ניסיון ב-SolidWorks, C++ ו-GD&T בצה"ל').map((t) => t.text)).toEqual(["ניסיון", "ב", "SolidWorks", "C++", "ו", "GD&T", 'בצה"ל']);
  });
});

describe("job-ad keyword matching", () => {
  const cv = 'תכנון עגלות ל-צב"ד, הכנת שרטוטי ייצור לפי GD&T. כלים: SolidWorks 2024, MATLAB, C++. שירות בצה״ל. פרויקט גמר במכונות.';

  it("matches through Hebrew prefixes, final letters, gershayim and plurals", () => {
    const ad = 'דרוש/ה מהנדס/ת מכונות עם ניסיון בתכנון מכני וב-SolidWorks. היכרות עם GD&T, ++C ו-Python. יתרון לניסיון בניהול פרויקטים ובוגרי צה"ל.';
    const r = matchKeywords(ad, cv);
    const byLabel = Object.fromEntries(r.keywords.map((k) => [k.label, k.matched]));
    expect(byLabel["SolidWorks"]).toBe(true);
    expect(byLabel["GD&T"]).toBe(true);
    expect(byLabel["Python"]).toBe(false);
    expect(byLabel["ניהול פרויקטים"]).toBe(false);
    expect(byLabel['צה"ל']).toBe(true);
    expect(byLabel["מכונות"]).toBe(true);
    // A matched word is labelled the way the CV spells it, without the ad's prefix.
    expect(byLabel["תכנון"]).toBe(true);
    expect(Object.keys(byLabel)).not.toContain("בתכנון");
    // Generic job-ad words are not keywords
    for (const w of ["ניסיון", "היכרות", "יתרון", "דרוש"]) expect(Object.keys(byLabel)).not.toContain(w);
    // Known skills rank first
    expect(r.keywords[0].known).toBe(true);
  });

  it("matches a prefixed word in the ad to the bare word in the CV and the other way round", () => {
    expect(matchKeywords("ניסיון בתכנון ובשרטוט", "תכנון ושרטוט").keywords.every((k) => k.matched)).toBe(true);
    expect(matchKeywords("תכנון שרטוט", "בתכנון ובשרטוט").keywords.every((k) => k.matched)).toBe(true);
  });

  it("never labels a keyword with a different CV word that only shares a stem", () => {
    const r = matchKeywords("תחזוקת מכונות", "הטכניון – מכון טכנולוגי לישראל, הנדסת מכונות");
    expect(r.keywords.map((k) => k.label)).toContain("מכונות");
    expect(r.keywords.map((k) => k.label)).not.toContain("מכון");
  });

  it("maps Hebrew spellings of tools to their Latin names", () => {
    const r = matchKeywords("שליטה במטלב ובסולידוורקס", "MATLAB, SolidWorks");
    expect(r.keywords.map((k) => k.matched)).toEqual([true, true]);
  });

  it("English: case-insensitive, light plurals, stopwords removed", () => {
    const r = matchKeywords("We are looking for an engineer with experience in Python and production drawings. Strong English required.", "python, drawing, english");
    const labels = r.keywords.map((k) => k.label);
    expect(labels).toEqual(expect.arrayContaining(["Python", "drawings", "English"]));
    expect(labels).not.toContain("looking");
    expect(labels).not.toContain("experience");
    expect(r.keywords.find((k) => k.label === "drawings")!.matched).toBe(true);
    expect(r.keywords.find((k) => k.label === "engineer")!.matched).toBe(false);
  });

  it("returns highlight ranges that point at the ad text", () => {
    const ad = "Requirements: SolidWorks and FEA. SolidWorks certification is a plus.";
    const r = matchKeywords(ad, "SolidWorks");
    const sw = r.ranges.filter((x) => ad.slice(x.start, x.end) === "SolidWorks");
    expect(sw).toHaveLength(2);
    expect(sw.every((x) => x.matched)).toBe(true);
    expect(r.ranges.find((x) => ad.slice(x.start, x.end) === "FEA")!.matched).toBe(false);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(100);
  });
});

describe("writing analysis", () => {
  it("detects weak openings in both languages", () => {
    expect(weakStart("Responsible for the test lab", "en")).toBe("responsible for");
    expect(weakStart("• Helped with testing", "en")).toBe("helped with");
    expect(weakStart("Helpful tooling", "en")).toBeNull();
    expect(weakStart("אחראי על תכנון", "he")).toBe("אחראי על");
    expect(weakStart("השתתפות בפרויקט", "he")).toBe("השתתפות ב");
    expect(weakStart("השתתפות ב־פרויקט", "he")).toBe("השתתפות ב");
    expect(weakStart("ואחראי על הצוות", "he")).toBe("אחראי על");
    expect(weakStart("תכנון מכלולים", "he")).toBeNull();
  });

  it("flags long, short and weak bullets", () => {
    const rt = richTextFromBullets(["Designed fixtures", "x".repeat(200), "Responsible for QA reports and audits"]);
    const issues = bulletIssues(rt, "en");
    expect(issues.map((i) => [i.index, i.short, i.long, !!i.weak])).toEqual([
      [0, true, false, false],
      [1, false, true, false],
      [2, false, false, true],
    ]);
  });

  it("rates summary length", () => {
    expect(summaryVerdict(richTextFromPlain("")).verdict).toBe("empty");
    expect(summaryVerdict(richTextFromPlain("Short.")).verdict).toBe("short");
    expect(summaryVerdict(richTextFromPlain("a".repeat(300))).verdict).toBe("ok");
    expect(summaryVerdict(richTextFromPlain("a".repeat(800))).verdict).toBe("long");
  });
});

describe("writing content", () => {
  it("every verb, example and tip exists in both languages", () => {
    for (const verbs of Object.values(ACTION_VERBS)) for (const v of verbs) expect(v.he && v.en).toBeTruthy();
    for (const fields of Object.values(EXAMPLES)) for (const list of Object.values(fields!)) for (const e of list!) expect(e.he && e.en).toBeTruthy();
    for (const g of Object.values(GUIDANCE)) expect(g!.he.length).toBe(g!.en.length);
  });

  it("no example bullet starts with a weak phrase", () => {
    for (const [type, fields] of Object.entries(EXAMPLES)) {
      if (type === "summary") continue;
      for (const list of Object.values(fields!)) {
        for (const e of list!) {
          expect(weakStart(e.en, "en"), e.en).toBeNull();
          expect(weakStart(e.he, "he"), e.he).toBeNull();
        }
      }
    }
  });
});

describe("completeness", () => {
  it("the sample CV scores high; an empty CV scores low", () => {
    const sample = analyzeCompleteness(createSampleCv("he"), { pages: 1, lastPageFill: 0.9 });
    expect(sample.score).toBeGreaterThanOrEqual(85);
    const empty = analyzeCompleteness(createCv({ language: "en" }));
    expect(empty.score).toBeLessThan(25);
    const contact = empty.checks.find((c) => c.id === "contact")!;
    expect(contact.status).toBe("error");
    expect(contact.issues[0].target).toEqual({ sectionId: "basics" });
  });

  it("points at the item to fix", () => {
    const doc = createSampleCv("en");
    const exp = doc.sections.find((s) => s.type === "experience")!;
    if (exp.type !== "experience") throw new Error();
    const item = createItem("experience") as (typeof exp.items)[number];
    item.role = "Technician";
    item.description = richTextFromBullets(["Responsible for maintenance of the line"]);
    exp.items.push(item);
    const r = analyzeCompleteness(doc);
    const bullets = r.checks.find((c) => c.id === "bullets")!;
    expect(bullets.issues).toEqual([{ key: "bulletsFew", params: { name: "Technician", count: 1 }, target: { sectionId: exp.id, itemId: item.id } }]);
    const dates = r.checks.find((c) => c.id === "dates")!;
    expect(dates.issues[0]).toMatchObject({ key: "dateStartMissing", target: { itemId: item.id } });
    const quality = r.checks.find((c) => c.id === "bulletQuality")!;
    expect(quality.issues.some((i) => i.key === "bulletWeak" && i.target?.itemId === item.id)).toBe(true);
  });

  it("reports page-count problems from the layout", () => {
    const doc = createSampleCv("en");
    expect(analyzeCompleteness(doc, { pages: 3, lastPageFill: 0.8 }).checks.find((c) => c.id === "pages")!.issues[0].key).toBe("pagesTooMany");
    expect(analyzeCompleteness(doc, { pages: 2, lastPageFill: 0.1 }).checks.find((c) => c.id === "pages")!.issues[0].key).toBe("pagesSparse");
  });
});

describe("ATS plain text", () => {
  it("contains every fixture string in logical order and one field per line", () => {
    const text = cvToPlainText(createSampleCv("he"));
    for (const s of BIDI_FIXTURE_STRINGS) expect(text).toContain(s);
    expect(text).toContain("ניסיון תעסוקתי");
    expect(text).toMatch(/^- /m);
  });

  it("English section titles are upper-case; hidden sections are left out", () => {
    const doc = createSampleCv("en");
    doc.sections.find((s) => s.type === "military")!.visible = false;
    const text = cvToPlainText(doc);
    expect(text).toContain("WORK EXPERIENCE");
    expect(text).not.toContain("MILITARY SERVICE");
  });
});
