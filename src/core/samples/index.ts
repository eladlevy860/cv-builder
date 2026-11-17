import { createCv, createItem, createSection, createSkill, newId } from "../model/factory";
import { richTextFromBullets, richTextFromPlain } from "../model/richtext";
import type { CvDocument, Language, Section } from "../model/schema";

/**
 * Sample CVs. The Hebrew one doubles as the **bidi test fixture**: it contains
 * every mixed-direction string the spec requires, and the export tests check
 * these strings in the preview, PDF and DOCX.
 */
export const BIDI_FIXTURE_STRINGS = [
  "מהנדס מכונות, SolidWorks 2024, GD&T",
  "elad@example.com",
  "052-1234567",
  "linkedin.com/in/example",
  "(2023–2025)",
  'תכנון עגלות ל-צב"ד, כולל BOM ו-SOW',
  "C++, MATLAB, ISO 9001:2015",
] as const;

function skills(names: string[]) {
  return names.map((n) => createSkill(n));
}

function hebrewSample(): CvDocument {
  const doc = createCv({ language: "he", title: "קורות חיים – דוגמה" });
  doc.basics = {
    ...doc.basics,
    name: "נועם כהן",
    headline: "מהנדס מכונות, SolidWorks 2024, GD&T",
    email: "elad@example.com",
    phone: "052-1234567",
    city: "חיפה",
    links: [{ id: newId(), label: "LinkedIn", url: "linkedin.com/in/example" }],
  };

  const summary = createSection("summary");
  summary.content = richTextFromPlain(
    "סטודנט שנה ד' להנדסת מכונות עם ניסיון מעשי בתכנון מכני, שרטוט לפי GD&T וליווי ייצור. " +
      "מתמחה בתעשייה הביטחונית (05/2025 – היום), שולט ב-SolidWorks 2024 וב-MATLAB, ומחפש משרת מהנדס תכן.",
  );

  const experience = createSection("experience");
  experience.items = [
    {
      ...createItem("experience"),
      role: "מהנדס מכונות (סטודנט)",
      organization: "חברה בתעשייה הביטחונית",
      location: "חיפה",
      dates: { start: { year: 2025, month: 5 }, end: null, present: true },
      description: richTextFromBullets([
        'תכנון עגלות ל-צב"ד, כולל BOM ו-SOW',
        "הכנת שרטוטי ייצור לפי GD&T ותקן ISO 9001:2015",
        "ניתוח חוזק ב-ANSYS שהוביל להפחתת משקל המכלול ב-12%",
        "כלים ותקנים: C++, MATLAB, ISO 9001:2015",
      ]),
    },
    {
      ...createItem("experience"),
      role: "מדריך מעבדה",
      organization: "הפקולטה להנדסת מכונות",
      location: "חיפה",
      dates: { start: { year: 2023, month: 10 }, end: { year: 2025, month: 2 }, present: false },
      description: richTextFromBullets([
        "הדרכת קבוצות של 20 סטודנטים במעבדת מכטרוניקה (2023–2025)",
        "כתיבת תרגילי C++, MATLAB לבקרת מנועים",
      ]),
    },
  ];

  const education = createSection("education");
  education.items = [
    {
      ...createItem("education"),
      degree: "B.Sc.",
      field: "הנדסת מכונות",
      institution: "הטכניון – מכון טכנולוגי לישראל",
      location: "חיפה",
      dates: { start: { year: 2022, month: 10 }, end: { year: 2026, month: 7 }, present: false },
      grade: "88",
      description: richTextFromPlain("פרויקט גמר: מערכת אחיזה רובוטית למפעל ייצור (2023–2025)"),
    },
  ];

  const military = createSection("military");
  military.items = [
    {
      ...createItem("military"),
      role: "מכונאי מטוסים",
      unit: "חיל האוויר",
      rank: "סמל ראשון",
      dates: { start: { year: 2018, month: 8 }, end: { year: 2021, month: 8 }, present: false },
      distinctions: "מצטיין יחידה",
      description: richTextFromBullets(["אחזקה מונעת למערכות הידראוליות לפי נהלי איכות"]),
    },
  ];

  const projects = createSection("projects");
  projects.items = [
    {
      ...createItem("projects"),
      name: "זרוע רובוטית בהדפסת תלת-ממד",
      role: "ראש צוות",
      link: "github.com/example/robot-arm",
      dates: { start: { year: 2024 }, end: { year: 2025 }, present: false },
      description: richTextFromBullets(["תכן ב-SolidWorks 2024, בקר Arduino וקוד C++"]),
    },
  ];

  const skillsSection = createSection("skills");
  skillsSection.items = [
    { ...createItem("skills"), name: "תכן ושרטוט", skills: skills(["SolidWorks 2024", "Siemens NX", "AutoCAD", "GD&T"]) },
    { ...createItem("skills"), name: "ניתוח ותכנות", skills: skills(["ANSYS", "C++", "MATLAB", "Python"]) },
    { ...createItem("skills"), name: "איכות ותקינה", skills: skills(["ISO 9001:2015", "FMEA"]) },
  ];

  const courses = createSection("courses");
  courses.items = [
    { ...createItem("courses"), name: "CSWA – Certified SolidWorks Associate", issuer: "Dassault Systèmes", date: { year: 2024, month: 3 } },
  ];

  const languages = createSection("languages");
  languages.items = [
    { ...createItem("languages"), language: "עברית", fluency: "שפת אם", level: 5 },
    { ...createItem("languages"), language: "אנגלית", fluency: "רמה גבוהה מאוד", level: 4 },
  ];

  doc.sections = [summary, experience, education, military, projects, skillsSection, courses, languages] as Section[];
  return doc;
}

