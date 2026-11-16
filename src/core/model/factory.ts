import { nanoid } from "nanoid";
import { emptyRichText } from "./richtext";
import {
  SCHEMA_VERSION,
  type AwardItem,
  type Basics,
  type CourseItem,
  type CoverLetterDocument,
  type CustomItem,
  type CvDocument,
  type DateRange,
  type EducationItem,
  type ExperienceItem,
  type Language,
  type LanguageItem,
  type MilitaryItem,
  type ProjectItem,
  type ReferenceItem,
  type Section,
  type SectionItem,
  type SectionOf,
  type SectionType,
  type Skill,
  type SkillGroupItem,
  type Theme,
  type VolunteeringItem,
} from "./schema";

export const newId = (): string => nanoid(12);
export const nowIso = (): string => new Date().toISOString();

export const DEFAULT_TEMPLATE_ID = "classic";

export function defaultTheme(language: Language): Theme {
  return {
    accentColor: "#1f4e79",
    fontBody: language === "he" ? "heebo" : "assistant",
    fontHeading: language === "he" ? "heebo" : "assistant",
    baseFontSize: 10,
    lineHeight: 1.4,
    sectionSpacing: 5,
    pageMargins: 14,
    pageSize: "A4",
    headingStyle: "line",
    showPhoto: false,
    showIcons: true,
    dateFormat: "MM/YYYY",
    presentLabelHe: "היום",
  };
}

export function emptyBasics(): Basics {
  return { name: "", headline: "", email: "", phone: "", city: "", links: [], photo: null, extras: [] };
}

export function emptyRange(): DateRange {
  return { start: null, end: null, present: false };
}

export function createSkill(name = ""): Skill {
  return { id: newId(), name, level: 0, levelText: "" };
}

type ItemByType = {
  experience: ExperienceItem;
  education: EducationItem;
  military: MilitaryItem;
  projects: ProjectItem;
  skills: SkillGroupItem;
  languages: LanguageItem;
  courses: CourseItem;
  awards: AwardItem;
  volunteering: VolunteeringItem;
  references: ReferenceItem;
  custom: CustomItem;
};
export type ItemSectionType = keyof ItemByType;

export function createItem<T extends ItemSectionType>(type: T): ItemByType[T] {
  const base = { id: newId(), visible: true };
  const desc = emptyRichText();
  const items: { [K in ItemSectionType]: () => ItemByType[K] } = {
    experience: () => ({ ...base, role: "", organization: "", location: "", dates: emptyRange(), description: desc }),
    education: () => ({
      ...base,
      degree: "",
      field: "",
      institution: "",
      location: "",
      dates: emptyRange(),
      grade: "",
      description: desc,
    }),
    military: () => ({
      ...base,
      role: "",
      unit: "",
      rank: "",
      dates: emptyRange(),
      distinctions: "",
      description: desc,
    }),
    projects: () => ({ ...base, name: "", role: "", link: "", dates: emptyRange(), description: desc }),
    skills: () => ({ ...base, name: "", skills: [] }),
    languages: () => ({ ...base, language: "", fluency: "", level: 0 }),
    courses: () => ({ ...base, name: "", issuer: "", date: null, link: "", description: desc }),
    awards: () => ({ ...base, title: "", issuer: "", date: null, description: desc }),
    volunteering: () => ({
      ...base,
      role: "",
      organization: "",
      location: "",
      dates: emptyRange(),
      description: desc,
    }),
    references: () => ({ ...base, name: "", role: "", organization: "", email: "", phone: "", note: "" }),
    custom: () => ({
      ...base,
      title: "",
      subtitle: "",
      location: "",
      link: "",
      dates: emptyRange(),
      description: desc,
    }),
  };
  return items[type]();
}

export function createSection<T extends SectionType>(type: T): SectionOf<T> {
  const base = { id: newId(), title: null, visible: true, placement: "auto" as const };
  let section: Section;
  switch (type) {
    case "summary":
      section = { ...base, type: "summary", content: emptyRichText() };
      break;
    case "skills":
      section = { ...base, type: "skills", levelDisplay: "none", items: [] };
      break;
    case "languages":
      section = { ...base, type: "languages", levelDisplay: "text", items: [] };
      break;
    default:
      section = { ...base, type, items: [] } as Section;
  }
  return section as SectionOf<T>;
}

/** Default section set for a new blank CV. */
export const DEFAULT_SECTION_ORDER: Record<Language, SectionType[]> = {
  he: ["summary", "experience", "education", "military", "skills", "languages"],
  en: ["summary", "experience", "education", "military", "skills", "languages"],
};

export function createCv(opts: { language: Language; templateId?: string; title?: string }): CvDocument {
  const ts = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    type: "cv",
    title: opts.title ?? (opts.language === "he" ? "קורות חיים" : "Resume"),
    language: opts.language,
    templateId: opts.templateId ?? DEFAULT_TEMPLATE_ID,
    theme: defaultTheme(opts.language),
    basics: emptyBasics(),
    sections: DEFAULT_SECTION_ORDER[opts.language].map((t) => createSection(t)),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createCoverLetter(opts: {
  language: Language;
  templateId?: string;
  title?: string;
  linkedCv?: CvDocument | null;
}): CoverLetterDocument {
  const ts = nowIso();
  const cv = opts.linkedCv ?? null;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    type: "coverLetter",
    title: opts.title ?? (opts.language === "he" ? "מכתב מקדים" : "Cover Letter"),
    language: opts.language,
    templateId: cv?.templateId ?? opts.templateId ?? DEFAULT_TEMPLATE_ID,
    theme: cv ? structuredClone(cv.theme) : defaultTheme(opts.language),
    basics: cv ? structuredClone(cv.basics) : emptyBasics(),
    linkedCvId: cv?.id ?? null,
    letter: {
      recipientName: "",
      recipientRole: "",
      company: "",
      companyAddress: "",
      date: "",
      subject: "",
      opening: opts.language === "he" ? "שלום רב," : "Dear Hiring Manager,",
      body: emptyRichText(),
      closing: opts.language === "he" ? "בברכה," : "Sincerely,",
      signature: cv?.basics.name ?? "",
    },
    createdAt: ts,
    updatedAt: ts,
  };
}

export function isItemSection(s: Section): s is Exclude<Section, { type: "summary" }> {
  return s.type !== "summary";
}

/** Deep-copies a section or item tree, assigning fresh ids. */
export function reId<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reId) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === "id" && typeof v === "string" ? newId() : reId(v);
    return out as T;
  }
  return value;
}

export type { SectionItem };
