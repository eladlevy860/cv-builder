import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/shell/providers";
import { localeDir } from "@/i18n/config";
import "./fonts";
import "./globals.css";
import "@/templates/styles.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: { default: t("name"), template: `%s · ${t("name")}` }, description: t("tagline") };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dir = localeDir(locale);
  return (
    <html lang={locale} dir={dir} className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers dir={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