function englishSample(): CvDocument {
  const doc = createCv({ language: "en", title: "Resume – sample" });
  doc.basics = {
    ...doc.basics,
    name: "Noam Cohen",
    headline: "Mechanical Engineering Student | SolidWorks 2024, GD&T",
    email: "elad@example.com",
    phone: "+972-52-123-4567",
    city: "Haifa, Israel",
    links: [{ id: newId(), label: "LinkedIn", url: "linkedin.com/in/example" }],
  };

  const summary = createSection("summary");
  summary.content = richTextFromPlain(
    "Fourth-year mechanical engineering student with hands-on experience in mechanical design, GD&T drawings and production support. " +
      "Engineering intern in the defense industry since 05/2025, proficient in SolidWorks 2024 and MATLAB, looking for a design engineer role.",
  );

  const experience = createSection("experience");
  experience.items = [
    {
      ...createItem("experience"),
      role: "Mechanical Engineering Intern",
      organization: "Defense industry company",
      location: "Haifa",
      dates: { start: { year: 2025, month: 5 }, end: null, present: true },
      description: richTextFromBullets([
        "Designed test-equipment carts, including the BOM and SOW",
        "Prepared production drawings per GD&T and ISO 9001:2015",
        "Ran ANSYS strength analyses that cut assembly weight by 12%",
      ]),
    },
    {
      ...createItem("experience"),
      role: "Lab Instructor",
      organization: "Faculty of Mechanical Engineering",
      location: "Haifa",
      dates: { start: { year: 2023, month: 10 }, end: { year: 2025, month: 2 }, present: false },
      description: richTextFromBullets([
        "Taught groups of 20 students in the mechatronics lab (2023–2025)",
        "Wrote C++ and MATLAB exercises on motor control",
      ]),
    },
  ];

  const education = createSection("education");
  education.items = [
    {
      ...createItem("education"),
      degree: "B.Sc.",
      field: "Mechanical Engineering",
      institution: "Technion – Israel Institute of Technology",
      location: "Haifa",
      dates: { start: { year: 2022, month: 10 }, end: { year: 2026, month: 7 }, present: false },
      grade: "88",
      description: richTextFromPlain("Capstone: robotic gripper for a production line (2023–2025)"),
    },
  ];

  const military = createSection("military");
  military.items = [
    {
      ...createItem("military"),
      role: "Aircraft Mechanic",
      unit: "Israeli Air Force",
      rank: "Staff Sergeant",
      dates: { start: { year: 2018, month: 8 }, end: { year: 2021, month: 8 }, present: false },
      distinctions: "Outstanding Soldier of the Unit",
      description: richTextFromBullets(["Preventive maintenance of hydraulic systems under quality procedures"]),
    },
  ];

  const projects = createSection("projects");
  projects.items = [
    {
      ...createItem("projects"),
      name: "3D-printed Robotic Arm",
      role: "Team lead",
      link: "github.com/example/robot-arm",
      dates: { start: { year: 2024 }, end: { year: 2025 }, present: false },
      description: richTextFromBullets(["Designed in SolidWorks 2024, Arduino controller and C++ firmware"]),
    },
  ];

  const skillsSection = createSection("skills");
  skillsSection.items = [
    { ...createItem("skills"), name: "Design & Drafting", skills: skills(["SolidWorks 2024", "Siemens NX", "AutoCAD", "GD&T"]) },
    { ...createItem("skills"), name: "Analysis & Programming", skills: skills(["ANSYS", "C++", "MATLAB", "Python"]) },
    { ...createItem("skills"), name: "Quality & Standards", skills: skills(["ISO 9001:2015", "FMEA"]) },
  ];

  const courses = createSection("courses");
  courses.items = [
    { ...createItem("courses"), name: "CSWA – Certified SolidWorks Associate", issuer: "Dassault Systèmes", date: { year: 2024, month: 3 } },
  ];

  const languages = createSection("languages");
  languages.items = [
    { ...createItem("languages"), language: "Hebrew", fluency: "Native", level: 5 },
    { ...createItem("languages"), language: "English", fluency: "Full professional proficiency", level: 4 },
  ];

  doc.sections = [summary, experience, education, military, projects, skillsSection, courses, languages] as Section[];
  return doc;
}

export function createSampleCv(language: Language, templateId?: string): CvDocument {
  const doc = language === "he" ? hebrewSample() : englishSample();
  if (templateId) doc.templateId = templateId;
  return doc;
}
