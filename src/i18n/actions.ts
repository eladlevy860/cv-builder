"use server";

import { cookies } from "next/headers";
import { UI_LOCALE_COOKIE, isUiLocale } from "./config";

export async function setUiLocale(locale: string) {
  if (!isUiLocale(locale)) return;
  (await cookies()).set(UI_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
