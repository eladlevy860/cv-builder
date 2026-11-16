import { z } from "zod";
import { FONT_IDS } from "./fonts";
import { richTextSchema } from "./richtext";

/**
 * Current document schema version. Bump it and add a migration in
 * `src/core/migrations` whenever the persisted shape changes.
 */
export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const languageSchema = z.enum(["he", "en"]);
export type Language = z.infer<typeof languageSchema>;

export const idSchema = z.string().min(1);
const text = z.string();

export const yearMonthSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  /** 1–12. Omitted when only the year is known. */
  month: z.number().int().min(1).max(12).optional(),
});
export type YearMonth = z.infer<typeof yearMonthSchema>;

export const dateRangeSchema = z.object({
  start: yearMonthSchema.nullable(),
  end: yearMonthSchema.nullable(),
  /** When true, `end` is ignored and rendered as "Present" / "היום". */
  present: z.boolean(),
});
export type DateRange = z.infer<typeof dateRangeSchema>;

// ---------------------------------------------------------------------------
// Basics (personal details)
// ---------------------------------------------------------------------------

export const linkSchema = z.object({
  id: idSchema,
  label: text,
  url: text,
});
export type Link = z.infer<typeof linkSchema>;

export const photoSchema = z.object({
  /** Data URL of the original image (kept local). */
  dataUrl: z.string(),
  crop: z.object({
    /** Offsets in percent of the image size, zoom ≥ 1. */
    x: z.number(),
    y: z.number(),
    zoom: z.number().min(1).max(5),
  }),
  shape: z.enum(["circle", "rounded", "square"]),
});
export type Photo = z.infer<typeof photoSchema>;

export const EXTRA_FIELD_KINDS = [
  "idNumber",
  "birthDate",
  "maritalStatus",
  "nationality",
  "drivingLicense",
  "custom",
] as const;

export const extraFieldSchema = z.object({
  id: idSchema,
  kind: z.enum(EXTRA_FIELD_KINDS),
  /** Only used for `custom`; other kinds get a localized label. */
  label: text,
  value: text,
  visible: z.boolean(),
});
export type ExtraField = z.infer<typeof extraFieldSchema>;

export const basicsSchema = z.object({
  name: text,
  headline: text,
  email: text,
  phone: text,
  city: text,
  links: z.array(linkSchema),
  photo: photoSchema.nullable(),
  /** Optional personal fields (ID, birth date…). All off by default. */
  extras: z.array(extraFieldSchema),
});
export type Basics = z.infer<typeof basicsSchema>;

// ---------------------------------------------------------------------------
// Section items
// ---------------------------------------------------------------------------

const itemBase = { id: idSchema, visible: z.boolean() };

export const experienceItemSchema = z.object({
  ...itemBase,
  role: text,
  /** May be a generic description, e.g. "Defense industry company". */
  organization: text,
  location: text,
  dates: dateRangeSchema,
  description: richTextSchema,
});

export const educationItemSchema = z.object({
  ...itemBase,
  degree: text,
  field: text,
  institution: text,
  location: text,
  dates: dateRangeSchema,
  grade: text,
  description: richTextSchema,
});

export const militaryItemSchema = z.object({
  ...itemBase,
  /** Unit or role description, e.g. "קצין הנדסה, חיל האוויר". */
  role: text,
  unit: text,
  rank: text,
  dates: dateRangeSchema,
  distinctions: text,
  description: richTextSchema,
});

export const projectItemSchema = z.object({
  ...itemBase,
  name: text,
  role: text,
  link: text,
  dates: dateRangeSchema,
  description: richTextSchema,
});

export const skillSchema = z.object({
  id: idSchema,
  name: text,
  /** 0 = unset, 1–5 otherwise. */
  level: z.number().int().min(0).max(5),
  levelText: text,
});
export type Skill = z.infer<typeof skillSchema>;

export const skillGroupItemSchema = z.object({
  ...itemBase,
  /** Group name, e.g. "CAD", "Analysis". Empty means ungrouped. */
  name: text,
  skills: z.array(skillSchema),
});

export const languageItemSchema = z.object({
  ...itemBase,
  language: text,
  /** Free text, e.g. "שפת אם", "Fluent". */
  fluency: text,
  level: z.number().int().min(0).max(5),
});

export const courseItemSchema = z.object({
  ...itemBase,
  name: text,
  issuer: text,
  date: yearMonthSchema.nullable(),
  link: text,
  description: richTextSchema,
});

export const awardItemSchema = z.object({
  ...itemBase,
  title: text,
  issuer: text,
  date: yearMonthSchema.nullable(),
  description: richTextSchema,
});

export const volunteeringItemSchema = z.object({
  ...itemBase,
  role: text,
  organization: text,
  location: text,
  dates: dateRangeSchema,
  description: richTextSchema,
});

export const referenceItemSchema = z.object({
  ...itemBase,
  name: text,
  role: text,
  organization: text,
  email: text,
  phone: text,
  note: text,
});

export const customItemSchema = z.object({
  ...itemBase,
  title: text,
  subtitle: text,
  location: text,
  link: text,
  dates: dateRangeSchema,
  description: richTextSchema,
});

