import { describe, expect, it } from "vitest";
import { classifyContact, detectDir, formatIsraeliPhone, splitBidiRuns } from "@/core/bidi";
import { formatDateRange, formatYearMonth } from "@/core/i18n-doc/dates";

describe("dates", () => {
  it("formats year/month in each format", () => {
    expect(formatYearMonth({ year: 2025, month: 5 }, "he", "MM/YYYY")).toBe("05/2025");
    expect(formatYearMonth({ year: 2025, month: 5 }, "en", "MMM YYYY")).toBe("May 2025");
    expect(formatYearMonth({ year: 2025, month: 9 }, "he", "MMMM YYYY")).toBe("ספטמבר 2025");
    expect(formatYearMonth({ year: 2025 }, "en", "MM/YYYY")).toBe("2025");
    expect(formatYearMonth(null, "en", "MM/YYYY")).toBe("");
  });

  it("uses היום / כיום / Present for ongoing ranges", () => {
    const r = { start: { year: 2025, month: 5 }, end: null, present: true };
    expect(formatDateRange(r, "he", "MM/YYYY").text).toBe("05/2025 – היום");
    expect(formatDateRange(r, "he", "MM/YYYY", "כיום").text).toBe("05/2025 – כיום");
    expect(formatDateRange(r, "en", "MMM YYYY").text).toBe("May 2025 – Present");
  });

  it("collapses equal or missing ends", () => {
    expect(formatDateRange({ start: { year: 2024 }, end: { year: 2024 }, present: false }, "en", "YYYY").text).toBe("2024");
    expect(formatDateRange({ start: null, end: { year: 2024 }, present: false }, "en", "YYYY").text).toBe("2024");
  });
});

describe("Israeli phone formatting", () => {
  it.each([
    ["0521234567", "052-1234567"],
    ["052 123 4567", "052-1234567"],
    ["052-1234567", "052-1234567"],
    ["+972521234567", "+972-52-123-4567"],
    ["00972521234567", "+972-52-123-4567"],
    ["+972-3-1234567", "+972-3-123-4567"],
    ["031234567", "03-1234567"],
    ["0771234567", "077-1234567"],
    ["1800123456", "1-800-123-456"],
    ["+1 415 555 0100", "+1 415 555 0100"],
    ["", ""],
  ])("%s → %s", (input, out) => {
    expect(formatIsraeliPhone(input)).toBe(out);
  });
});

describe("bidi helpers", () => {
  it("classifies contact values", () => {
    expect(classifyContact("elad@example.com")).toBe("email");
    expect(classifyContact("052-1234567")).toBe("phone");
    expect(classifyContact("linkedin.com/in/example")).toBe("url");
    expect(classifyContact("חיפה")).toBe("text");
  });

  it("detects direction from the first strong character", () => {
    expect(detectDir("מהנדס מכונות, SolidWorks")).toBe("rtl");
    expect(detectDir("2024 SolidWorks מהנדס")).toBe("ltr");
    expect(detectDir("2024")).toBe(null);
  });

  it("splits mixed text into RTL text and intact LTR tokens", () => {
    const runs = splitBidiRuns("מהנדס מכונות, SolidWorks 2024, GD&T");
    expect(runs).toEqual([
      { text: "מהנדס מכונות, ", rtl: true },
      { text: "SolidWorks 2024, GD&T", rtl: false },
    ]);
    const runs2 = splitBidiRuns('תכנון עגלות ל-צב"ד, כולל BOM ו-SOW');
    expect(runs2.filter((r) => !r.rtl).map((r) => r.text)).toEqual(["BOM", "SOW"]);
    const runs3 = splitBidiRuns("C++, MATLAB, ISO 9001:2015");
    expect(runs3).toEqual([{ text: "C++, MATLAB, ISO 9001:2015", rtl: false }]);
  });
});
