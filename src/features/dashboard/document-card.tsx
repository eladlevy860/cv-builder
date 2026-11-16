"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  FileJsonIcon,
  FileTextIcon,
  FileTypeIcon,
  LanguagesIcon,
  PencilIcon,
  SquareArrowOutUpRightIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { otherLanguage } from "@/core/model/operations";
import type { AnyDocument } from "@/core/model/schema";
import { getTemplateMeta } from "@/templates/meta";
import { relativeTime } from "@/lib/relative-time";
import { docActions } from "./actions";
import { DeleteDialog } from "./delete-dialog";
import { DocThumbnail } from "./doc-thumbnail";
import { RenameDialog } from "./rename-dialog";

export function DocumentCard({ doc }: { doc: AnyDocument }) {
  const t = useTranslations();
  const locale = useLocale();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const meta = getTemplateMeta(doc.templateId);
  const href = `/editor/${doc.id}`;
  const title = doc.title || t("card.untitled");
  const when = relativeTime(doc.updatedAt, locale) ?? t("time.justNow");
  const target = otherLanguage(doc.language);
  const targetName = target === "he" ? t("common.hebrew") : t("common.english");

  async function run(fn: () => Promise<unknown>, success?: string) {
    try {
      await fn();
      if (success) toast.success(success);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow focus-within:ring-[3px] focus-within:ring-ring/40 hover:shadow-md"
      data-testid="doc-card"
      data-doc-id={doc.id}
    >
      <Link href={href} className="block bg-muted/60 p-4 outline-none" tabIndex={-1} aria-hidden>
        <DocThumbnail doc={doc} className="rounded-sm shadow-paper" />
      </Link>
      <div className="flex items-start gap-2 border-t p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">
            <Link href={href} className="bidi-plain rounded-sm outline-none after:absolute after:inset-0 after:content-['']" data-testid="doc-title">
              {title}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant={doc.language === "he" ? "secondary" : "outline"} lang={doc.language} data-testid="lang-badge">
              {doc.language === "he" ? t("common.langBadgeHe") : t("common.langBadgeEn")}
            </Badge>
            <span>{meta.name[locale === "he" ? "he" : "en"]}</span>
            <span aria-hidden>·</span>
            <time dateTime={doc.updatedAt}>{t("card.edited", { when })}</time>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative z-10 shrink-0" aria-label={t("card.menu", { title })} data-testid="doc-menu">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={href}>
                <SquareArrowOutUpRightIcon className="rtl:-scale-x-100" />
                {t("card.open")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(() => docActions.duplicate(doc, locale === "he" ? "he" : "en"), t("card.duplicated"))}>
              <CopyIcon />
              {t("card.duplicate")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => run(() => docActions.cloneToOtherLanguage(doc), t("card.cloned", { language: targetName }))}
            >
              <LanguagesIcon />
              {t("card.cloneOther", { language: targetName })}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <PencilIcon />
              {t("card.rename")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <DownloadIcon className="text-muted-foreground" />
                {t("card.download")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled title={t("common.comingSoon")}>
                  <FileTextIcon />
                  {t("card.downloadPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem disabled title={t("common.comingSoon")}>
                  <FileTypeIcon />
                  {t("card.downloadDocx")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run(() => docActions.downloadJson(doc))}>
                  <FileJsonIcon />
                  {t("card.downloadJson")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2Icon className="text-destructive" />
              {t("card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initial={doc.title}
        onSubmit={(v) => run(() => docActions.rename(doc, v), t("card.renamed"))}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={title}
        onConfirm={() => run(() => docActions.remove(doc), t("card.deleted"))}
      />
    </article>
  );
}
