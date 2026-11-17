"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArchiveIcon, FilePlus2Icon, KanbanSquareIcon, MailIcon, PlusIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@/core/model/schema";
import { useDocuments } from "@/lib/use-documents";
import { cn } from "@/lib/utils";
import { docActions } from "./actions";
import { CreateCvDialog } from "./create-cv-dialog";
import { DocumentCard } from "./document-card";
import { ImportDialog } from "./import-dialog";

type LangFilter = "all" | Language;

export function Dashboard() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const state = useDocuments();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<LangFilter>("all");
  const [highlight, setHighlight] = useState<string | null>(null);

  // `/dashboard?new=1` (from the landing page) opens the create dialog.
  useEffect(() => {
    if (params.get("new") === "1") {
      queueMicrotask(() => setCreateOpen(true));
      router.replace("/dashboard", { scroll: false });
    }
  }, [params, router]);

  const cvs = useMemo(
    () => state.docs.filter((d) => d.type === "cv" && (filter === "all" || d.language === filter)),
    [state.docs, filter],
  );
  const letters = useMemo(() => state.docs.filter((d) => d.type === "coverLetter"), [state.docs]);

  useEffect(() => {
    if (!highlight) return;
    document.querySelector(`[data-doc-id="${highlight}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const id = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(id);
  }, [highlight, state.docs]);

  async function backup() {
    try {
      await docActions.downloadBackup();
      toast.success(t("dashboard.backupDone"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="me-auto">
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground" data-testid="doc-count">
            {state.status === "loading" ? t("common.loading") : t("dashboard.count", { count: state.docs.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={backup} disabled={state.docs.length === 0} data-testid="backup-btn">
            <ArchiveIcon />
            {t("dashboard.backup")}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} data-testid="import-btn">
            <UploadIcon />
            {t("dashboard.import")}
          </Button>
          <Button onClick={() => setCreateOpen(true)} data-testid="new-cv">
            <PlusIcon />
            {t("dashboard.newCv")}
          </Button>
        </div>
      </div>

      {state.status === "error" && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {t("dashboard.storageError")}
        </p>
      )}

      <Tabs defaultValue="cvs" className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="cvs">
              <FilePlus2Icon />
              {t("dashboard.tabCvs")}
            </TabsTrigger>
            <TabsTrigger value="letters">
              <MailIcon />
              {t("dashboard.tabLetters")}
            </TabsTrigger>
            <TabsTrigger value="tracker">
              <KanbanSquareIcon />
              {t("dashboard.tabTracker")}
            </TabsTrigger>
          </TabsList>
          <div role="group" aria-label={t("dashboard.filterLabel")} className="ms-auto flex gap-1 rounded-lg border bg-card p-1">
            {(["all", "he", "en"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
                className={cn(
                  "rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  filter === f && "bg-secondary font-medium text-foreground",
                )}
              >
                {f === "all" ? t("dashboard.filterAll") : f === "he" ? t("common.langBadgeHe") : t("common.langBadgeEn")}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="cvs">
          {state.status !== "loading" && cvs.length === 0 ? (
            <EmptyState
              title={t("dashboard.emptyTitle")}
              body={t("dashboard.emptyBody")}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusIcon />
                  {t("dashboard.newCv")}
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="doc-grid">
              {cvs.map((doc) => (
                <li key={doc.id} className={cn("rounded-xl transition-shadow", highlight === doc.id && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                  <DocumentCard doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="letters">
          {letters.length === 0 ? (
            <EmptyState title={t("dashboard.emptyLettersTitle")} body={t("dashboard.emptyLettersBody")} />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {letters.map((doc) => (
                <li key={doc.id}>
                  <DocumentCard doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="tracker">
          <EmptyState title={t("dashboard.trackerTitle")} body={t("dashboard.trackerBody")} />
        </TabsContent>
      </Tabs>

      <CreateCvDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setHighlight} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
