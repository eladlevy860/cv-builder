import { describe, expect, it } from "vitest";
import { createCv } from "@/core/model/factory";
import { createSampleCv } from "@/core/samples";
import { applyTemplate, resetDesign, templateTheme } from "@/templates/apply";
import { FIT_FLOORS, fitCandidates } from "@/templates/fit";
import { TEMPLATES } from "@/templates/meta";
import { planStats } from "@/templates/paginator";
import { getTemplate, isTemplateImplemented } from "@/templates/registry";

describe("template registry", () => {
  it("implements all ten templates with matching metadata", () => {
    expect(TEMPLATES).toHaveLength(10);
    for (const m of TEMPLATES) {
      expect(isTemplateImplemented(m.id), m.id).toBe(true);
      const def = getTemplate(m.id);
      expect(def.meta.id).toBe(m.id);
      expect(def.className).toBe(`tpl-${m.id}`);
      // Two-column templates say which sections go to the side column.
      expect(!!def.sideTypes, m.id).toBe(m.columns === 2);
    }
  });

  it("every template lays out the sample CV in both languages", () => {
    for (const m of TEMPLATES) {
      for (const lang of ["he", "en"] as const) {
        const doc = createSampleCv(lang);
        applyTemplate(doc, m.id, true);
        const ctx = { doc, theme: doc.theme, lang, dir: lang === "he" ? "rtl" : "ltr", meta: m } as const;
        const layout = getTemplate(m.id).build(ctx);
        const keys = [...layout.main, ...layout.side].map((b) => b.key);
        expect(new Set(keys).size, `${m.id}/${lang}: duplicate block keys`).toBe(keys.length);
        expect(layout.main.length).toBeGreaterThan(0);
        if (m.columns === 2) expect(layout.side.length, `${m.id}/${lang}: empty side column`).toBeGreaterThan(0);
      }
    }
  });
});

describe("applyTemplate / resetDesign", () => {
  it("Student moves education right after the summary, once, keeping other sections in order", () => {
    const doc = createCv({ language: "he" });
    const before = doc.sections.map((s) => s.type);
    expect(before.slice(0, 3)).toEqual(["summary", "experience", "education"]);
    applyTemplate(doc, "student");
    expect(doc.sections.map((s) => s.type)).toEqual(["summary", "education", "experience", ...before.slice(3)]);
    // Switching away does not move anything back.
    applyTemplate(doc, "classic");
    expect(doc.sections.map((s) => s.type).slice(0, 3)).toEqual(["summary", "education", "experience"]);
  });

  it("resetDesign returns to the template's theme but keeps the photo choice", () => {
    const doc = createSampleCv("en");
    applyTemplate(doc, "compact", true);
    doc.theme.accentColor = "#123456";
    doc.theme.baseFontSize = 12;
    doc.theme.showPhoto = true;
    resetDesign(doc);
    expect(doc.theme).toEqual({ ...templateTheme("compact", "en"), showPhoto: true });
    expect(doc.theme.baseFontSize).toBe(9);
  });

  it("template theme defaults survive a round trip through other templates", () => {
    const doc = createSampleCv("he");
    applyTemplate(doc, "elegant", true);
    expect(doc.theme.fontBody).toBe("frank-ruhl-libre");
    applyTemplate(doc, "bold");
    expect(doc.theme.fontBody).toBe("heebo");
    expect(doc.theme.fontHeading).toBe("rubik");
    applyTemplate(doc, "classic");
    expect(doc.theme).toEqual(templateTheme("classic", "he"));
  });
});

describe("fit to fewer pages", () => {
  const base = { sectionSpacing: 5, lineHeight: 1.4, pageMargins: 14, baseFontSize: 10.5 };

  it("produces progressively tighter candidates, spacing first, font size last", () => {
    const c = fitCandidates(base);
    expect(c.length).toBeGreaterThan(3);
    expect(c[0]).toEqual({ ...base, sectionSpacing: 4.5 });
    for (let i = 1; i < c.length; i++) {
      for (const k of ["sectionSpacing", "lineHeight", "pageMargins", "baseFontSize"] as const) {
        expect(c[i][k]).toBeLessThanOrEqual(c[i - 1][k]);
      }
    }
    // The first candidates keep the user's font size.
    expect(c[0].baseFontSize).toBe(10.5);
    expect(c[1].baseFontSize).toBe(10.5);
  });

  it("never goes below the floors and drops no-op candidates", () => {
    for (const c of fitCandidates({ sectionSpacing: 2.5, lineHeight: 1.22, pageMargins: 9, baseFontSize: 9 })) {
      expect(c.sectionSpacing).toBeGreaterThanOrEqual(FIT_FLOORS.sectionSpacing);
      expect(c.lineHeight).toBeGreaterThanOrEqual(FIT_FLOORS.lineHeight);
      expect(c.pageMargins).toBeGreaterThanOrEqual(FIT_FLOORS.pageMargins);
      expect(c.baseFontSize).toBeGreaterThanOrEqual(FIT_FLOORS.baseFontSize);
    }
    expect(fitCandidates(FIT_FLOORS)).toEqual([]);
  });
});

describe("planStats", () => {
  const heights = new Map([
    ["a", 400],
    ["b", 500],
    ["c", 100],
    ["big", 1200],
  ]);

  it("reports how full the last page is", () => {
    const s = planStats([{ pages: [["a", "b"], ["c"]], capFirst: 950, capRest: 1000 }], heights);
    expect(s).toEqual({ pages: 2, lastPageFill: 0.1, clipped: false });
  });

  it("uses the fuller column of a two-column last page", () => {
    const s = planStats(
      [
        { pages: [["a"], ["c"]], capFirst: 1000, capRest: 1000 },
        { pages: [["b"], ["a"]], capFirst: 1000, capRest: 1000 },
      ],
      heights,
    );
    expect(s.lastPageFill).toBe(0.4);
  });

  it("flags a block taller than a page", () => {
    expect(planStats([{ pages: [["big"]], capFirst: 1000, capRest: 1000 }], heights).clipped).toBe(true);
  });
});
