"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUiLocale } from "@/i18n/actions";

export function LocaleSwitcher() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (next === locale) return;
    startTransition(async () => {
      await setUiLocale(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("uiLanguage")} disabled={pending} data-testid="locale-switcher">
          <LanguagesIcon />
          <span>{locale === "he" ? "עברית" : "English"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("uiLanguage")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={change}>
          {/* Each language name is written in its own language and script. */}
          <DropdownMenuRadioItem value="he" lang="he" dir="rtl">
            עברית
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en" lang="en" dir="ltr">
            English
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
