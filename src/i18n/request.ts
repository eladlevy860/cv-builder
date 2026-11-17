import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_UI_LOCALE, UI_LOCALE_COOKIE, isUiLocale, type UiLocale } from "./config";

/**
 * The UI locale comes from a cookie (no /he or /en URL prefix). On first
 * visit we fall back to the browser's Accept-Language, then to Hebrew.
 */
async function resolveLocale(): Promise<UiLocale> {
  const fromCookie = (await cookies()).get(UI_LOCALE_COOKIE)?.value;
  if (isUiLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  if (first === "en") return "en";
  if (first === "he" || first === "iw") return "he";
  return DEFAULT_UI_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
