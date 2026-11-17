import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/shell/app-header";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("skipToContent")}
      </a>
      <AppHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
