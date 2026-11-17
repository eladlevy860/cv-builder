import type { Theme } from "@/core/model/schema";

export type FitPatch = Pick<Theme, "sectionSpacing" | "lineHeight" | "pageMargins" | "baseFontSize">;

/** Never go below these when fitting automatically. */
export const FIT_FLOORS: FitPatch = { sectionSpacing: 2, lineHeight: 1.2, pageMargins: 8, baseFontSize: 9 };

/** Progressively tighter steps: spacing first, then line height and margins, font size last. */
const STEPS = [
  { gap: 0.85, lh: 0, margin: 0, font: 0 },
  { gap: 0.7, lh: -0.05, margin: 0, font: 0 },
  { gap: 0.6, lh: -0.08, margin: -2, font: 0 },
  { gap: 0.55, lh: -0.1, margin: -3, font: -0.5 },
  { gap: 0.5, lh: -0.12, margin: -4, font: -0.5 },
  { gap: 0.45, lh: -0.15, margin: -5, font: -1 },
];

const round = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Candidate design tweaks for "fit on fewer pages", tightest last. Values
 * already below a floor are left alone; duplicates and no-op candidates are
 * dropped.
 */
export function fitCandidates(theme: FitPatch): FitPatch[] {
  const lower = (cur: number, next: number, floor: number) => (cur <= floor ? cur : Math.max(floor, next));
  const out: FitPatch[] = [];
  const seen = new Set<string>([JSON.stringify(pick(theme))]);
  for (const s of STEPS) {
    const c: FitPatch = {
      sectionSpacing: lower(theme.sectionSpacing, round(theme.sectionSpacing * s.gap, 0.5), FIT_FLOORS.sectionSpacing),
      lineHeight: lower(theme.lineHeight, Math.round((theme.lineHeight + s.lh) * 100) / 100, FIT_FLOORS.lineHeight),
      pageMargins: lower(theme.pageMargins, theme.pageMargins + s.margin, FIT_FLOORS.pageMargins),
      baseFontSize: lower(theme.baseFontSize, round(theme.baseFontSize + s.font, 0.5), FIT_FLOORS.baseFontSize),
    };
    const key = JSON.stringify(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function pick(t: FitPatch): FitPatch {
  return { sectionSpacing: t.sectionSpacing, lineHeight: t.lineHeight, pageMargins: t.pageMargins, baseFontSize: t.baseFontSize };
}
