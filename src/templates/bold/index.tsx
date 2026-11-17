import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock, Photo } from "../primitives/parts";
import { TwoColumnFrame } from "../primitives/two-column";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame(props: FrameProps) {
  return <TwoColumnFrame {...props} prefix="bd" sideFirst />;
}

/** Bold: a large name on a solid accent band, solid heading bars and a tinted side column. */
export const bold: TemplateDefinition = {
  meta: TEMPLATE_MAP.bold,
  className: "tpl-bold",
  themeDefaults: { fontHeading: "rubik", headingStyle: "filled" },
  sideTypes: ["skills", "languages", "courses", "awards", "references"],
  build(ctx) {
    const { main, side } = splitSections(ctx, this.sideTypes);
    return {
      header: (
        <div className="bd-band-inner">
          <div className="bd-band-text">
            <NameBlock ctx={ctx} />
            <Contacts ctx={ctx} />
          </div>
          <Photo ctx={ctx} />
        </div>
      ),
      main: blocksFor(ctx, main, { subtitleInline: false }),
      side: blocksFor(ctx, side, { subtitleInline: false, skills: "list" }),
    };
  },
  Frame,
};
