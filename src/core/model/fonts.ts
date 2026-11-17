/**
 * Self-hosted fonts that support both Hebrew and Latin.
 * The CSS for each is imported once in `src/app/fonts.ts` from @fontsource,
 * so the app, the preview and the Chromium PDF all use the same files.
 */
export const FONT_IDS = [
  "heebo",
  "rubik",
  "assistant",
  "noto-sans-hebrew",
  "ibm-plex-sans-hebrew",
  "frank-ruhl-libre",
  "david-libre",
  "secular-one",
] as const;

export type FontId = (typeof FONT_IDS)[number];

export type FontInfo = {
  id: FontId;
  family: string;
  /** CSS font-family stack with fallbacks. */
  stack: string;
  label: { he: string; en: string };
  category: "sans" | "serif" | "display";
  /** Display fonts are offered for headings only. */
  headingOnly?: boolean;
  weights: number[];
};

const SANS_FALLBACK = '"Arial Hebrew", Arial, sans-serif';
const SERIF_FALLBACK = '"Times New Roman", serif';

export const FONTS: Record<FontId, FontInfo> = {
  heebo: {
    id: "heebo",
    family: "Heebo",
    stack: `"Heebo", ${SANS_FALLBACK}`,
    label: { he: "Heebo (היבו)", en: "Heebo" },
    category: "sans",
    weights: [300, 400, 500, 700],
  },
  rubik: {
    id: "rubik",
    family: "Rubik",
    stack: `"Rubik", ${SANS_FALLBACK}`,
    label: { he: "Rubik (רוביק)", en: "Rubik" },
    category: "sans",
    weights: [400, 500, 700],
  },
  assistant: {
    id: "assistant",
    family: "Assistant",
    stack: `"Assistant", ${SANS_FALLBACK}`,
    label: { he: "Assistant (אסיסטנט)", en: "Assistant" },
    category: "sans",
    weights: [400, 600, 700],
  },
  "noto-sans-hebrew": {
    id: "noto-sans-hebrew",
    family: "Noto Sans Hebrew",
    stack: `"Noto Sans Hebrew", ${SANS_FALLBACK}`,
    label: { he: "Noto Sans Hebrew (נוטו)", en: "Noto Sans Hebrew" },
    category: "sans",
    weights: [400, 600, 700],
  },
  "ibm-plex-sans-hebrew": {
    id: "ibm-plex-sans-hebrew",
    family: "IBM Plex Sans Hebrew",
    stack: `"IBM Plex Sans Hebrew", ${SANS_FALLBACK}`,
    label: { he: "IBM Plex Sans Hebrew (פלקס)", en: "IBM Plex Sans Hebrew" },
    category: "sans",
    weights: [400, 500, 700],
  },
  "frank-ruhl-libre": {
    id: "frank-ruhl-libre",
    family: "Frank Ruhl Libre",
    stack: `"Frank Ruhl Libre", ${SERIF_FALLBACK}`,
    label: { he: "פרנק ריהל (סריף)", en: "Frank Ruhl Libre (serif)" },
    category: "serif",
    weights: [400, 500, 700],
  },
  "david-libre": {
    id: "david-libre",
    family: "David Libre",
    stack: `"David Libre", ${SERIF_FALLBACK}`,
    label: { he: "דוד (סריף)", en: "David Libre (serif)" },
    category: "serif",
    weights: [400, 500, 700],
  },
  "secular-one": {
    id: "secular-one",
    family: "Secular One",
    stack: `"Secular One", ${SANS_FALLBACK}`,
    label: { he: "סקולר (כותרות בלבד)", en: "Secular One (headings only)" },
    category: "display",
    headingOnly: true,
    weights: [400],
  },
};

export const BODY_FONTS = FONT_IDS.filter((id) => !FONTS[id].headingOnly);
export const HEADING_FONTS = FONT_IDS;
