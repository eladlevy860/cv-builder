import type { CSSProperties } from "react";
import { FONTS } from "@/core/model/fonts";
import type { Theme } from "@/core/model/schema";

export const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
} as const;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Black or white, whichever reads better on the accent color. */
export function onAccent(hex: string): string {
  const l = luminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastWhite >= Math.min(contrastBlack, 4.5) ? "#ffffff" : "#111827";
}

export function themeStyle(theme: Theme): CSSProperties {
  const size = PAGE_SIZES[theme.pageSize];
  return {
    "--cv-accent": theme.accentColor,
    "--cv-on-accent": onAccent(theme.accentColor),
    "--cv-font-body": FONTS[theme.fontBody].stack,
    "--cv-font-heading": FONTS[theme.fontHeading].stack,
    "--cv-fs": `${theme.baseFontSize}pt`,
    "--cv-lh": String(theme.lineHeight),
    "--cv-gap": `${theme.sectionSpacing}mm`,
    "--cv-margin": `${theme.pageMargins}mm`,
    "--cv-page-w": `${size.width}mm`,
    "--cv-page-h": `${size.height}mm`,
  } as CSSProperties;
}
