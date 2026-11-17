import { TEMPLATE_MAP } from "../meta";
import { sectionBlocks, splitSections } from "../primitives/build";
import { Contacts, NameBlock, Photo } from "../primitives/parts";
import type { Block, FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main, side }: FrameProps) {
  return (
    <div className="cv-frame ms-frame">
      <aside className="ms-side">
        <div className="cv-region" data-region="side">
          {side}
        </div>
      </aside>
      <div className="ms-main">
        {header && <header className="ms-header">{header}</header>}
        <div className="cv-region" data-region="main">
          {main}
        </div>
      </div>
    </div>
  );
}

export const modernSidebar: TemplateDefinition = {
  meta: TEMPLATE_MAP["modern-sidebar"],
  className: "tpl-modern-sidebar",
  themeDefaults: { headingStyle: "plain" },
  sideTypes: ["skills", "languages"],
  build(ctx) {
    const { main, side } = splitSections(ctx, this.sideTypes);
    const top: Block[] = [
      {
        key: "side:contact",
        node: (
          <div className="ms-contact">
            <Photo ctx={ctx} className="ms-photo" />
            <Contacts ctx={ctx} layout="stack" />
          </div>
        ),
      },
    ];
    return {
      header: <NameBlock ctx={ctx} />,
      main: main.flatMap((s) => sectionBlocks(ctx, s, { subtitleInline: false })),
      side: [...top, ...side.flatMap((s) => sectionBlocks(ctx, s, { skills: "list" }))],
    };
  },
  Frame,
};
