"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocThumbnail } from "@/features/dashboard/doc-thumbnail";
import { useDocument } from "@/lib/use-documents";
import { getTemplateMeta } from "@/templates/meta";

/** Phase 1 stand-in for the editor: confirms the document loads by id. */
export function EditorPlaceholder({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const state = useDocument(id);

  const back = (
    <Button asChild variant="outline">
      <Link href="/dashboard">
        <ArrowLeftIcon className="rtl:-scale-x-100" />
        {t("editor.backToDashboard")}
      </Link>
    </Button>
  );

  if (state.status === "loading") {
    return <p className="p-8 text-muted-foreground">{t("common.loading")}</p>;
  }
  if (state.status === "missing") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 px-6 py-16">
        <h1 className="text-xl font-semibold">{t("editor.notFound")}</h1>
        <p className="text-muted-foreground">{t("editor.notFoundBody")}</p>
        {back}
      </div>
    );
  }
  const { doc } = state;
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_280px]">
      <div className="flex flex-col items-start gap-3">
        <h1 className="bidi-plain text-2xl font-semibold" data-testid="editor-title">
          {doc.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {doc.language === "he" ? t("common.hebrew") : t("common.english")} · {getTemplateMeta(doc.templateId).name[locale === "he" ? "he" : "en"]}
        </p>
        <div className="mt-4 rounded-xl border bg-card p-5">
          <h2 className="font-medium">{t("editor.placeholderTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("editor.placeholderBody")}</p>
        </div>
        {back}
      </div>
      <DocThumbnail doc={doc} className="rounded-md border shadow-paper" />
    </div>
  );
}
