/**
 * Template metadata (no React). Components are registered separately in
 * `src/templates/registry.tsx` as they are implemented (phase 2+).
 */
export type TemplateMeta = {
  id: string;
  name: { he: string; en: string };
  description: { he: string; en: string };
  columns: 1 | 2;
  atsFriendly: boolean;
  supportsPhoto: boolean;
  tags: string[];
  /** Default accent color for this template. */
  defaultAccent: string;
  /** Curated accent presets. */
  accentPresets: string[];
  /**
   * Word export spacing factor (line spacing and gaps), when the column
   * count alone does not predict it: layouts that keep headings beside the
   * content or put a lot into a side column need a tighter Word file to
   * stay within the same number of pages.
   */
  wordDensity?: number;
};

const PRESETS_COOL = ["#1f4e79", "#2b6cb0", "#0f766e", "#334155", "#4c1d95", "#7c2d12", "#166534", "#9f1239"];
const PRESETS_WARM = ["#b45309", "#9a3412", "#be123c", "#1e3a8a", "#065f46", "#3f3f46", "#6d28d9", "#0e7490"];

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: { he: "קלאסי", en: "Classic" },
    description: { he: "עמודה אחת, כותרות סריף וקווים דקים", en: "Single column, serif headings, thin dividers" },
    columns: 1,
    atsFriendly: true,
    supportsPhoto: false,
    tags: ["ats", "formal"],
    defaultAccent: "#1f4e79",
    accentPresets: PRESETS_COOL,
  },
  {
    id: "modern-sidebar",
    name: { he: "מודרני עם סרגל צד", en: "Modern Sidebar" },
    description: { he: "עמודת צד צבעונית לפרטי קשר וכישורים", en: "Colored side column for contact and skills" },
    columns: 2,
    atsFriendly: false,
    supportsPhoto: true,
    tags: ["modern", "photo"],
    defaultAccent: "#0f766e",
    accentPresets: PRESETS_COOL,
  },
  {
    id: "minimal",
    name: { he: "מינימליסטי", en: "Minimal" },
    description: { he: "הרבה אוויר, כותרות קטנות וקו הדגשה אחד", en: "Generous whitespace, small caps, one accent line" },
    columns: 1,
    atsFriendly: true,
    supportsPhoto: false,
    tags: ["minimal"],
    defaultAccent: "#334155",
    accentPresets: PRESETS_COOL,
    wordDensity: 0.85,
  },
  {
    id: "professional-header",
    name: { he: "כותרת מקצועית", en: "Professional Header" },
    description: { he: "פס כותרת צבעוני ברוחב מלא", en: "Full-width colored header band" },
    columns: 1,
    atsFriendly: true,
    supportsPhoto: true,
    tags: ["ats", "formal"],
    defaultAccent: "#1e3a8a",
    accentPresets: PRESETS_COOL,
  },
  {
    id: "compact",
    name: { he: "קומפקטי", en: "Compact" },
    description: { he: "שתי עמודות צפופות – עמוד אחד לסטודנטים", en: "Tight two columns – one page for juniors" },
    columns: 2,
    atsFriendly: false,
    supportsPhoto: false,
    tags: ["student", "one-page"],
    defaultAccent: "#2b6cb0",
    accentPresets: PRESETS_COOL,
    wordDensity: 0.8,
  },
  {
    id: "timeline",
    name: { he: "ציר זמן", en: "Timeline" },
    description: { he: "ניסיון והשכלה על ציר זמן אנכי", en: "Experience and education on a vertical timeline" },
    columns: 1,
    atsFriendly: false,
    supportsPhoto: true,
    tags: ["modern"],
    defaultAccent: "#6d28d9",
    accentPresets: PRESETS_WARM,
  },
  {
    id: "engineer",
    name: { he: "מהנדס", en: "Engineer" },
    description: { he: "רשת כלים וכישורים ודגש על פרויקטים", en: "Skills/tools grid and projects emphasis" },
    columns: 2,
    atsFriendly: false,
    supportsPhoto: false,
    tags: ["technical"],
    defaultAccent: "#0e7490",
    accentPresets: PRESETS_COOL,
    wordDensity: 0.76,
  },
  {
    id: "elegant",
    name: { he: "אלגנטי", en: "Elegant" },
    description: { he: "טיפוגרפיית סריף וכותרת ממורכזת", en: "Serif typography, centered header" },
    columns: 1,
    atsFriendly: false,
    supportsPhoto: true,
    tags: ["formal", "serif"],
    defaultAccent: "#7c2d12",
    accentPresets: PRESETS_WARM,
  },
  {
    id: "bold",
    name: { he: "נועז", en: "Bold" },
    description: { he: "שם גדול ובלוקים צבעוניים", en: "Large name, strong accent blocks" },
    columns: 2,
    atsFriendly: false,
    supportsPhoto: true,
    tags: ["creative"],
    defaultAccent: "#be123c",
    accentPresets: PRESETS_WARM,
  },
  {
    id: "student",
    name: { he: "סטודנט / אקדמי", en: "Student / Academic" },
    description: { he: "השכלה תחילה, קורסים ופרויקטים בולטים", en: "Education first, courses and projects highlighted" },
    columns: 1,
    atsFriendly: true,
    supportsPhoto: false,
    tags: ["ats", "student"],
    defaultAccent: "#166534",
    accentPresets: PRESETS_COOL,
  },
];

export const TEMPLATE_MAP: Record<string, TemplateMeta> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATE_MAP[id] ?? TEMPLATES[0];
}
