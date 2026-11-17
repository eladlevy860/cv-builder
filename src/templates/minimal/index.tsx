import { TEMPLATE_MAP } from "../meta";
import { attachHeadings, blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock } from "../primitives/parts";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame({ header, main }: FrameProps) {
  return (
    <div className="cv-frame min-frame">
      {header && <header className="min-header">{header}</header>}
      <div className="cv-region" data-region="main">
        {main}
      </div>
    </div>
  );
}

/**
 * Minimal: lots of white space and a label column. Each section heading
 * sits in a narrow column at the inline start (right in Hebrew), on one
 * row with the section's first item.
 */
export const minimal: TemplateDefinition = {
  meta: TEMPLATE_MAP.minimal,
  className: "tpl-minimal",
  themeDefaults: { headingStyle: "caps", sectionSpacing: 6, pageMargins: 18, lineHeight: 1.45 },
  build(ctx) {
    const { main } = splitSections(ctx, undefined);
    return {
      header: (
        <>
          <NameBlock ctx={ctx} />
          <span className="min-rule" aria-hidden />
          <Contacts ctx={ctx} />
        </>
      ),
      main: attachHeadings(blocksFor(ctx, main, { subtitleInline: true }), (heading, first) => (
        <div className="min-row">
          <div className="min-label">{heading}</div>
          <div className="min-content">{first}</div>
        </div>
      )),
      side: [],
    };
  },
  Frame,
};
