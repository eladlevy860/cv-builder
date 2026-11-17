import type { Language, SectionType } from "../model/schema";

/**
 * Bilingual writing-help content: guidance per section, an action-verb
 * library and example bullets. This text goes *into documents* (examples
 * and verbs) or explains how to write them, so it lives with the document
 * labels in core rather than in the UI message files.
 *
 * Hebrew uses the action-noun style common in Israeli CVs ("תכנון",
 * "הובלת", "הפחתת"). English uses past-tense verbs. Numbers in [brackets]
 * are placeholders the user should replace with their own figures.
 */

export type Bilingual = Record<Language, string>;

// ---------------------------------------------------------------------------
// Guidance: what recruiters look for, per section
// ---------------------------------------------------------------------------

export const GUIDANCE: Partial<Record<SectionType, Record<Language, string[]>>> = {
  summary: {
    he: [
      "2–4 שורות: מי את/ה מקצועית, במה את/ה חזק/ה, ואיזה תפקיד את/ה מחפש/ת.",
      "התאימו את התמצית לכל משרה: מגייסים קוראים אותה ראשונה, לרוב בפחות מ־10 שניות.",
      "שלבו 2–3 כלים או תחומים מרכזיים (למשל SolidWorks, GD&T, ניתוחי חוזק) כמילות מפתח.",
      "הימנעו מסיסמאות כלליות כמו \"חרוץ ובעל מוטיבציה גבוהה\" בלי דוגמה שמוכיחה אותן.",
    ],
    en: [
      "2–4 lines: who you are professionally, what you are strong at, and the role you want.",
      "Tailor it to each job: recruiters read it first, usually in under 10 seconds.",
      "Work in 2–3 core tools or fields (e.g. SolidWorks, GD&T, stress analysis) as keywords.",
      "Skip generic claims such as \"hard-working and highly motivated\" unless something proves them.",
    ],
  },
  experience: {
    he: [
      "פתחו כל שורה בשם פעולה (תכנון, הובלת, הפחתת) ולא ב\"אחראי על\".",
      "הראו תוצאה, ובמספרים כשאפשר: אחוזים, זמן, כסף, משקל, כמות.",
      "3–5 שורות לתפקיד האחרון, 2–3 לתפקידים ישנים יותר.",
      "בתעשייה הביטחונית מותר לתאר את סוג החברה (\"חברה בתעשייה הביטחונית\") בלי לחשוף פרטים מסווגים.",
    ],
    en: [
      "Start every bullet with an action verb (Designed, Led, Reduced), not \"Responsible for\".",
      "Show the result, with numbers where you can: percent, time, money, weight, quantity.",
      "3–5 bullets for your latest role, 2–3 for older ones.",
      "For defense or confidential work, describe the kind of company instead of naming it.",
    ],
  },
  education: {
    he: [
      "תואר, מוסד ושנים. ממוצע מעל 85 שווה לציין; מתחת לזה אפשר לוותר.",
      "לסטודנטים: פרויקט גמר, התמחות וקורסים רלוונטיים למשרה חשובים יותר מהממוצע.",
      "רשימת דיקן, מלגות ופרסים: בשורה נפרדת או במקטע פרסים.",
    ],
    en: [
      "Degree, institution and years. List your GPA if it is strong (roughly 85+ / 3.5+).",
      "Students: the capstone project, specialization and courses relevant to the job matter more than the GPA.",
      "Dean's list, scholarships and awards: on their own line or in an Awards section.",
    ],
  },
  military: {
    he: [
      "תרגמו את השירות לכישורים אזרחיים: אחריות, הובלת אנשים, עבודה טכנית, עבודה תחת לחץ.",
      "ציינו תפקיד, יחידה כללית (למשל \"חיל האוויר\") ודרגה; הימנעו מפרטים מסווגים.",
      "הצטיינויות וקורסים (קצינים, מפקדים, הסמכות טכניות) מוסיפים הרבה.",
      "בקורות חיים באנגלית, הסבירו מונחים צבאיים במילים פשוטות (Team leader of 12 soldiers).",
    ],
    en: [
      "Translate your service into civilian skills: responsibility, leading people, technical work, working under pressure.",
      "Give your role, a general unit (e.g. \"Israeli Air Force\") and rank; leave out classified details.",
      "Awards and courses (officer, commander, technical certifications) add a lot.",
      "Explain military terms in plain words for non-Israeli readers (Team leader of 12 soldiers).",
    ],
  },
  projects: {
    he: [
      "מה הבעיה, מה עשית אתה/את, באילו כלים, ומה יצא (אב טיפוס, חיסכון, ציון, פרס).",
      "לסטודנטים, פרויקטים מחליפים ניסיון: תנו להם את המקום של ניסיון תעסוקתי.",
      "קישור ל־GitHub, תיק עבודות או סרטון הדגמה מחזק מאוד.",
    ],
    en: [
      "The problem, what you did, which tools, and what came out (prototype, savings, grade, award).",
      "For students, projects stand in for experience: give them that much space.",
      "A link to GitHub, a portfolio or a demo video helps a lot.",
    ],
  },
  skills: {
    he: [
      "קבצו לפי תחום: תכן ושרטוט, ניתוח ותכנות, איכות ותקינה, שפות.",
      "כתבו שמות כלים בדיוק כמו במודעת הדרושים (SolidWorks, ANSYS, GD&T): מערכות ATS מחפשות התאמה מדויקת.",
      "רשמו רק כלים שתוכלו לענות עליהם בראיון.",
    ],
    en: [
      "Group by area: CAD & drafting, analysis & programming, quality & standards, languages.",
      "Spell tools exactly as the job ad does (SolidWorks, ANSYS, GD&T): ATS systems look for exact matches.",
      "List only tools you can talk about in an interview.",
    ],
  },
  courses: {
    he: ["הסמכות מקצועיות (CSWA, Six Sigma) וקורסים שקשורים למשרה.", "ציינו מוסד ושנה; קורסים ישנים ולא רלוונטיים אפשר להשמיט."],
    en: ["Professional certifications (CSWA, Six Sigma) and courses related to the job.", "Give the provider and year; drop old, unrelated courses."],
  },
  awards: {
    he: ["פרס, מי העניק ומתי, ובמשפט אחד: על מה.", "רשימת דיקן ומלגות הצטיינות נכנסות כאן."],
    en: ["The award, who gave it and when, and in one line: what for.", "Dean's list and merit scholarships belong here."],
  },
  volunteering: {
    he: ["התנדבות מראה מעורבות ואחריות; תארו אותה כמו תפקיד, עם תוצאה.", "חונכות, הוראה והדרכה מראים כישורי תקשורת."],
    en: ["Volunteering shows commitment and responsibility; describe it like a job, with a result.", "Mentoring, teaching and tutoring show communication skills."],
  },
  languages: {
    he: ["השתמשו בתיאור ברור: שפת אם, רמה גבוהה מאוד, רמה טובה, בסיסית.", "אנגלית ברמה גבוהה חשובה כמעט בכל משרה הנדסית בישראל."],
    en: ["Use a clear level: native, full professional proficiency, good, basic.", "Strong English matters for almost every engineering job in Israel."],
  },
  references: {
    he: ["שם, תפקיד ודרך יצירת קשר, רק באישור הממליץ.", "אפשר לכתוב במקומם \"ממליצים יינתנו לפי דרישה\" ולחסוך מקום."],
    en: ["Name, role and contact details, only with the person's permission.", "\"References available on request\" saves space if you need it."],
  },
};

