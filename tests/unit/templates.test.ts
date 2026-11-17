import { describe, expect, it } from "vitest";
import { createSampleCv } from "@/core/samples";
import { applyTemplate } from "@/templates/apply";
import { packBlocks } from "@/templates/paginator";

describe("applyTemplate", () => {
  it("never touches content and follows template theme defaults", () => {
    const doc = createSampleCv("he");
    const before = JSON.stringify(doc.sections);
    applyTemplate(doc, "classic", true);
    expect(doc.theme.fontHeading).toBe("frank-ruhl-libre");
    applyTemplate(doc, "professional-header");
    expect(doc.theme.fontHeading).toBe("heebo");
    expect(doc.theme.accentColor).toBe("#1e3a8a");
    expect(JSON.stringify(doc.sections)).toBe(before);
  });

  it("keeps values the user changed", () => {
    const doc = createSampleCv("en");
    applyTemplate(doc, "classic", true);
    doc.theme.fontHeading = "rubik";
    doc.theme.accentColor = "#123456";
    applyTemplate(doc, "modern-sidebar");
    expect(doc.theme.fontHeading).toBe("rubik");
    expect(doc.theme.accentColor).toBe("#123456");
    expect(doc.templateId).toBe("modern-sidebar");
  });
});

describe("packBlocks", () => {
  const h = (pairs: Array<[string, number]>) => new Map(pairs);

  it("fills pages in order", () => {
    const blocks = [{ key: "a" }, { key: "b" }, { key: "c" }];
    expect(packBlocks(blocks, h([["a", 50], ["b", 50], ["c", 50]]), 120, 120)).toEqual([["a", "b"], ["c"]]);
  });

  it("never leaves a heading alone at the bottom of a page", () => {
    const blocks = [{ key: "x" }, { key: "h", keepWithNext: true }, { key: "i" }];
    // x fits, h would fit, but h + i do not → h moves with i.
    expect(packBlocks(blocks, h([["x", 80], ["h", 10], ["i", 40]]), 100, 100)).toEqual([["x"], ["h", "i"]]);
  });

  it("uses a smaller first page (header) and places oversize blocks alone", () => {
    const blocks = [{ key: "a" }, { key: "big" }, { key: "c" }];
    expect(packBlocks(blocks, h([["a", 30], ["big", 500], ["c", 10]]), 40, 100)).toEqual([["a"], ["big"], ["c"]]);
  });
});