export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type MilitaryItem = z.infer<typeof militaryItemSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type SkillGroupItem = z.infer<typeof skillGroupItemSchema>;
export type LanguageItem = z.infer<typeof languageItemSchema>;
export type CourseItem = z.infer<typeof courseItemSchema>;
export type AwardItem = z.infer<typeof awardItemSchema>;
export type VolunteeringItem = z.infer<typeof volunteeringItemSchema>;
export type ReferenceItem = z.infer<typeof referenceItemSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const SECTION_TYPES = [
  "summary",
  "experience",
  "education",
  "military",
  "projects",
  "skills",
  "languages",
  "courses",
  "awards",
  "volunteering",
  "references",
  "custom",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const levelDisplaySchema = z.enum(["none", "text", "dots"]);
export type LevelDisplay = z.infer<typeof levelDisplaySchema>;

const sectionBase = {
  id: idSchema,
  /** null = use the default title for the document language. */
  title: z.string().nullable(),
  visible: z.boolean(),
  /** Column hint for two-column templates. */
  placement: z.enum(["auto", "main", "side"]),
};

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...sectionBase, type: z.literal("summary"), content: richTextSchema }),
  z.object({ ...sectionBase, type: z.literal("experience"), items: z.array(experienceItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("education"), items: z.array(educationItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("military"), items: z.array(militaryItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("projects"), items: z.array(projectItemSchema) }),
  z.object({
    ...sectionBase,
    type: z.literal("skills"),
    levelDisplay: levelDisplaySchema,
    items: z.array(skillGroupItemSchema),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("languages"),
    levelDisplay: levelDisplaySchema,
    items: z.array(languageItemSchema),
  }),
  z.object({ ...sectionBase, type: z.literal("courses"), items: z.array(courseItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("awards"), items: z.array(awardItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("volunteering"), items: z.array(volunteeringItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("references"), items: z.array(referenceItemSchema) }),
  z.object({ ...sectionBase, type: z.literal("custom"), items: z.array(customItemSchema) }),
]);
export type Section = z.infer<typeof sectionSchema>;
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
export type ItemSection = Exclude<Section, { type: "summary" }>;
export type SectionItem = ItemSection["items"][number];

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export const fontIdSchema = z.enum(FONT_IDS);

export const DATE_FORMATS = ["MM/YYYY", "MMM YYYY", "MMMM YYYY", "YYYY"] as const;

export const themeSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontBody: fontIdSchema,
  fontHeading: fontIdSchema,
  /** Points. */
  baseFontSize: z.number().min(8).max(14),
  lineHeight: z.number().min(1).max(2),
  /** Millimetres between sections. */
  sectionSpacing: z.number().min(0).max(16),
  /** Millimetres on every side. */
  pageMargins: z.number().min(5).max(30),
  pageSize: z.enum(["A4", "Letter"]),
  headingStyle: z.enum(["line", "plain", "filled", "caps"]),
  showPhoto: z.boolean(),
  showIcons: z.boolean(),
  dateFormat: z.enum(DATE_FORMATS),
  /** Hebrew word for an ongoing period. */
  presentLabelHe: z.enum(["היום", "כיום"]),
});
export type Theme = z.infer<typeof themeSchema>;

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const documentBase = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  title: z.string(),
  language: languageSchema,
  templateId: z.string().min(1),
  theme: themeSchema,
  basics: basicsSchema,
  /** ISO timestamps. */
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const cvDocumentSchema = z.object({
  ...documentBase,
  type: z.literal("cv"),
  sections: z.array(sectionSchema),
});

export const coverLetterSchema = z.object({
  recipientName: text,
  recipientRole: text,
  company: text,
  companyAddress: text,
  /** ISO date (yyyy-mm-dd) or empty for "today at export time". */
  date: text,
  subject: text,
  opening: text,
  body: richTextSchema,
  closing: text,
  signature: text,
});
export type CoverLetter = z.infer<typeof coverLetterSchema>;

export const coverLetterDocumentSchema = z.object({
  ...documentBase,
  type: z.literal("coverLetter"),
  /** The CV whose header and theme the letter inherits (optional). */
  linkedCvId: z.string().nullable(),
  letter: coverLetterSchema,
});

export const documentSchema = z.discriminatedUnion("type", [
  cvDocumentSchema,
  coverLetterDocumentSchema,
]);

export type CvDocument = z.infer<typeof cvDocumentSchema>;
export type CoverLetterDocument = z.infer<typeof coverLetterDocumentSchema>;
export type AnyDocument = z.infer<typeof documentSchema>;
export type DocumentType = AnyDocument["type"];

// ---------------------------------------------------------------------------
// Snapshots, job applications, settings
// ---------------------------------------------------------------------------

export const snapshotSchema = z.object({
  id: idSchema,
  docId: idSchema,
  /** null for automatic snapshots. */
  name: z.string().nullable(),
  auto: z.boolean(),
  createdAt: z.string(),
  data: documentSchema,
});
export type Snapshot = z.infer<typeof snapshotSchema>;

export const APPLICATION_STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const applicationSchema = z.object({
  id: idSchema,
  company: text,
  role: text,
  link: text,
  stage: z.enum(APPLICATION_STAGES),
  /** ISO date (yyyy-mm-dd). */
  date: text,
  notes: text,
  cvId: z.string().nullable(),
  coverLetterId: z.string().nullable(),
  /** Position within its stage column. */
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type JobApplication = z.infer<typeof applicationSchema>;
