import type { ReactNode } from "react";
import type { Section, SectionItem, SectionType } from "@/core/model/schema";
import { renderableSections, toEntry } from "@/core/render/entries";
import type { Block, RenderContext } from "../types";
import { EntryView, LanguageView, SectionHeading, SkillGroupView } from "./parts";
import { RichTextView } from "./text";

export type SectionRenderOptions = {
  /** How skills render in this column. */
  skills?: "inline" | "list" | "chips";
  /** Subtitle (organization) on the title line or on its own line. */
  subtitleInline?: boolean;
  /** Where entry dates go (see EntryView). */
  datePlacement?: "end" | "above";
  /** Groups items into rows of N (one block per row) laid out as a grid. */
  perRow?: number;
  /** Custom item renderer (return undefined to fall back to the default). */
  renderItem?: (section: Section, item: SectionItem, ctx: RenderContext) => ReactNode | undefined;
};

/** Default item rendering shared by all templates. */
export function renderItem(ctx: RenderContext, section: Section, item: SectionItem, opts: SectionRenderOptions): ReactNode {
  const custom = opts.renderItem?.(section, item, ctx);
  if (custom !== undefined) return custom;
  switch (section.type) {
    case "skills":
      return <SkillGroupView ctx={ctx} section={section} item={item as never} variant={opts.skills ?? "inline"} />;
    case "languages":
      return <LanguageView ctx={ctx} section={section} item={item as never} />;
    default:
      return (
        <EntryView
          ctx={ctx}
          entry={toEntry(section, item, ctx.lang, ctx.theme)}
          subtitleInline={opts.subtitleInline ?? true}
          datePlacement={opts.datePlacement}
        />
      );
  }
}

/** Heading block + one block per item (summary: one block). */
export function sectionBlocks(ctx: RenderContext, section: Section, opts: SectionRenderOptions = {}): Block[] {
  const blocks: Block[] = [
    {
      key: `${section.id}:h`,
      sectionId: section.id,
      keepWithNext: true,
      node: <SectionHeading ctx={ctx} section={section} />,
    },
  ];
  if (section.type === "summary") {
    blocks.push({
      key: `${section.id}:content`,
      sectionId: section.id,
      node: <RichTextView value={section.content} ctx={ctx} className="cv-summary" />,
    });
    return blocks;
  }
  const items = section.items as SectionItem[];
  // Languages are short; group them into one block so they stay together.
  if (section.type === "languages") {
    blocks.push({
      key: `${section.id}:all`,
      sectionId: section.id,
      node: (
        <div className="cv-section-items cv-langs">
          {items.map((it) => (
            <div key={it.id} className="cv-item" data-item-id={it.id}>
              {renderItem(ctx, section, it, opts)}
            </div>
          ))}
        </div>
      ),
    });
    return blocks;
  }
  const perRow = opts.perRow ?? 1;
  if (perRow > 1) {
    for (let i = 0; i < items.length; i += perRow) {
      const row = items.slice(i, i + perRow);
      blocks.push({
        key: `${section.id}:row:${row[0].id}`,
        sectionId: section.id,
        node: (
          <div className="cv-item-row" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
            {row.map((it) => (
              <div key={it.id} className={`cv-item cv-item--${section.type}`} data-item-id={it.id}>
                {renderItem(ctx, section, it, opts)}
              </div>
            ))}
          </div>
        ),
      });
    }
    return blocks;
  }
  for (const it of items) {
    blocks.push({
      key: `${section.id}:${it.id}`,
      sectionId: section.id,
      itemId: it.id,
      node: (
        <div className={`cv-item cv-item--${section.type}`} data-item-id={it.id}>
          {renderItem(ctx, section, it, opts)}
        </div>
      ),
    });
  }
  return blocks;
}

/**
 * Splits renderable sections into main/side columns. Placement "auto"
 * follows the template's `sideTypes`; single-column templates put
 * everything in main.
 */
export function splitSections(ctx: RenderContext, sideTypes: SectionType[] | undefined): { main: Section[]; side: Section[] } {
  const all = renderableSections(ctx.doc);
  if (!sideTypes) return { main: all, side: [] };
  const main: Section[] = [];
  const side: Section[] = [];
  for (const s of all) {
    const toSide = s.placement === "side" || (s.placement === "auto" && sideTypes.includes(s.type));
    (toSide ? side : main).push(s);
  }
  return { main, side };
}

/** Per-section options: a function of the section, or the same options for all. */
export type SectionOptionsFor = SectionRenderOptions | ((section: Section) => SectionRenderOptions);

export function blocksFor(ctx: RenderContext, sections: Section[], opts: SectionOptionsFor = {}): Block[] {
  return sections.flatMap((s) => sectionBlocks(ctx, s, typeof opts === "function" ? opts(s) : opts));
}

/**
 * Merges each section heading with the section's first block, so the two
 * become one unbreakable row (used for label-column layouts). The merged
 * block keeps the first block's item id, so clicks still jump to the item.
 */
export function attachHeadings(blocks: Block[], render: (heading: ReactNode, first: ReactNode) => ReactNode): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (b.keepWithNext && next && next.sectionId === b.sectionId) {
      out.push({ ...next, key: `${b.key}+${next.key}`, node: render(b.node, next.node) });
      i++;
    } else {
      out.push(b);
    }
  }
  return out;
}
