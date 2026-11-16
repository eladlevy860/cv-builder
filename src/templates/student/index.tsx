import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame st-frame">
      {header && <header className="st-header">{header}</header>}
      <div className="cv-region" data-region="main">
        {main}
      </div>
    </div>
  );
}

/**
 * Student / Academic: education first (moved up when the template is
 * applied), courses as a two-column list, projects highlighted.
 */
export const student: TemplateDefinition = {
  meta: TEMPLATE_MAP.student,
  className: "tpl-student",
  themeDefaults: { headingStyle: "line" },
  promoteTypes: ["education"],
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <>
          <NameBlock ctx={ctx} />
          <Contacts ctx={ctx} />
        </>
      ),
      main: blocksFor(ctx, main, (s) => (s.type === "courses" ? { subtitleInline: false, perRow: 2 } : { subtitleInline: true })),
      side: [],
    };
  },
  Frame,
};
