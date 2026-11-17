import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FileTextIcon } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function AppHeader() {
  const t = await getTranslations();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FileTextIcon className="size-4" aria-hidden />
          </span>
          <span>{t("app.name")}</span>
        </Link>
        <NavLinks />
        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
