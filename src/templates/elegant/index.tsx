import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock, Photo } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame el-frame">
      {header && <header className="el-header">{header}</header>}
      <div className="cv-region" data-region="main">
        {main}
      </div>
    </div>
  );
}

export const elegant: TemplateDefinition = {
  meta: TEMPLATE_MAP.elegant,
  className: "tpl-elegant",
  themeDefaults: {
    fontHeading: "frank-ruhl-libre",
    fontBody: "frank-ruhl-libre",
    headingStyle: "line",
    lineHeight: 1.45,
    pageMargins: 17,
  },
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <>
          <Photo ctx={ctx} className="el-photo" />
          <NameBlock ctx={ctx} />
          <Contacts ctx={ctx} />
        </>
      ),
      main: blocksFor(ctx, main, { subtitleInline: true }),
      side: [],
    };
  },
  Frame,
};