// ---------------------------------------------------------------------------
// Action verbs
// ---------------------------------------------------------------------------

export const VERB_CATEGORIES = ["design", "analyze", "improve", "lead", "deliver", "communicate"] as const;
export type VerbCategory = (typeof VERB_CATEGORIES)[number];

export const ACTION_VERBS: Record<VerbCategory, Bilingual[]> = {
  design: [
    { en: "Designed", he: "תכנון" },
    { en: "Developed", he: "פיתוח" },
    { en: "Modeled", he: "מידול" },
    { en: "Prototyped", he: "בניית אב טיפוס של" },
    { en: "Specified", he: "אפיון" },
    { en: "Drafted", he: "שרטוט" },
    { en: "Simulated", he: "סימולציה של" },
    { en: "Integrated", he: "אינטגרציה של" },
    { en: "Engineered", he: "הנדוס" },
  ],
  analyze: [
    { en: "Analyzed", he: "ניתוח" },
    { en: "Calculated", he: "חישוב" },
    { en: "Tested", he: "בדיקת" },
    { en: "Validated", he: "אימות" },
    { en: "Measured", he: "מדידת" },
    { en: "Investigated", he: "תחקור" },
    { en: "Evaluated", he: "הערכת" },
    { en: "Diagnosed", he: "איתור תקלות ב־" },
    { en: "Researched", he: "מחקר" },
  ],
  improve: [
    { en: "Reduced", he: "הפחתת" },
    { en: "Improved", he: "שיפור" },
    { en: "Optimized", he: "אופטימיזציה של" },
    { en: "Increased", he: "הגדלת" },
    { en: "Streamlined", he: "ייעול" },
    { en: "Automated", he: "אוטומציה של" },
    { en: "Shortened", he: "קיצור" },
    { en: "Saved", he: "חיסכון של" },
    { en: "Redesigned", he: "תכנון מחדש של" },
  ],
  lead: [
    { en: "Led", he: "הובלת" },
    { en: "Managed", he: "ניהול" },
    { en: "Coordinated", he: "תיאום" },
    { en: "Supervised", he: "פיקוח על" },
    { en: "Trained", he: "הדרכת" },
    { en: "Mentored", he: "חניכת" },
    { en: "Initiated", he: "ייזום" },
    { en: "Commanded", he: "פיקוד על" },
    { en: "Planned", he: "תכנון ותזמון של" },
  ],
  deliver: [
    { en: "Implemented", he: "יישום" },
    { en: "Built", he: "בניית" },
    { en: "Manufactured", he: "ייצור" },
    { en: "Assembled", he: "הרכבת" },
    { en: "Installed", he: "התקנת" },
    { en: "Maintained", he: "תחזוקת" },
    { en: "Launched", he: "השקת" },
    { en: "Documented", he: "תיעוד" },
    { en: "Completed", he: "השלמת" },
  ],
  communicate: [
    { en: "Presented", he: "הצגת" },
    { en: "Wrote", he: "כתיבת" },
    { en: "Collaborated with", he: "עבודה משותפת עם" },
    { en: "Negotiated", he: "ניהול משא ומתן עם" },
    { en: "Reported", he: "דיווח" },
    { en: "Advised", he: "ייעוץ ל־" },
    { en: "Taught", he: "הוראת" },
    { en: "Represented", he: "ייצוג" },
    { en: "Liaised with", he: "קשר שוטף עם" },
  ],
};

