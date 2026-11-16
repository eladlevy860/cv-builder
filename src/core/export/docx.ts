import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertMillimetersToTwip,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import { classifyContact, formatIsraeliPhone, splitRuns } from "../bidi";
import { sectionTitle } from "../i18n-doc/labels";
import { FONTS } from "../model/fonts";
import type { RichText, RTInline } from "../model/richtext";
import type { CvDocument, Language, Section, SectionItem, SectionOf } from "../model/schema";
import { extraLabel, levelLabel, renderableSections, toEntry, type Entry } from "../render/entries";

/**
 * Word export: a simplified single-column rendition of the CV with the same
 * sections, order and content as the template. Hebrew documents use
 * bidirectional paragraphs; every run carries an explicit direction so mixed
 * tokens (C++, GD&T, 05/2025…) keep their order in Word and LibreOffice.
 *
 * Fonts: Word cannot use the web fonts, so sans-serif themes map to Arial and
 * serif themes to Times New Roman — both ship with Hebrew on Windows and macOS.
 */

const PAGE = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } } as const;
const BULLETS = "cv-bullets";
const NUMBERS = "cv-numbers";

type Ctx = {
  doc: CvDocument;
  lang: Language;
  rtl: boolean;
  accent: string;
  bodyFont: string;
  headingFont: string;
  /** Half-points. */
  size: number;
  /** Space before a section heading, in twips. */
  gap: number;
  contentWidth: number;
  listInstance: number;
};

function officeFont(id: keyof typeof FONTS): string {
  return FONTS[id].category === "serif" ? "Times New Roman" : "Arial";
}

const ptToTwip = (pt: number) => Math.round(pt * 20);

/**
 * Word's "auto" line spacing is a multiple of the font's own line height
 * (≈1.15 em for Arial), while CSS line-height is a multiple of the font size.
 * Convert, then tighten by 10%: Word documents should come out slightly
 * shorter than the template so a one-page CV stays one page in Word too.
 */
export const WORD_DENSITY = 0.9;
function wordLineSpacing(cssLineHeight: number): number {
  return Math.round(240 * (cssLineHeight / 1.15) * WORD_DENSITY);
}

const LRM = "\u200E";
const RLM = "\u200F";
const WJ = "\u2060";

/**
 * Word and LibreOffice do not isolate runs the way browsers do: a number-only
 * LTR run such as "10/2023 – 02/2025" inside a Hebrew paragraph would still be
 * reordered ("02/2025 – 10/2023"). Wrapping each opposite-direction run in
 * invisible directional marks (LRM / RLM) pins its order in every editor.
 */
function pin(text: string, runRtl: boolean, paragraphRtl: boolean): string {
  if (runRtl === paragraphRtl) {
    // Letter-less separators (" | ", ", ", " · ") sit between two pinned
    // opposite-direction runs; pin them to the paragraph direction too, or
    // the two neighbours merge into one run and swap places.
    if (/[\p{L}\p{N}]/u.test(text)) return text;
    const m = paragraphRtl ? RLM : LRM;
    return m + text + m;
  }
  const m = runRtl ? RLM : LRM;
  return m + text + m;
}
const mmToPt = (mm: number) => mm * 2.835;

