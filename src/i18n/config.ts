export const UI_LOCALES = ["he", "en"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
export const DEFAULT_UI_LOCALE: UiLocale = "he";
export const UI_LOCALE_COOKIE = "ui-locale";

export function isUiLocale(v: unknown): v is UiLocale {
  return typeof v === "string" && (UI_LOCALES as readonly string[]).includes(v);
}

export function localeDir(locale: UiLocale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}
