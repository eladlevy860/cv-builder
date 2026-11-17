import { TEMPLATE_MAP } from "../meta";
import { blocksFor, splitSections } from "../primitives/build";
import { Contacts, NameBlock } from "../primitives/parts";
import { TwoColumnFrame } from "../primitives/two-column";
import type { FrameProps, TemplateDefinition } from "../types";

function Frame(props: FrameProps) {
  return <TwoColumnFrame {...props} prefix="en" />;
}

/** Engineer: skills and tools as a chip grid in a side panel, projects as highlighted cards. */
export const engineer: TemplateDefinition = {
  meta: TEMPLATE_MAP.engineer,
  className: "tpl-engineer",
  themeDefaults: { fontBody: "ibm-plex-sans-hebrew", fontHeading: "ibm-plex-sans-hebrew", headingStyle: "caps" },
  sideTypes: ["skills", "languages", "courses", "awards", "references"],
  build(ctx) {
    const { main, side } = splitSections(ctx, this.sideTypes);
    return {
      header: (
        <>
          <div className="en-id">
            <NameBlock ctx={ctx} />
          </div>
          <Contacts ctx={ctx} layout="stack" />
        </>
      ),
      main: blocksFor(ctx, main, { subtitleInline: true }),
      side: blocksFor(ctx, side, { subtitleInline: false, skills: "chips" }),
    };
  },
  Frame,
};
