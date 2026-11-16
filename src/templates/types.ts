import type { ComponentType, ReactNode } from "react";
import type { CvDocument, Language, SectionType, Theme } from "@/core/model/schema";
import type { TemplateMeta } from "./meta";

export type Dir = "rtl" | "ltr";

export type RenderContext = {
  doc: CvDocument;
  theme: Theme;
  lang: Language;
  dir: Dir;
  meta: TemplateMeta;
};

/** An unbreakable unit of content placed by the paginator. */
export type Block = {
  key: string;
  node: ReactNode;
  /** Keep on the same page as the following block (section headings). */
  keepWithNext?: boolean;
  sectionId?: string;
  itemId?: string;
};

export type TemplateLayout = {
  /** Rendered on the first page only. */
  header: ReactNode;
  main: Block[];
  /** Second column (two-column templates only). */
  side: Block[];
};

export type FrameProps = {
  ctx: RenderContext;
  pageIndex: number;
  /** Header content on the first page, null otherwise. */
  header: ReactNode;
  /** Region elements: render each inside the frame. */
  main: ReactNode;
  side: ReactNode;
};

export type TemplateDefinition = {
  meta: TemplateMeta;
  /** CSS class on the page root, e.g. "tpl-classic". */
  className: string;
  /** Theme values applied when the user switches to this template (only where still at defaults). */
  themeDefaults?: Partial<Theme>;
  /** Section types placed in the side column when placement is "auto". */
  sideTypes?: SectionType[];
  build(ctx: RenderContext): TemplateLayout;
  /**
   * Page structure. Must render `main` inside an element with
   * `data-region="main"` (and `side` inside `data-region="side"` for
   * two-column templates). Region elements must fill the remaining page
   * height (flex: 1 1 0; min-height: 0) so the paginator can measure them.
   */
  Frame: ComponentType<FrameProps>;
};
