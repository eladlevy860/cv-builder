"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getTemplateMeta } from "./meta";
import { getTemplate } from "./registry";
import { themeStyle } from "./theme-vars";
import type { Block, RenderContext, TemplateDefinition } from "./types";
import type { CvDocument } from "@/core/model/schema";

export type PagePlan = { main: string[][]; side: string[][] };

/** Small tolerance for sub-pixel rounding. */
const EPS = 0.5;

/**
 * Packs blocks into pages. Headings (`keepWithNext`) move to the next page
 * when their first item would not fit after them. A block taller than a
 * whole page is placed on its own page (and clipped) rather than looping.
 */
export function packBlocks(
  blocks: Array<Pick<Block, "key" | "keepWithNext">>,
  heights: Map<string, number>,
  capFirst: number,
  capRest: number,
): string[][] {
  const pages: string[][] = [[]];
  let remaining = capFirst;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const h = heights.get(b.key) ?? 0;
    let need = h;
    if (b.keepWithNext && i + 1 < blocks.length) need += heights.get(blocks[i + 1].key) ?? 0;
    const page = pages[pages.length - 1];
    if (need > remaining + EPS && page.length > 0) {
      pages.push([]);
      remaining = capRest;
    }
    pages[pages.length - 1].push(b.key);
    remaining -= h;
  }
  return pages;
}

function samePlan(a: PagePlan | null, b: PagePlan): boolean {
  return !!a && JSON.stringify(a) === JSON.stringify(b);
}

function BlockWrap({ block }: { block: Block }) {
  return (
    <div className="cv-block" data-block-key={block.key} data-section-id={block.sectionId} data-item-id={block.itemId}>
      {block.node}
    </div>
  );
}

function PageShell({
  ctx,
  template,
  children,
  measure,
  pageIndex,
}: {
  ctx: RenderContext;
  template: TemplateDefinition;
  children: ReactNode;
  measure?: string;
  pageIndex?: number;
}) {
  return (
    <div
      className={`cv-page ${template.className} cv-hs-${ctx.theme.headingStyle} ${ctx.theme.showIcons ? "" : "cv-no-icons"}`}
      dir={ctx.dir}
      lang={ctx.lang}
      style={themeStyle(ctx.theme)}
      data-measure={measure}
      data-page={pageIndex}
    >
      {children}
    </div>
  );
}

function useFontsVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let alive = true;
    const bump = () => alive && setV((x) => x + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => {
      alive = false;
      document.fonts.removeEventListener("loadingdone", bump);
    };
  }, []);
  return v;
}

export function makeContext(doc: CvDocument): RenderContext {
  return {
    doc,
    theme: doc.theme,
    lang: doc.language,
    dir: doc.language === "he" ? "rtl" : "ltr",
    meta: getTemplateMeta(doc.templateId),
  };
}

/**
 * Renders a CV as real, fixed-size pages. The same component is used by the
 * editor preview, the print view and the Chromium PDF renderer, so they
 * always agree on page breaks.
 */
export function PagedDocument({
  doc,
  onPageCount,
  onReady,
  pageGap,
  renderPage,
}: {
  doc: CvDocument;
  onPageCount?: (n: number) => void;
  /** Called after the first pagination with loaded fonts. */
  onReady?: () => void;
  pageGap?: string;
  /** Optional wrapper around each page (e.g. page labels in the preview). */
  renderPage?: (page: ReactNode, index: number, count: number) => ReactNode;
}) {
  const template = getTemplate(doc.templateId);
  const ctx = useMemo(() => makeContext(doc), [doc]);
  const layout = useMemo(() => template.build(ctx), [template, ctx]);
  const fontsVersion = useFontsVersion();
  const measureRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<PagePlan | null>(null);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const capacity = (variant: string, region: string) =>
      root.querySelector<HTMLElement>(`[data-measure="${variant}"] [data-region="${region}"]`)?.getBoundingClientRect().height ?? 0;
    const heights = new Map<string, number>();
    root.querySelectorAll<HTMLElement>('[data-measure="blocks"] [data-block-key]').forEach((el) => {
      heights.set(el.dataset.blockKey!, el.getBoundingClientRect().height);
    });
    const next: PagePlan = {
      main: packBlocks(layout.main, heights, capacity("first", "main"), capacity("rest", "main")),
      side: layout.side.length ? packBlocks(layout.side, heights, capacity("first", "side"), capacity("rest", "side")) : [],
    };
    setPlan((prev) => (samePlan(prev, next) ? prev : next));
  }, [layout, fontsVersion]);

  const pageCount = Math.max(plan?.main.length ?? 1, plan?.side.length ?? 0, 1);

  useEffect(() => {
    onPageCount?.(pageCount);
  }, [pageCount, onPageCount]);

  useEffect(() => {
    if (plan && fontsVersion > 0) onReady?.();
  }, [plan, fontsVersion, onReady]);

  // Map planned keys back to blocks. Blocks that are new since the last
  // measurement go on the last page until the layout effect re-packs
  // (which happens before paint).
  const pagesFor = (blocks: Block[], planned: string[][] | undefined): Block[][] => {
    const byKey = new Map(blocks.map((b) => [b.key, b]));
    const pages: Block[][] = (planned ?? [blocks.map((b) => b.key)]).map((keys) =>
      keys.map((k) => byKey.get(k)).filter((b): b is Block => !!b),
    );
    const placed = new Set(pages.flat().map((b) => b.key));
    const extra = blocks.filter((b) => !placed.has(b.key));
    if (extra.length) pages[pages.length - 1] = [...(pages[pages.length - 1] ?? []), ...extra];
    return pages;
  };
  const mainPages = pagesFor(layout.main, plan?.main);
  const sidePages = layout.side.length ? pagesFor(layout.side, plan?.side) : [];
  const count = Math.max(mainPages.length, sidePages.length, 1);
  const { Frame } = template;

  return (
    <>
      <div ref={measureRef} className="cv-measure" aria-hidden inert>
        <PageShell ctx={ctx} template={template} measure="first">
          <Frame ctx={ctx} pageIndex={0} header={layout.header} main={null} side={null} />
        </PageShell>
        <PageShell ctx={ctx} template={template} measure="rest">
          <Frame ctx={ctx} pageIndex={1} header={null} main={null} side={null} />
        </PageShell>
        <PageShell ctx={ctx} template={template} measure="blocks">
          <Frame
            ctx={ctx}
            pageIndex={0}
            header={layout.header}
            main={layout.main.map((b) => (
              <BlockWrap key={b.key} block={b} />
            ))}
            side={layout.side.map((b) => (
              <BlockWrap key={b.key} block={b} />
            ))}
          />
        </PageShell>
      </div>
      <div className="cv-pages" style={pageGap ? { gap: pageGap } : undefined}>
        {Array.from({ length: count }, (_, i) => {
          const page = (
            <PageShell key={i} ctx={ctx} template={template} pageIndex={i}>
              <Frame
                ctx={ctx}
                pageIndex={i}
                header={i === 0 ? layout.header : null}
                main={(mainPages[i] ?? []).map((b) => (
                  <BlockWrap key={b.key} block={b} />
                ))}
                side={(sidePages[i] ?? []).map((b) => (
                  <BlockWrap key={b.key} block={b} />
                ))}
              />
            </PageShell>
          );
          return <Fragment key={i}>{renderPage ? renderPage(page, i, count) : page}</Fragment>;
        })}
      </div>
    </>
  );
}