/** Text → runs with explicit direction (the core of the bidi handling for Word). */
function runs(ctx: Ctx, text: string, opts: Omit<IRunOptions, "text"> = {}, base?: "rtl" | "ltr"): TextRun[] {
  if (!text) return [];
  const dir = base ?? (ctx.rtl ? "rtl" : "ltr");
  const font = (opts.font as string | undefined) ?? ctx.bodyFont;
  const parts = splitRuns(text, dir);
  return parts.map(
    (r, i) =>
      new TextRun({
        size: ctx.size,
        ...opts,
        // After an opening bracket, a word joiner stops editors from breaking
        // the line between "(" and the pinned run that follows it.
        text: (/[([{]$/.test(parts[i - 1]?.text ?? "") && r.rtl !== ctx.rtl ? WJ : "") + pin(r.text, r.rtl, ctx.rtl),
        rightToLeft: r.rtl,
        font: { ascii: font, hAnsi: font, cs: font },
        language: { value: ctx.lang === "he" ? "he-IL" : "en-US", bidirectional: "he-IL" },
      }),
  );
}

/** A value that must always read left-to-right (email, phone, URL). */
function ltrRun(ctx: Ctx, text: string, opts: Omit<IRunOptions, "text"> = {}): TextRun {
  return new TextRun({
    size: ctx.size,
    ...opts,
    text: pin(text, false, ctx.rtl),
    rightToLeft: false,
    font: { ascii: ctx.bodyFont, hAnsi: ctx.bodyFont, cs: ctx.bodyFont },
  });
}

function link(ctx: Ctx, value: string): ParagraphChild {
  const kind = classifyContact(value);
  const href =
    kind === "email" ? `mailto:${value}` : kind === "phone" ? `tel:${value.replace(/[^\d+]/g, "")}` : /^https?:/i.test(value) ? value : `https://${value}`;
  const display = kind === "url" ? value.replace(/^https?:\/\//i, "").replace(/\/$/, "") : value;
  return new ExternalHyperlink({ link: href, children: [ltrRun(ctx, display, { color: ctx.accent.slice(1) })] });
}

function para(ctx: Ctx, children: ParagraphChild[], opts: Partial<ConstructorParameters<typeof Paragraph>[0] & object> = {}) {
  return new Paragraph({
    bidirectional: ctx.rtl,
    alignment: AlignmentType.START,
    spacing: { after: 0 },
    ...opts,
    children,
  });
}

/**
 * Short field. Word has no reliable whole-run isolation, so fields are split
 * relative to the paragraph direction like body text (each opposite-direction
 * token is pinned separately).
 */
function field(ctx: Ctx, text: string, opts: Omit<IRunOptions, "text"> = {}): TextRun[] {
  return runs(ctx, text, opts);
}

// ---------------------------------------------------------------------------

function inlineChildren(ctx: Ctx, nodes: RTInline[] | undefined): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const n of nodes ?? []) {
    if (n.type === "hardBreak") {
      out.push(new TextRun({ break: 1 }));
      continue;
    }
    const bold = n.marks?.some((m) => m.type === "bold");
    const italics = n.marks?.some((m) => m.type === "italic");
    const href = n.marks?.find((m) => m.type === "link");
    const textRuns = runs(ctx, n.text, { bold, italics });
    if (href && href.type === "link") out.push(new ExternalHyperlink({ link: href.attrs.href, children: textRuns }));
    else out.push(...textRuns);
  }
  return out;
}

function richText(ctx: Ctx, rt: RichText): Paragraph[] {
  const out: Paragraph[] = [];
  for (const block of rt.content) {
    if (block.type === "paragraph") {
      out.push(para(ctx, inlineChildren(ctx, block.content)));
      continue;
    }
    const ordered = block.type === "orderedList";
    const instance = ctx.listInstance++;
    for (const li of block.content) {
      li.content.forEach((p, i) => {
        out.push(
          para(ctx, inlineChildren(ctx, p.content), {
            numbering: i === 0 ? { reference: ordered ? NUMBERS : BULLETS, level: 0, instance } : undefined,
            indent: i === 0 ? undefined : { start: 360 },
            spacing: { after: 0 },
          }),
        );
      });
    }
  }
  return out;
}

function heading(ctx: Ctx, section: Section): Paragraph {
  return para(ctx, runs(ctx, sectionTitle(section, ctx.lang), { bold: true, color: ctx.accent.slice(1), size: Math.round(ctx.size * 1.2), font: ctx.headingFont }), {
    keepNext: true,
    spacing: { before: ctx.gap, after: 50 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ctx.accent.slice(1), space: 2 } },
  });
}

function entryParagraphs(ctx: Ctx, e: Entry): Paragraph[] {
  const out: Paragraph[] = [];
  const head: ParagraphChild[] = [...field(ctx, e.title, { bold: true })];
  if (e.subtitle) head.push(...runs(ctx, e.title ? ", " : ""), ...field(ctx, e.subtitle));
  if (e.location) head.push(...runs(ctx, " · ", { color: "6B7280" }), ...field(ctx, e.location, { color: "6B7280" }));
  if (e.date) {
    head.push(new TextRun({ text: "\t" }));
    head.push(...(e.numericDate ? [ltrRun(ctx, e.date.text, { color: "4B5563" })] : runs(ctx, e.date.text, { color: "4B5563" })));
  }
  out.push(
    para(ctx, head, {
      keepNext: true,
      spacing: { before: Math.round(ctx.gap * 0.45), after: 0 },
      tabStops: [{ type: TabStopType.END, position: ctx.contentWidth }],
    }),
  );
  if (e.meta.length) {
    const children: ParagraphChild[] = [];
    e.meta.forEach((m, i) => {
      if (i > 0) children.push(...runs(ctx, "   "));
      if (m.label) children.push(...runs(ctx, `${m.label}: `, { color: "6B7280" }));
      children.push(...(m.kind === "link" ? [link(ctx, m.value)] : field(ctx, m.value)));
    });
    out.push(para(ctx, children, { keepNext: !!e.description }));
  }
  if (e.description) out.push(...richText(ctx, e.description));
  return out;
}

function skillsParagraphs(ctx: Ctx, section: SectionOf<"skills">): Paragraph[] {
  return section.items.map((item) => {
    const children: ParagraphChild[] = [];
    if (item.name.trim()) children.push(...field(ctx, item.name, { bold: true }), ...runs(ctx, ": ", { bold: true }));
    item.skills
      .filter((s) => s.name.trim())
      .forEach((s, i) => {
        if (i > 0) children.push(...runs(ctx, " · "));
        children.push(...field(ctx, s.name));
        if (section.levelDisplay !== "none" && (s.levelText || s.level > 0)) {
          children.push(...runs(ctx, ` (${s.levelText || levelLabel(s.level, ctx.lang)})`, { color: "6B7280" }));
        }
      });
    return para(ctx, children, { spacing: { after: 30 } });
  });
}

function languagesParagraph(ctx: Ctx, section: SectionOf<"languages">): Paragraph {
  const children: ParagraphChild[] = [];
  section.items.forEach((item, i) => {
    if (i > 0) children.push(...runs(ctx, "   ·   "));
    children.push(...field(ctx, item.language, { bold: true }));
    const fluency = item.fluency || (item.level ? levelLabel(item.level, ctx.lang) : "");
    if (section.levelDisplay !== "none" && fluency) children.push(...runs(ctx, " – "), ...field(ctx, fluency));
  });
  return para(ctx, children);
}

function sectionParagraphs(ctx: Ctx, section: Section): Paragraph[] {
  const out = [heading(ctx, section)];
  switch (section.type) {
    case "summary":
      out.push(...richText(ctx, section.content));
      break;
    case "skills":
      out.push(...skillsParagraphs(ctx, section));
      break;
    case "languages":
      out.push(languagesParagraph(ctx, section));
      break;
    default:
      for (const item of section.items as SectionItem[]) out.push(...entryParagraphs(ctx, toEntry(section, item, ctx.lang, ctx.doc.theme)));
  }
  return out;
}

function headerParagraphs(ctx: Ctx): Paragraph[] {
  const b = ctx.doc.basics;
  const out: Paragraph[] = [];
  if (b.name.trim()) {
    out.push(para(ctx, field(ctx, b.name, { bold: true, size: Math.round(ctx.size * 2.1), color: ctx.accent.slice(1), font: ctx.headingFont }), { spacing: { after: 0 } }));
  }
  if (b.headline.trim()) out.push(para(ctx, field(ctx, b.headline, { size: Math.round(ctx.size * 1.15), color: "374151" })));
  const contacts: ParagraphChild[][] = [];
  if (b.phone.trim()) contacts.push([link(ctx, formatIsraeliPhone(b.phone))]);
  if (b.email.trim()) contacts.push([link(ctx, b.email.trim())]);
  if (b.city.trim()) contacts.push(field(ctx, b.city));
  for (const l of b.links) if (l.url.trim()) contacts.push([link(ctx, l.url.trim())]);
  for (const x of b.extras) {
    if (!x.visible || !x.value.trim()) continue;
    const label = extraLabel(x.kind, x.label, ctx.lang);
    contacts.push([...runs(ctx, label ? `${label}: ` : "", { color: "6B7280" }), ...field(ctx, x.value)]);
  }
  if (contacts.length) {
    const children: ParagraphChild[] = [];
    contacts.forEach((c, i) => {
      if (i > 0) children.push(...runs(ctx, "  |  ", { color: "9CA3AF" }));
      children.push(...c);
    });
    out.push(
      para(ctx, children, {
        spacing: { before: 60, after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ctx.accent.slice(1), space: 6 } },
      }),
    );
  }
  return out;
}

