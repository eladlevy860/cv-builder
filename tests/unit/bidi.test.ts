import { describe, expect, it } from "vitest";
import { splitRuns } from "@/core/bidi";

const ltrTokens = (s: string) => splitRuns(s, "rtl").filter((r) => !r.rtl).map((r) => r.text);
const rtlTokens = (s: string) => splitRuns(s, "ltr").filter((r) => r.rtl).map((r) => r.text);

describe("splitRuns (RTL base)", () => {
  it.each([
    ["מהנדס מכונות, SolidWorks 2024, GD&T", ["SolidWorks 2024, GD&T"]],
    ['תכנון עגלות ל-צב"ד, כולל BOM ו-SOW', ["BOM", "SOW"]],
    ["C++, MATLAB, ISO 9001:2015", ["C++, MATLAB, ISO 9001:2015"]],
    ["הדרכה במעבדה (2023–2025)", ["(2023–2025)"]],
    ["05/2025 – היום", ["05/2025"]],
    ["שולט ב-SolidWorks 2024 וב-MATLAB, ומחפש", ["SolidWorks 2024", "MATLAB"]],
    ["הפחתת משקל ב-12%", ["12%"]],
    ["שפות: C#, C++.", ["C#, C++"]],
    ["טלפון +972-52-123-4567 בכל שעה", ["+972-52-123-4567"]],
    ["פרויקט (SolidWorks) גמר", ["(SolidWorks)"]],
    ["תואר (B.Sc. בהנדסה)", ["B.Sc"]],
    ["רק עברית כאן", []],
  ])("%s", (input, expected) => {
    expect(ltrTokens(input)).toEqual(expected);
  });

  it("concatenating the runs gives back the original text", () => {
    const s = 'תכנון עגלות ל-צב"ד, כולל BOM ו-SOW (2023–2025) C++';
    expect(splitRuns(s, "rtl").map((r) => r.text).join("")).toBe(s);
    expect(splitRuns(s, "ltr").map((r) => r.text).join("")).toBe(s);
  });
});

describe("splitRuns (LTR base)", () => {
  it("isolates Hebrew phrases inside English text", () => {
    expect(rtlTokens("Served in חיל האוויר, 2018–2021")).toEqual(["חיל האוויר"]);
    expect(rtlTokens('Worked at צב"ד lab')).toEqual(['צב"ד']);
    expect(rtlTokens("Only English")).toEqual([]);
  });
});
