"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  CheckIcon,
  CloudOffIcon,
  DownloadIcon,
  FileJsonIcon,
  FileTextIcon,
  FileTypeIcon,
  LanguagesIcon,
  LayoutTemplateIcon,
  LoaderIcon,
  PaletteIcon,
  PrinterIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { docActions } from "@/features/dashboard/actions";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "./store";
import { HistoryDialog } from "./history-dialog";
import { otherLanguage } from "@/core/model/operations";
import { useExport } from "@/features/export/use-export";

function SaveStatus() {
  const t = useTranslations("editor.status");
  const status = useEditorStore((s) => s.saveStatus);
  const icon =
    status === "saved" ? (
      <CheckIcon className="size-3.5" />
    ) : status === "saving" ? (
      <LoaderIcon className="size-3.5 animate-spin" />
    ) : status === "error" ? (
      <CloudOffIcon className="size-3.5" />
    ) : (
      <span className="size-2 rounded-full bg-amber-500" />
    );
  return (
    <span
      className={cn("hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex", status === "error" && "text-destructive")}
      role="status"
      aria-live="polite"
      data-testid="save-status"
      data-status={status}
    >
      {icon}
      {t(status)}
    </span>
  );
}

export function EditorTopbar({
  flush,
  designOpen,
  onDesign,
  onTemplates,
}: {
  flush: () => Promise<void>;
  designOpen: boolean;
  onDesign: () => void;
  onTemplates: () => void;
}) {
  const t = useTranslations("editor");
  const exporter = useExport();
  const title = useEditorStore((s) => s.doc!.title);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const docLanguage = useEditorStore((s) => s.doc!.language);
  const tc = useTranslations("common");
  const router = useRouter();
  const target = otherLanguage(docLanguage);
  const targetName = target === "he" ? tc("hebrew") : tc("english");

  async function cloneToOther() {
    await flush();
    const copy = await docActions.cloneToOtherLanguage(useEditorStore.getState().doc!);
    toast.success(t("cloneHint", { language: targetName }));
    router.push(`/editor/${copy.id}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
      <Button asChild variant="ghost" size="icon-sm" aria-label={t("back")} title={t("back")}>
        <Link href="/dashboard">
          <ArrowLeftIcon className="rtl:-scale-x-100" />
        </Link>
      </Button>
      <label className="sr-only" htmlFor="doc-title">
        {t("titleLabel")}
      </label>
      <Input
        id="doc-title"
        value={title}
        onChange={(e) => editorActions.update((d) => void (d.title = e.target.value), { coalesce: "title" })}
        className="h-8 w-44 border-transparent bg-transparent font-medium shadow-none hover:border-input focus-visible:border-ring sm:w-64"
        data-testid="doc-title-input"
      />
      <SaveStatus />
      <div className="ms-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={editorActions.undo} disabled={!canUndo} aria-label={t("undo")} title={`${t("undo")} (Ctrl+Z)`} data-testid="undo">
          <Undo2Icon className="rtl:-scale-x-100" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={editorActions.redo} disabled={!canRedo} aria-label={t("redo")} title={`${t("redo")} (Ctrl+Shift+Z)`} data-testid="redo">
          <Redo2Icon className="rtl:-scale-x-100" />
        </Button>
        <HistoryDialog />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void cloneToOther()}
          title={t("cloneHint", { language: targetName })}
          data-testid="clone-language"
        >
          <LanguagesIcon />
          <span className="hidden xl:inline">{t("cloneTo", { language: targetName })}</span>
          <span className="sr-only xl:hidden">{t("cloneTo", { language: targetName })}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onTemplates} data-testid="template-menu">
          <LayoutTemplateIcon />
          <span className="hidden md:inline">{t("template")}</span>
        </Button>
        <Button
          variant={designOpen ? "secondary" : "outline"}
          size="sm"
          onClick={onDesign}
          aria-pressed={designOpen}
          data-testid="design-button"
        >
          <PaletteIcon />
          <span className="hidden md:inline">{t("design")}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" data-testid="download-menu">
              <DownloadIcon />
              <span className="hidden md:inline">{t("download")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => void flush().then(() => exporter.pdf(useEditorStore.getState().doc!))} data-testid="download-pdf">
              <FileTextIcon />
              {t("downloadPdf")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exporter.docx(useEditorStore.getState().doc!)} data-testid="download-docx">
              <FileTypeIcon />
              <span className="grid">
                <span>{t("downloadDocx")}</span>
                <span className="text-xs text-muted-foreground">{t("docxHint")}</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exporter.print(useEditorStore.getState().doc!, flush)} data-testid="print">
              <PrinterIcon />
              <span className="flex-1">{t("print")}</span>
              <span className="text-xs text-muted-foreground">Ctrl+P</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void docActions.downloadJson(useEditorStore.getState().doc!)}>
              <FileJsonIcon />
              {t("downloadJson")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