// ---------------------------------------------------------------------------
// Example bullets and summaries
// ---------------------------------------------------------------------------

export const EXAMPLE_FIELDS = ["mechanical", "student", "general"] as const;
export type ExampleField = (typeof EXAMPLE_FIELDS)[number];

/** Section types that have example text, and whether the examples are bullets or paragraphs. */
export const EXAMPLE_KIND: Partial<Record<SectionType, "bullet" | "paragraph">> = {
  summary: "paragraph",
  experience: "bullet",
  military: "bullet",
  projects: "bullet",
  education: "bullet",
  volunteering: "bullet",
};

export const EXAMPLES: Partial<Record<SectionType, Partial<Record<ExampleField, Bilingual[]>>>> = {
  summary: {
    mechanical: [
      {
        en: "Mechanical engineer with [3] years of experience in mechanical design and production support. Skilled in SolidWorks, GD&T and FEA, with a track record of cutting assembly weight and cost. Looking for a design engineer role in an R&D team.",
        he: "מהנדס מכונות עם [3] שנות ניסיון בתכן מכני ובליווי ייצור. שליטה ב־SolidWorks, ב־GD&T ובניתוחי FEA, עם הישגים בהפחתת משקל ועלות של מכלולים. מחפש תפקיד מהנדס תכן בצוות פיתוח.",
      },
      {
        en: "Design engineer focused on electro-mechanical systems, from concept and calculations to drawings and integration on the production floor. Works closely with suppliers and manufacturing to bring products to production on time.",
        he: "מהנדס תכן המתמחה במערכות אלקטרו־מכניות, מהקונספט והחישובים ועד שרטוטי ייצור ואינטגרציה ברצפת הייצור. עבודה צמודה עם ספקים וייצור כדי להביא מוצרים לייצור בזמן.",
      },
    ],
    student: [
      {
        en: "Final-year mechanical engineering student (GPA [88]) with hands-on experience from an engineering internship and a robotics capstone project. Proficient in SolidWorks and MATLAB. Looking for a student position or a junior design role.",
        he: "סטודנט שנה ד' להנדסת מכונות (ממוצע [88]) עם ניסיון מעשי מהתמחות הנדסית ומפרויקט גמר ברובוטיקה. שליטה ב־SolidWorks וב־MATLAB. מחפש משרת סטודנט או תפקיד תכן לבוגרים.",
      },
      {
        en: "Engineering student who learns fast and likes building things: designed and built [3] prototypes in university projects and led a team of [4] in a design competition. Available [3] days a week.",
        he: "סטודנט להנדסה שלומד מהר ואוהב לבנות דברים: תכנון ובנייה של [3] אבות טיפוס בפרויקטים אקדמיים והובלת צוות של [4] בתחרות תכן. זמין [3] ימים בשבוע.",
      },
    ],
    general: [
      {
        en: "[Role] with [5] years of experience in [field]. Known for [strength] and for delivering [result]. Looking to bring these skills to a [target role] position.",
        he: "[תפקיד] עם [5] שנות ניסיון ב[תחום]. בולט/ת ב[חוזקה] ובהשגת [תוצאה]. מחפש/ת להביא את הניסיון הזה לתפקיד [תפקיד מבוקש].",
      },
    ],
  },
  experience: {
    mechanical: [
      { en: "Designed [12] mechanical assemblies in SolidWorks, from concept to released production drawings", he: "תכנון [12] מכלולים מכניים ב־SolidWorks, מקונספט ועד שרטוטי ייצור משוחררים" },
      { en: "Reduced assembly weight by [15]% through FEA-driven redesign in ANSYS", he: "הפחתת משקל המכלול ב־[15]% באמצעות תכן מחדש מבוסס ניתוחי FEA ב־ANSYS" },
      { en: "Prepared production drawings per GD&T (ASME Y14.5) and ISO 9001:2015", he: "הכנת שרטוטי ייצור לפי GD&T (ASME Y14.5) ותקן ISO 9001:2015" },
      { en: "Cut machining cost by [20]% by redesigning parts for manufacturability (DFM)", he: "הוזלת עלויות עיבוד ב־[20]% באמצעות תכן מחדש לייצוריות (DFM)" },
      { en: "Led root-cause analysis of field failures and implemented design fixes that cut returns by [30]%", he: "הובלת תחקירי כשלים מהשטח ויישום תיקוני תכן שהפחיתו החזרות ב־[30]%" },
      { en: "Wrote test procedures and ran environmental tests (vibration, thermal) on [5] subsystems", he: "כתיבת נהלי בדיקה וביצוע בדיקות סביבה (רעידות, תרמיות) ל־[5] תתי־מערכות" },
      { en: "Resolved [40]+ manufacturing deviations with suppliers and the production floor", he: "סגירת [40]+ חריגות ייצור מול ספקים ורצפת הייצור" },
      { en: "Prepared the BOM and SOW for a new test-equipment line", he: "הכנת BOM ו־SOW לקו ציוד בדיקה חדש" },
    ],
    student: [
      { en: "Created CAD models and drawings for [3] products in development with the design team", he: "מידול ושרטוט ל־[3] מוצרים בפיתוח, יחד עם צוות התכן" },
      { en: "Built a MATLAB tool that automated test-data analysis and saved [4] hours a week", he: "פיתוח כלי ב־MATLAB לאוטומציה של ניתוח נתוני בדיקות, שחסך [4] שעות עבודה בשבוע" },
      { en: "Taught weekly lab sessions to groups of [20] students in mechatronics", he: "הדרכת מעבדות שבועיות לקבוצות של [20] סטודנטים במכטרוניקה" },
      { en: "Measured and documented [50]+ parts for incoming quality inspection", he: "מדידה ותיעוד של [50]+ חלקים בבקרת איכות נכנסת" },
      { en: "Updated [100]+ drawings and part numbers in the PDM system during a product transfer", he: "עדכון [100]+ שרטוטים ומק\"טים במערכת PDM במסגרת העברת מוצר" },
    ],
    general: [
      { en: "Led a team of [6] and delivered [project] [2] weeks ahead of schedule", he: "הובלת צוות של [6] אנשים והשלמת [פרויקט] [שבועיים] לפני הזמן" },
      { en: "Improved [process] and cut turnaround time by [25]%", he: "שיפור [תהליך] וקיצור זמני הטיפול ב־[25]%" },
      { en: "Resolved [30]+ customer requests a day with a [95]% satisfaction rate", he: "מענה ל־[30]+ פניות לקוחות ביום עם [95]% שביעות רצון" },
      { en: "Trained [10] new employees and wrote the team's onboarding guide", he: "הדרכת [10] עובדים חדשים וכתיבת מדריך הקליטה של הצוות" },
      { en: "Managed a budget of [₪200K] and closed the year [10]% under budget", he: "ניהול תקציב של [200 אלף ₪] וסיום השנה [10]% מתחת לתקציב" },
    ],
  },
  military: {
    mechanical: [
      { en: "Maintained hydraulic and fuel systems on [F-16] aircraft according to quality procedures", he: "תחזוקת מערכות הידראוליקה ודלק במטוסי [F-16] לפי נהלי איכות" },
      { en: "Diagnosed and repaired faults in [armored vehicle] power trains, keeping [95]% fleet availability", he: "איתור ותיקון תקלות במערכות הנעה של [רק\"ם], ושמירה על זמינות של [95]% מהצי" },
      { en: "Led a maintenance team of [8] technicians in shifts", he: "הובלת צוות של [8] טכנאים במשמרות אחזקה" },
    ],
    student: [
      { en: "Selected for the [technical course] and graduated with distinction", he: "מיון ל[קורס טכני] וסיום בהצטיינות" },
      { en: "Trained [30] new soldiers on [equipment] operation and safety", he: "הדרכת [30] חיילים חדשים בהפעלת [ציוד] ובבטיחות" },
    ],
    general: [
      { en: "Commanded a team of [12] soldiers in operational activity", he: "פיקוד על צוות של [12] לוחמים בפעילות מבצעית" },
      { en: "Planned and ran logistics for [300] soldiers during exercises", he: "תכנון וניהול הלוגיסטיקה של [300] חיילים בתרגילים" },
      { en: "Built a tracking system in Excel that replaced manual reports for the battalion", he: "בניית מערכת מעקב ב־Excel שהחליפה דיווחים ידניים ברמת הגדוד" },
      { en: "Received the [unit commander's] certificate of excellence", he: "קבלת תעודת הצטיינות [מפקד היחידה]" },
    ],
  },
  projects: {
    mechanical: [
      { en: "Designed and built a [3-DOF] robotic arm; SolidWorks model, Arduino controller and C++ firmware", he: "תכנון ובניית זרוע רובוטית [3 דרגות חופש]; מודל ב־SolidWorks, בקר Arduino וקוד C++" },
      { en: "Ran CFD simulations of [a heat sink] and improved cooling by [18]%", he: "הרצת סימולציות CFD ל[גוף קירור] ושיפור הקירור ב־[18]%" },
      { en: "Selected materials and ran fatigue calculations for a [bicycle frame]", he: "בחירת חומרים וחישובי עייפות ל[שלדת אופניים]" },
    ],
    student: [
      { en: "Capstone: [gripper for a production line], team of [4]; won [first place] in the department's project fair", he: "פרויקט גמר: [תפסנית לקו ייצור], צוות של [4]; [מקום ראשון] ביריד הפרויקטים של הפקולטה" },
      { en: "Built a test rig with [load cells] and analyzed the data in MATLAB", he: "בניית מתקן ניסוי עם [תאי עומס] וניתוח הנתונים ב־MATLAB" },
      { en: "Built the [chassis] for the [Formula Student] team car and passed technical inspection", he: "בניית [השלדה] לרכב של צוות [Formula Student] ועמידה בבדיקת הכשירות הטכנית" },
    ],
  },
  education: {
    student: [
      { en: "Capstone project: [robotic gripper for a production line] ([2023–2025])", he: "פרויקט גמר: [תפסנית רובוטית לקו ייצור] ([2023–2025])" },
      { en: "Specialization: [mechatronics and control]", he: "התמחות: [מכטרוניקה ובקרה]" },
      { en: "Relevant courses: [Machine Design, FEA, Control Systems, Heat Transfer]", he: "קורסים רלוונטיים: [תכן מכונות, אלמנטים סופיים, בקרה, מעבר חום]" },
      { en: "Dean's list [2024]; merit scholarship", he: "רשימת הדיקן [2024]; מלגת הצטיינות" },
    ],
  },
  volunteering: {
    general: [
      { en: "Tutored [5] high-school students in math and physics every week", he: "חונכות שבועית ל־[5] תלמידי תיכון במתמטיקה ובפיזיקה" },
      { en: "Mentored a youth robotics team ([FIRST]) that reached the [national finals]", he: "הנחיית קבוצת רובוטיקה של בני נוער ([FIRST]) שהגיעה ל[גמר הארצי]" },
      { en: "Organized a [fundraising event] that raised [₪20K]", he: "ארגון [אירוע התרמה] שגייס [20 אלף ₪]" },
    ],
  },
};

/** Examples available for a section, with fallback to every field that has some. */
export function examplesFor(type: SectionType): Partial<Record<ExampleField, Bilingual[]>> {
  return EXAMPLES[type] ?? {};
}

// ---------------------------------------------------------------------------
// Weak openings
// ---------------------------------------------------------------------------

/** Openings that describe duties instead of achievements. */
export const WEAK_STARTS: Record<Language, string[]> = {
  en: [
    "responsible for",
    "duties included",
    "tasked with",
    "in charge of",
    "involved in",
    "participated in",
    "helped with",
    "helped",
    "assisted with",
    "assisted",
    "worked on",
    "worked with",
    "handled",
  ],
  he: [
    "אחראי על",
    "אחראית על",
    "אחריות על",
    "היה באחריותי",
    "תפקידי כלל",
    "השתתפות ב",
    "השתתפתי",
    "עזרה ב",
    "עזרתי",
    "סיוע ב",
    "סייעתי",
    "עבודה על",
    "עבדתי על",
    "מעורבות ב",
    "טיפול ב",
    "ביצוע משימות",
  ],
};