export function buildDocx(doc: CvDocument): Document {
  const page = PAGE[doc.theme.pageSize];
  const margin = convertMillimetersToTwip(doc.theme.pageMargins);
  const ctx: Ctx = {
    doc,
    lang: doc.language,
    rtl: doc.language === "he",
    accent: doc.theme.accentColor,
    bodyFont: officeFont(doc.theme.fontBody),
    headingFont: officeFont(doc.theme.fontHeading),
    size: Math.round(doc.theme.baseFontSize * 2),
    gap: Math.round(ptToTwip(mmToPt(doc.theme.sectionSpacing)) * 0.75),
    contentWidth: convertMillimetersToTwip(page.w) - 2 * margin,
    listInstance: 0,
  };
  const children = [...headerParagraphs(ctx), ...renderableSections(doc).flatMap((s) => sectionParagraphs(ctx, s))];
  const bulletIndent = { start: 360, hanging: 260 };
  return new Document({
    creator: doc.basics.name || "CV Builder",
    title: doc.title,
    description: doc.basics.headline,
    styles: {
      default: {
        document: {
          run: { font: { ascii: ctx.bodyFont, hAnsi: ctx.bodyFont, cs: ctx.bodyFont }, size: ctx.size, color: "1F2937" },
          paragraph: { spacing: { line: wordLineSpacing(doc.theme.lineHeight) } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: bulletIndent }, run: { color: ctx.accent.slice(1) } },
            },
          ],
        },
        {
          reference: NUMBERS,
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: bulletIndent } } },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(page.w), height: convertMillimetersToTwip(page.h) },
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
          ...(ctx.rtl ? { bidi: true } : {}),
        },
        children,
      },
    ],
  });
}

export async function docxToBlob(doc: CvDocument): Promise<Blob> {
  return Packer.toBlob(buildDocx(doc));
}

export async function docxToBuffer(doc: CvDocument): Promise<Buffer> {
  return Packer.toBuffer(buildDocx(doc));
}
