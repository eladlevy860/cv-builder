import { TEMPLATE_MAP } from "../meta";
import { sectionBlocks, splitSections } from "../primitives/build";
import { Contacts, NameBlock, Photo } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame">
      {header && <header className="ph-band">{header}</header>}
      <div className={header ? "ph-body" : "ph-body ph-body--rest"}>
        <div className="cv-region" data-region="main">
          {main}
        </div>
      </div>
    </div>
  );
}

export const professionalHeader: TemplateDefinition = {
  meta: TEMPLATE_MAP["professional-header"],
  className: "tpl-professional-header",
  themeDefaults: { headingStyle: "line" },
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <div className="ph-band-inner">
          <div className="ph-band-text">
            <NameBlock ctx={ctx} />
            <Contacts ctx={ctx} />
          </div>
          <Photo ctx={ctx} />
        </div>
      ),
      main: main.flatMap((s) => sectionBlocks(ctx, s, { subtitleInline: true })),
      side: [],
    };
  },
  Frame,
};
