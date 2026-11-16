import { TEMPLATE_MAP } from "../meta";
import { sectionBlocks, splitSections } from "../primitives/build";
import { Contacts, NameBlock } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame classic-frame">
      {header && <header className="classic-header">{header}</header>}
      <div className="cv-region" data-region="main">
        {main}
      </div>
    </div>
  );
}

export const classic: TemplateDefinition = {
  meta: TEMPLATE_MAP.classic,
  className: "tpl-classic",
  themeDefaults: { fontHeading: "frank-ruhl-libre", headingStyle: "line" },
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <>
          <NameBlock ctx={ctx} />
          <Contacts ctx={ctx} />
        </>
      ),
      main: main.flatMap((s) => sectionBlocks(ctx, s, { subtitleInline: true })),
      side: [],
    };
  },
  Frame,
};
