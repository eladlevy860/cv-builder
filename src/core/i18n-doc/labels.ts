import type { Language, SectionType } from "../model/schema";
import type { ExtraField } from "../model/schema";

/**
 * Labels that appear *inside documents* (as opposed to app UI strings, which
 * live in src/messages). They follow the document language, not the UI language.
 */
export const DEFAULT_SECTION_TITLES: Record<Language, Record<SectionType, string>> = {
  he: {
    summary: "תמצית מקצועית",
    experience: "ניסיון תעסוקתי",
    education: "השכלה",
    military: "שירות צבאי",
    projects: "פרויקטים",
    skills: "כישורים ויישומי מחשב",
    languages: "שפות",
    courses: "קורסים והסמכות",
    awards: "פרסים והצטיינויות",
    volunteering: "התנדבות",
    references: "ממליצים",
    custom: "מקטע נוסף",
  },
  en: {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    military: "Military Service",
    projects: "Projects",
    skills: "Skills & Software",
    languages: "Languages",
    courses: "Courses & Certifications",
    awards: "Awards & Honors",
    volunteering: "Volunteering",
    references: "References",
    custom: "Additional Information",
  },
};

export const PERSONAL_DETAILS_TITLE: Record<Language, string> = {
  he: "פרטים אישיים",
  en: "Personal Details",
};

export const EXTRA_FIELD_LABELS: Record<Language, Record<Exclude<ExtraField["kind"], "custom">, string>> = {
  he: {
    idNumber: "ת.ז.",
    birthDate: "תאריך לידה",
    maritalStatus: "מצב משפחתי",
    nationality: "אזרחות",
    drivingLicense: "רישיון נהיגה",
  },
  en: {
    idNumber: "ID number",
    birthDate: "Date of birth",
    maritalStatus: "Marital status",
    nationality: "Citizenship",
    drivingLicense: "Driving license",
  },
};

export const LEVEL_TEXT: Record<Language, string[]> = {
  he: ["", "בסיסית", "בינונית", "טובה", "טובה מאוד", "שפת אם / מומחה"],
  en: ["", "Basic", "Intermediate", "Good", "Very good", "Native / Expert"],
};

export function sectionTitle(
  section: { type: SectionType; title: string | null },
  language: Language,
): string {
  const custom = section.title?.trim();
  return custom ? custom : DEFAULT_SECTION_TITLES[language][section.type];
}

/** True when `title` equals the default title in either language. */
export function isDefaultSectionTitle(type: SectionType, title: string | null): boolean {
  if (title === null || title.trim() === "") return true;
  const t = title.trim();
  return t === DEFAULT_SECTION_TITLES.he[type] || t === DEFAULT_SECTION_TITLES.en[type];
}
