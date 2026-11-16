import type { SectionType } from "@/core/model/schema";
import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock, Photo } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

/** Sections drawn on the timeline; the rest render as usual. */
export const TIMELINE_TYPES: SectionType[] = ["experience", "education", "military", "volunteering"];

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame tl-frame">
      {header && <header className="tl-header">{header}</header>}
      <div className="cv-region" data-region="main">
        {main}
      </div>
    </div>
  );
}

export const timeline: TemplateDefinition = {
  meta: TEMPLATE_MAP.timeline,
  className: "tpl-timeline",
  themeDefaults: { headingStyle: "plain", sectionSpacing: 4 },
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <div className="tl-header-inner">
          <div className="tl-header-text">
            <NameBlock ctx={ctx} />
            <Contacts ctx={ctx} />
          </div>
          <Photo ctx={ctx} />
        </div>
      ),
      main: blocksFor(ctx, main, (s) =>
        TIMELINE_TYPES.includes(s.type) ? { subtitleInline: true, datePlacement: "above" } : { subtitleInline: true },
      ),
      side: [],
    };
  },
  Frame,
};
