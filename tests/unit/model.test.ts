import { describe, expect, it } from "vitest";
import { createCoverLetter, createCv, createItem, createSection, reId } from "@/core/model/factory";
import { cloneToOtherLanguage, duplicateDocument } from "@/core/model/operations";
import {
  appendBullet,
  countBullets,
  isRichTextEmpty,
  richTextFromBullets,
  richTextFromPlain,
  richTextToPlain,
} from "@/core/model/richtext";
import { SECTION_TYPES, documentSchema, sectionSchema } from "@/core/model/schema";
import { createSampleCv, BIDI_FIXTURE_STRINGS } from "@/core/samples";
import { DEFAULT_SECTION_TITLES, sectionTitle } from "@/core/i18n-doc/labels";

describe("factories", () => {
  it("creates a valid blank CV in both languages", () => {
    for (const language of ["he", "en"] as const) {
      const doc = createCv({ language });
      expect(documentSchema.parse(doc)).toEqual(doc);
      expect(doc.schemaVersion).toBe(1);
      expect(doc.basics.extras).toEqual([]); // optional personal fields off by default
    }
  });

  it("creates a valid section of every type, with valid items", () => {
    for (const type of SECTION_TYPES) {
      const s = createSection(type);
      if (s.type !== "summary") {
        (s.items as unknown[]).push(createItem(s.type));
      }
      expect(() => sectionSchema.parse(s)).not.toThrow();
    }
  });

  it("creates a valid cover letter linked to a CV", () => {
    const cv = createSampleCv("he");
    const cl = createCoverLetter({ language: "he", linkedCv: cv });
    expect(documentSchema.parse(cl)).toEqual(cl);
    expect(cl.linkedCvId).toBe(cv.id);
    expect(cl.basics.name).toBe(cv.basics.name);
  });

  it("sample CVs validate and contain the bidi fixture", () => {
    const he = createSampleCv("he");
    const en = createSampleCv("en");
    expect(documentSchema.parse(he)).toEqual(he);
    expect(documentSchema.parse(en)).toEqual(en);
    const json = JSON.stringify(he);
    for (const s of BIDI_FIXTURE_STRINGS) expect(json).toContain(JSON.stringify(s).slice(1, -1));
    expect(he.sections.some((s) => s.type === "military")).toBe(true);
  });

  it("reId assigns fresh ids everywhere", () => {
    const doc = createSampleCv("en");
    const copy = reId(doc);
    const ids = (o: unknown): string[] =>
      Array.isArray(o)
        ? o.flatMap(ids)
        : o && typeof o === "object"
          ? Object.entries(o).flatMap(([k, v]) => (k === "id" ? [v as string] : ids(v)))
          : [];
    const a = new Set(ids(doc));
    for (const id of ids(copy)) expect(a.has(id)).toBe(false);
  });
});

describe("document operations", () => {
  it("duplicates with new id and copy suffix", () => {
    const doc = createSampleCv("he");
    const dup = duplicateDocument(doc);
    expect(dup.id).not.toBe(doc.id);
    expect(dup.title).toBe(doc.title + " (עותק)");
    expect(dup.sections.length).toBe(doc.sections.length);
  });

  it("clones to the other language with translated default titles", () => {
    const doc = createSampleCv("he");
    doc.sections[0].title = "תמצית מקצועית"; // explicit default → becomes default again
    doc.sections[1].title = "ניסיון רלוונטי"; // custom → kept as-is for the user to translate
    const en = cloneToOtherLanguage(doc);
    expect(en.language).toBe("en");
    expect(en.id).not.toBe(doc.id);
    expect(en.sections.map((s) => s.type)).toEqual(doc.sections.map((s) => s.type));
    expect(sectionTitle(en.sections[0], "en")).toBe(DEFAULT_SECTION_TITLES.en.summary);
    expect(en.sections[1].title).toBe("ניסיון רלוונטי");
    expect(sectionTitle(en.sections[3], "en")).toBe("Military Service");
    expect(en.basics.name).toBe(doc.basics.name); // content copied as-is
    expect(en.theme.fontBody).toBe("assistant");
    expect(documentSchema.parse(en)).toEqual(en);
  });
});

describe("rich text", () => {
  it("converts plain text and bullets", () => {
    const rt = richTextFromBullets(["one", "two"], "intro");
    expect(richTextToPlain(rt)).toBe("intro\n• one\n• two");
    expect(countBullets(rt)).toBe(2);
    expect(isRichTextEmpty(richTextFromPlain("  \n "))).toBe(true);
  });

  it("appends a bullet to the last list or creates one", () => {
    let rt = richTextFromPlain("intro");
    rt = appendBullet(rt, "a");
    rt = appendBullet(rt, "b");
    expect(rt.content).toHaveLength(2);
    expect(countBullets(rt)).toBe(2);
  });
});

import { normalizeRichText } from "@/core/model/richtext";

describe("normalizeRichText", () => {
  it("drops unsupported marks/attrs, flattens nested lists and trims empty tail", () => {
    const input = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title", marks: [{ type: "underline" }, { type: "bold" }] }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "link", attrs: { href: "https://x.y", target: "_blank" } }] }] },
                { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] }] },
              ],
            },
          ],
        },
        { type: "paragraph" },
      ],
    };
    expect(normalizeRichText(input)).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Title", marks: [{ type: "bold" }] }] },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "link", attrs: { href: "https://x.y" } }] }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] },
          ],
        },
      ],
    });
  });
});
