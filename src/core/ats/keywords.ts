/**
 * Job-ad keyword matching, Hebrew-aware.
 *
 * Hebrew glues one-letter prefixes to words (ה, ו, ב, ל, מ, ש, כ: "בתכנון",
 * "והניסיון", "שה…"), has final letter forms (ך ם ן ף ץ), writes
 * abbreviations with geresh/gershayim (צה"ל, ת"א) and inflects for plural and
 * construct state (הנדסה / הנדסת, מכונה / מכונות). Each word is therefore
 * reduced to a small set of candidate stems; two words match when their
 * sets share a stem of at least three letters. English words are compared
 * case-insensitively with a light plural rule. Tools written in Hebrew
 * letters (סולידוורקס, מטלב) are aliased to their Latin names.
 */

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const PREFIX_LETTERS = new Set(["ה", "ו", "ב", "ל", "מ", "ש", "כ"]);
// Plural, feminine and construct endings, in normalized form ("ים" is written "ימ" after final-letter folding).
const SUFFIXES = ["ימ", "ות", "ית", "ה", "ת", "י"];
const MIN_STEM = 3;
const HEBREW = /[א-ת]/;

/** Removes niqqud and cantillation, geresh/gershayim and quotes; final letters become regular. */
export function normalizeHebrew(word: string): string {
  return word
    .normalize("NFC")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[׳״'"`’‘”“]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]);
}

/** Forms with up to three leading prefix letters removed (the word itself first). */
export function stripPrefixes(word: string): string[] {
  const out = [word];
  let w = word;
  for (let i = 0; i < 3 && w.length > MIN_STEM && PREFIX_LETTERS.has(w[0]); i++) {
    w = w.slice(1);
    out.push(w);
  }
  return out;
}

/** Candidate stems of a Hebrew word: prefix-stripped forms, each with and without a common suffix. */
export function hebrewStems(word: string): string[] {
  const n = normalizeHebrew(word);
  const out = new Set<string>();
  for (const base of stripPrefixes(n)) {
    out.add(base);
    for (const suf of SUFFIXES) {
      if (base.endsWith(suf) && base.length - suf.length >= MIN_STEM) out.add(base.slice(0, -suf.length));
    }
  }
  return [...out].filter((s) => s.length >= MIN_STEM || s === n);
}

function latinStems(word: string): string[] {
  const w = word.toLowerCase().replace(/['’]s$/, "");
  const out = new Set([w]);
  if (/^[a-z]+$/.test(w) && w.length > 3) {
    if (w.endsWith("ies")) out.add(`${w.slice(0, -3)}y`);
    else if (w.endsWith("es") && /(ch|sh|x|ss)es$/.test(w)) out.add(w.slice(0, -2));
    else if (w.endsWith("s") && !w.endsWith("ss")) out.add(w.slice(0, -1));
  }
  return [...out];
}

/** Hebrew spellings of tools and languages, keyed by normalized form. */
const ALIASES_RAW: Record<string, string> = {
  סולידוורקס: "solidworks",
  "סולידוורק": "solidworks",
  אוטוקאד: "autocad",
  מטלב: "matlab",
  פייתון: "python",
  פיתון: "python",
  אקסל: "excel",
  אנסיס: "ansys",
  קטיה: "catia",
  קריאו: "creo",
  ארדואינו: "arduino",
  אנגלית: "english",
  עברית: "hebrew",
  לינוקס: "linux",
};
const ALIASES = new Map(Object.entries(ALIASES_RAW).map(([k, v]) => [normalizeHebrew(k), v]));

/** Every key a word can match on (its stems plus aliases). */
export function wordKeys(word: string): string[] {
  if (!HEBREW.test(word)) return latinStems(word);
  const stems = hebrewStems(word);
  const keys = new Set(stems);
  for (const s of stems) {
    const alias = ALIASES.get(s);
    if (alias) keys.add(alias);
  }
  return [...keys];
}

// ---------------------------------------------------------------------------
// Tokenizing
// ---------------------------------------------------------------------------

export type Token = { text: string; start: number; end: number; keys: string[]; hebrew: boolean };

// Latin/number tokens keep inner symbols (C++, C#, GD&T, Node.js, AS9100); Hebrew words keep inner quotes (צה"ל).
const TOKEN_RE = /[A-Za-z0-9](?:[A-Za-z0-9+#&./_-]*[A-Za-z0-9+#])?|[א-ת֑-ׇ](?:[א-ת֑-ׇ׳״'"]*[א-ת֑-ׇ׳])?/g;

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const t = m[0].replace(/[.]+$/, "");
    if (!t) continue;
    const hebrew = HEBREW.test(t);
    out.push({ text: t, start: m.index!, end: m.index! + t.length, keys: wordKeys(t), hebrew });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const STOP_EN = new Set(
  `a an the and or but if of to in on at by for with from as is are was were be been being this that these those it its we you our your they their
  he she his her will would can could should may might must shall do does did have has had not no yes all any some such other more most very also than
  then into over under about up out who whom which what when where why how per via etc e.g i.e eg ie us me my
  experience experienced years year required requirements requirement preferred plus advantage advantages ability able knowledge skills skill strong
  excellent good great team teams work working job jobs position positions role roles candidate candidates company looking join including include
  includes responsibilities responsibility responsible opportunity environment new related relevant degree field minimum least well highly both within
  across based using use need needs help make take high level time full part day days hands proven background familiarity familiar understanding
  similar equivalent preferably ideally successful success field fields area areas would like apply`
    .split(/\s+/)
    .filter(Boolean),
);

const STOP_HE = new Set(
  `את של על עם או גם כל יש אין לא כן זה זו זאת הוא היא הם הן אני אנו אנחנו אתה אתם אשר כי אם אך אבל עד בין לפי כמו יותר פחות מאוד רק עוד כבר
  היה היו להיות יהיה תהיה אלה אלו מה מי איך למה כאשר לאחר לפני אחרי תוך מול דרך ללא בלי כגון וכו וכד וכדומה כולל לרבות אחד אחת שני שתי שלוש
  חמש ידי עבור אצל שלנו שלך שלכם אותו אותה אותם במסגרת היכרות ניסיון יתרון חובה דרישות דרישה דרוש דרושה דרושים דרושות משרה משרת תפקיד חברה
  חברת מועמד מועמדת מועמדים מועמדות שנים שנות שנה לפחות יכולת יכולות ידע טובה טוב טובים גבוהה גבוה רבה מלאה מלא חלקית קשר עבודה תיאור אפשרות
  הזדמנות מצוין מצוינת מעולה צוות מחפשים מחפשת מחפש מגייסת מגייסים נדרש נדרשת נדרשים תחום תחומי בעל בעלת בעלי היא הינו הינה מהווה רלוונטי
  רלוונטית דומה דומים מקצועי מקצועית קודם ראשון ראשונה מתאים מתאימה המשרה פונה מיועדת לגברים לנשים כאחד
  שליטה ידיעת הבנה מוכחת מוכח עדיפות בוגר בוגרת בוגרי בוגרים רמה תואר`
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeHebrew),
);

/**
 * Known skills and phrases (engineering-leaning, both languages). Single
 * words get a ranking bonus; multi-word entries are detected as phrases.
 */
const KNOWN = [
  // CAD / CAE / software
  "solidworks", "autocad", "catia", "creo", "inventor", "siemens nx", "solid edge", "fusion 360", "ansys", "abaqus", "comsol", "fluent",
  "star-ccm+", "matlab", "simulink", "python", "c++", "c#", "java", "labview", "excel", "sap", "ms project", "pdm", "plm", "erp", "git",
  "linux", "sql", "arduino", "raspberry pi",
  // engineering methods
  "gd&t", "fea", "cfd", "cad", "cam", "cnc", "plc", "dfm", "dfma", "fmea", "root cause analysis", "six sigma", "lean", "lean manufacturing",
  "kaizen", "iso 9001", "as9100", "asme", "design of experiments", "doe", "tolerance analysis", "project management", "machine learning",
  "3d printing", "additive manufacturing", "sheet metal", "injection molding", "hydraulics", "pneumatics", "mechatronics", "heat transfer",
  "thermodynamics", "strength of materials", "robotics", "automation", "quality assurance", "quality control", "testing", "prototyping",
  "manufacturing", "machining", "welding", "electro-mechanical", "bom", "sow", "mrp", "english", "hebrew",
  // Hebrew
  "ניהול פרויקטים", "תכן מכני", "עבודת צוות", "הנדסת מכונות", "בקרת איכות", "אבטחת איכות", "מעבר חום", "חוזק חומרים", "עיבוד שבבי",
  "הזרקת פלסטיק", "רובוטיקה", "אוטומציה", "מכטרוניקה", "הידראוליקה", "פנאומטיקה", "תרמודינמיקה", "שרטוט", "תכן", "אלקטרו-מכני",
  "אלקטרומכני", "ייצור", "אב טיפוס", "ניתוח חוזק", "אלמנטים סופיים", "ראייה מערכתית", "סימולציות",
];

type KnownEntry = { words: string[][]; label: string };
const KNOWN_WORDS = new Set<string>();
const PHRASES: KnownEntry[] = [];
for (const k of KNOWN) {
  const toks = tokenize(k);
  if (toks.length === 1) toks[0].keys.forEach((key) => KNOWN_WORDS.add(key));
  else PHRASES.push({ label: k, words: toks.map((t) => t.keys) });
}

function isStop(t: Token): boolean {
  if (!t.hebrew) return STOP_EN.has(t.text.toLowerCase());
  return stripPrefixes(normalizeHebrew(t.text)).some((f) => STOP_HE.has(f));
}

function usable(t: Token): boolean {
  if (/^[\d.,/:-]+$/.test(t.text)) return false; // bare numbers
  if (t.hebrew) return normalizeHebrew(t.text).length >= 2;
  return t.text.length >= 2 || /[+#]/.test(t.text);
}

function shares(a: string[], b: Set<string>): boolean {
  return a.some((k) => b.has(k));
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type Keyword = {
  id: string;
  /** As written in the ad (the shortest form seen, so usually without a prefix). */
  label: string;
  matched: boolean;
  /** Occurrences in the ad. */
  count: number;
  /** A known tool, method or phrase. */
  known: boolean;
};

export type HighlightRange = { start: number; end: number; keywordId: string; matched: boolean };

export type MatchResult = {
  keywords: Keyword[];
  /** 0–100, known skills count double. */
  score: number;
  ranges: HighlightRange[];
};

/** All keys present in a text (for the CV side). */
export function keySet(text: string): Set<string> {
  const set = new Set<string>();
  for (const t of tokenize(text)) for (const k of t.keys) set.add(k);
  return set;
}

/**
 * Extracts the most relevant keywords from a job ad and checks each one
 * against the CV text. Returns up to `limit` keywords, known skills and
 * frequent words first, plus highlight ranges for the ad text.
 */
export function matchKeywords(jobAd: string, cvText: string, limit = 30): MatchResult {
  const tokens = tokenize(jobAd);
  const cvTokens = tokenize(cvText);
  const cv = new Set(cvTokens.flatMap((t) => t.keys));
  // For labels: how the CV spells a word (shortest form), by key.
  const cvSpelling = new Map<string, string>();
  for (const t of cvTokens) for (const k of t.keys) if (!cvSpelling.has(k) || t.text.length < cvSpelling.get(k)!.length) cvSpelling.set(k, t.text);
  type Group = { id: string; keys: Set<string>; occurrences: Array<{ start: number; end: number; text: string }>; known: boolean; phrase: boolean; matched: boolean };
  const groups: Group[] = [];
  const byKey = new Map<string, Group>();
  const used = new Set<number>(); // token indexes consumed by phrases

  // 1. Known phrases ("project management", "ניהול פרויקטים")
  for (const p of PHRASES) {
    for (let i = 0; i + p.words.length <= tokens.length; i++) {
      const ok = p.words.every((keys, j) => shares(tokens[i + j].keys, new Set(keys)));
      if (!ok) continue;
      const id = `p:${p.label}`;
      let g = byKey.get(id);
      if (!g) {
        g = { id, keys: new Set(), occurrences: [], known: true, phrase: true, matched: false };
        g.matched = p.words.every((keys) => shares(keys, cv));
        byKey.set(id, g);
        groups.push(g);
      }
      const last = tokens[i + p.words.length - 1];
      g.occurrences.push({ start: tokens[i].start, end: last.end, text: jobAd.slice(tokens[i].start, last.end) });
      for (let j = 0; j < p.words.length; j++) used.add(i + j);
    }
  }

  // 2. Single words, grouped when they share a stem ("תכנון" / "בתכנון")
  tokens.forEach((t, i) => {
    if (used.has(i) || !usable(t) || isStop(t)) return;
    const groupKeys = t.keys.filter((k) => !t.hebrew || k.length >= MIN_STEM);
    let g = groupKeys.map((k) => byKey.get(k)).find((x) => x && !x.phrase);
    if (!g) {
      g = { id: `w:${groupKeys[0] ?? t.text}`, keys: new Set(), occurrences: [], known: false, phrase: false, matched: false };
      groups.push(g);
    }
    for (const k of groupKeys) {
      g.keys.add(k);
      if (!byKey.has(k)) byKey.set(k, g);
    }
    g.known ||= t.keys.some((k) => KNOWN_WORDS.has(k));
    g.matched ||= shares(t.keys, cv);
    g.occurrences.push({ start: t.start, end: t.end, text: t.text });
  });

  // 3. Rank: known skills first, then technical-looking tokens, then frequency
  const rank = (g: Group) => {
    const sample = g.occurrences[0].text;
    const technical = /[A-Z]{2,}|[+#&]|\d/.test(sample) ? 2 : 0;
    return (g.known ? 10 : 0) + (g.phrase ? 3 : 0) + technical + Math.min(g.occurrences.length, 5);
  };
  const top = groups
    .filter((g) => g.known || g.occurrences.length > 1 || /[A-Za-z]/.test(g.occurrences[0].text) || normalizeHebrew(g.occurrences[0].text).length >= MIN_STEM)
    .sort((a, b) => rank(b) - rank(a) || a.occurrences[0].start - b.occurrences[0].start)
    .slice(0, limit);

  // Hebrew phrases show their dictionary form. A matched Hebrew word shows the shortest spelling found in
  // the ad or the CV, which is usually the one without a glued prefix. Everything else is shown as in the ad.
  const labelFor = (g: Group) => {
    if (g.phrase && HEBREW.test(g.id)) return g.id.slice(2);
    const shortest = g.occurrences.map((o) => o.text).sort((a, b) => a.length - b.length)[0];
    if (g.matched && HEBREW.test(shortest)) {
      // Only a CV spelling that is the ad's word minus a glued prefix ("בתכנון" → "תכנון"), never a
      // different word that happens to share a stem ("מכונות" must not become "מכון").
      const ad = normalizeHebrew(shortest);
      const fromCv = [...g.keys]
        .map((k) => cvSpelling.get(k))
        .filter((x): x is string => !!x && HEBREW.test(x) && stripPrefixes(ad).includes(normalizeHebrew(x)));
      return [shortest, ...fromCv].sort((a, b) => a.length - b.length)[0];
    }
    return shortest;
  };
  const keywords: Keyword[] = top.map((g) => ({
    id: g.id,
    label: labelFor(g),
    matched: g.matched,
    count: g.occurrences.length,
    known: g.known,
  }));
  const weight = (k: Keyword) => (k.known ? 2 : 1);
  const total = keywords.reduce((n, k) => n + weight(k), 0);
  const got = keywords.filter((k) => k.matched).reduce((n, k) => n + weight(k), 0);
  const ranges = top
    .flatMap((g) => g.occurrences.map((o) => ({ start: o.start, end: o.end, keywordId: g.id, matched: g.matched })))
    .sort((a, b) => a.start - b.start);
  return { keywords, score: total ? Math.round((got / total) * 100) : 0, ranges };
}
