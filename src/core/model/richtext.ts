import { z } from "zod";

/**
 * Restricted rich text, stored as ProseMirror/TipTap-compatible JSON.
 * Only bold, italic, links, paragraphs, hard breaks and bullet/ordered lists
 * are allowed. One AST feeds the preview, DOCX, plain-text/ATS view and
 * keyword matching.
 */
export type RTMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type RTText = { type: "text"; text: string; marks?: RTMark[] };
export type RTHardBreak = { type: "hardBreak" };
export type RTInline = RTText | RTHardBreak;
export type RTParagraph = { type: "paragraph"; content?: RTInline[] };
export type RTListItem = { type: "listItem"; content: RTParagraph[] };
export type RTList = {
  type: "bulletList" | "orderedList";
  content: RTListItem[];
};
export type RTBlock = RTParagraph | RTList;
export type RichText = { type: "doc"; content: RTBlock[] };

const markSchema: z.ZodType<RTMark> = z.union([
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({ href: z.string() }),
  }),
]);

const inlineSchema: z.ZodType<RTInline> = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
    marks: z.array(markSchema).optional(),
  }),
  z.object({ type: z.literal("hardBreak") }),
]);

const paragraphSchema: z.ZodType<RTParagraph> = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineSchema).optional(),
});

const listItemSchema: z.ZodType<RTListItem> = z.object({
  type: z.literal("listItem"),
  content: z.array(paragraphSchema),
});

const listSchema: z.ZodType<RTList> = z.object({
  type: z.enum(["bulletList", "orderedList"]),
  content: z.array(listItemSchema),
});

export const richTextSchema: z.ZodType<RichText> = z.object({
  type: z.literal("doc"),
  content: z.array(z.union([paragraphSchema, listSchema])),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function emptyRichText(): RichText {
  return { type: "doc", content: [] };
}

function paragraph(text: string): RTParagraph {
  return text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };
}

/** Plain text → paragraphs (one per line). */
export function richTextFromPlain(text: string): RichText {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return { type: "doc", content: lines.map(paragraph) };
}

/** A list of strings → a bullet list, optionally preceded by an intro paragraph. */
export function richTextFromBullets(bullets: string[], intro?: string): RichText {
  const content: RTBlock[] = [];
  if (intro) content.push(paragraph(intro));
  if (bullets.length > 0) {
    content.push({
      type: "bulletList",
      content: bullets.map((b) => ({ type: "listItem", content: [paragraph(b)] })),
    });
  }
  return { type: "doc", content };
}

function inlineToPlain(nodes: RTInline[] | undefined): string {
  if (!nodes) return "";
  return nodes.map((n) => (n.type === "text" ? n.text : "\n")).join("");
}

/** Rich text → plain text. Bullets become lines prefixed with "• " (or "1. "). */
export function richTextToPlain(doc: RichText, bullet = "• "): string {
  const lines: string[] = [];
  for (const block of doc.content) {
    if (block.type === "paragraph") {
      lines.push(inlineToPlain(block.content));
    } else {
      block.content.forEach((item, i) => {
        const prefix = block.type === "orderedList" ? `${i + 1}. ` : bullet;
        const text = item.content.map((p) => inlineToPlain(p.content)).join("\n");
        lines.push(prefix + text);
      });
    }
  }
  return lines.join("\n").trim();
}

export function isRichTextEmpty(doc: RichText | undefined | null): boolean {
  if (!doc) return true;
  return richTextToPlain(doc, "").trim().length === 0;
}

/** Number of list items (bullets) in the document. */
export function countBullets(doc: RichText): number {
  return doc.content.reduce(
    (n, b) => (b.type === "paragraph" ? n : n + b.content.length),
    0,
  );
}

/** Appends a bullet to the last bullet list (creating one if needed). Returns a new doc. */
export function appendBullet(doc: RichText, text: string): RichText {
  const content = [...doc.content];
  const last = content[content.length - 1];
  const item: RTListItem = { type: "listItem", content: [paragraph(text)] };
  if (last && last.type === "bulletList") {
    content[content.length - 1] = { ...last, content: [...last.content, item] };
  } else {
    content.push({ type: "bulletList", content: [item] });
  }
  return { type: "doc", content };
}

// ---------------------------------------------------------------------------
// Normalization of editor (TipTap) output
// ---------------------------------------------------------------------------

type AnyNode = { type?: string; text?: string; marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>; content?: AnyNode[] };

function normMarks(marks: AnyNode["marks"]): RTMark[] | undefined {
  if (!marks?.length) return undefined;
  const out: RTMark[] = [];
  for (const m of marks) {
    if (m.type === "bold") out.push({ type: "bold" });
    else if (m.type === "italic") out.push({ type: "italic" });
    else if (m.type === "link" && typeof m.attrs?.href === "string") out.push({ type: "link", attrs: { href: m.attrs.href } });
  }
  return out.length ? out : undefined;
}

function normInline(nodes: AnyNode[] | undefined): RTInline[] {
  const out: RTInline[] = [];
  for (const n of nodes ?? []) {
    if (n.type === "text" && typeof n.text === "string" && n.text.length > 0) {
      const marks = normMarks(n.marks);
      out.push(marks ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
    } else if (n.type === "hardBreak") {
      out.push({ type: "hardBreak" });
    } else if (n.content) {
      out.push(...normInline(n.content));
    }
  }
  return out;
}

function normParagraph(n: AnyNode): RTParagraph {
  const content = normInline(n.content);
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

/** Flattens a list item into paragraphs + (flattened) nested list items. */
function normListItems(items: AnyNode[] | undefined): RTListItem[] {
  const out: RTListItem[] = [];
  for (const item of items ?? []) {
    const paras: RTParagraph[] = [];
    const nested: RTListItem[] = [];
    for (const child of item.content ?? []) {
      if (child.type === "bulletList" || child.type === "orderedList") nested.push(...normListItems(child.content));
      else paras.push(normParagraph(child));
    }
    out.push({ type: "listItem", content: paras.length ? paras : [{ type: "paragraph" }] });
    out.push(...nested);
  }
  return out;
}

/**
 * Converts arbitrary ProseMirror JSON (e.g. TipTap output, pasted content)
 * into the restricted RichText schema: unknown nodes become paragraphs,
 * unknown marks and attributes are dropped, nested lists are flattened.
 */
export function normalizeRichText(input: unknown): RichText {
  const root = (input ?? {}) as AnyNode;
  const blocks: RTBlock[] = [];
  for (const n of root.content ?? []) {
    if (n.type === "bulletList" || n.type === "orderedList") {
      const items = normListItems(n.content);
      if (items.length) blocks.push({ type: n.type, content: items });
    } else {
      blocks.push(normParagraph(n));
    }
  }
  // Drop trailing empty paragraphs (editors keep one around).
  while (blocks.length && blocks[blocks.length - 1].type === "paragraph" && !(blocks[blocks.length - 1] as RTParagraph).content) {
    blocks.pop();
  }
  return { type: "doc", content: blocks };
}
