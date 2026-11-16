"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStorage } from "@/core/storage";
import { cn } from "@/lib/utils";
import { FormPanel } from "./form/form-panel";
import { PreviewPanel } from "./preview/preview-panel";
import { editorActions, useEditorStore } from "./store";
import { EditorTopbar } from "./topbar";
import { saveSnapshot, useAutosave } from "./use-autosave";

type LoadState = "loading" | "ready" | "missing" | "letter";

export function EditorLoader({ id }: { id: string }) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let alive = true;
    getStorage()
      .getDocument(id)
      .then((doc) => {
        if (!alive) return;
        if (!doc) return setState("missing");
        if (doc.type !== "cv") return setState("letter");
        useEditorStore.getState().load(doc);
        setState("ready");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === "loading") return <p className="p-8 text-muted-foreground">{tc("loading")}</p>;
  if (state !== "ready") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 px-6 py-16">
        <h1 className="text-xl font-semibold">{state === "missing" ? t("notFound") : t("letterSoonTitle")}</h1>
        <p className="text-muted-foreground">{state === "missing" ? t("notFoundBody") : t("letterSoonBody")}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeftIcon className="rtl:-scale-x-100" />
            {t("backToDashboard")}
          </Link>
        </Button>
      </div>
    );
  }
  return <Editor />;
}

function useShortcuts(flush: () => Promise<void>) {
  const t = useTranslations("editor");
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        editorActions.undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        editorActions.redo();
      } else if (key === "s") {
        e.preventDefault();
        void flush().then(async () => {
          await saveSnapshot(null, false);
          toast.success(t("versionSaved"));
        });
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [flush, t]);
}

function Editor() {
  const t = useTranslations("editor");
  const flush = useAutosave();
  useShortcuts(flush);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col" data-testid="editor">
      <EditorTopbar />
      <div role="tablist" aria-label={t("tabEdit")} className="flex border-b lg:hidden">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 py-2 text-sm font-medium text-muted-foreground",
              tab === k && "border-b-2 border-primary text-foreground",
            )}
          >
            {k === "edit" ? t("tabEdit") : t("tabPreview")}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(400px,540px)_minmax(0,1fr)]">
        <section
          aria-label={t("formRegion")}
          className={cn("min-h-0 overflow-y-auto border-e bg-background", tab !== "edit" && "hidden lg:block")}
          data-testid="form-panel"
        >
          <FormPanel />
        </section>
        <section aria-label={t("previewRegion")} className={cn("min-h-0 min-w-0", tab !== "preview" && "hidden lg:block")}>
          <PreviewPanel onJump={() => setTab("edit")} />
        </section>
      </div>
    </div>
  );
}
