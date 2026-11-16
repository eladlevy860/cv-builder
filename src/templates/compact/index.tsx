import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock } from "../primitives/parts";
import { TwoColumnFrame } from "../primitives/two-column";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame(props: FrameProps) {
  return <TwoColumnFrame {...props} prefix="cp" />;
}

/** Compact: small type, tight spacing and two columns, to keep a junior CV on one page. */
export const compact: TemplateDefinition = {
  meta: TEMPLATE_MAP.compact,
  className: "tpl-compact",
  themeDefaults: { baseFontSize: 9, lineHeight: 1.3, sectionSpacing: 3.5, pageMargins: 10, headingStyle: "caps" },
  sideTypes: ["skills", "languages", "courses", "awards", "references"],
  build(ctx) {
    const { main, side } = splitSections(ctx, this.sideTypes);
    return {
      header: (
        <>
          <NameBlock ctx={ctx} />
          <Contacts ctx={ctx} />
        </>
      ),
      main: blocksFor(ctx, main, { subtitleInline: true }),
      side: blocksFor(ctx, side, { subtitleInline: false, skills: "inline" }),
    };
  },
  Frame,
};
