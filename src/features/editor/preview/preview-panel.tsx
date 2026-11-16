"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangleIcon, LoaderIcon, MaximizeIcon, MinusIcon, PlusIcon, ScissorsIcon, ShrinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvDocument } from "@/core/model/schema";
import { fitCandidates, type FitPatch } from "@/templates/fit";
import { PagedDocument, type LayoutStats } from "@/templates/paginator";
import { PAGE_SIZES } from "@/templates/theme-vars";
import { editorActions, useEditorStore } from "../store";
import { FitProbe } from "./fit-runner";

/** A last page filled less than this counts as "only a few lines". */
export const SPARSE_LAST_PAGE = 0.3;

type FitJob = { doc: CvDocument; target: number; candidates: FitPatch[]; index: number };

const MM_TO_PX = 96 / 25.4;
const ZOOMS = [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];

export function PreviewPanel({ onJump }: { onJump?: () => void }) {
  const t = useTranslations("editor");
  const doc = useEditorStore((s) => s.doc!);
  // Typing stays responsive: the preview renders a deferred copy.
  const deferredDoc = useDeferredValue(doc);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState<LayoutStats | null>(null);
  const [fitJob, setFitJob] = useState<FitJob | null>(null);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [fitZoom, setFitZoom] = useState(0.75);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageWidthPx = PAGE_SIZES[doc.theme.pageSize].width * MM_TO_PX;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const available = el.clientWidth - 48;
      setFitZoom(Math.max(0.3, Math.min(1.5, available / pageWidthPx)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx]);

  const effective = zoom === "fit" ? fitZoom : zoom;
  const step = (dir: 1 | -1) => {
    const cur = effective;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.01) : [...ZOOMS].reverse().find((z) => z < cur - 0.01);
    if (next) setZoom(next);
  };

  const onPageCount = useCallback((n: number) => setPages(n), []);

  function startFit(target: number) {
    const current = useEditorStore.getState().doc!;
    const candidates = fitCandidates(current.theme);
    if (!candidates.length) {
      toast.error(t("fitFailed"));
      return;
    }
    setFitJob({ doc: current, target, candidates, index: 0 });
  }

  // The running job is read from a ref so the result handler has no side effects inside a state updater.
  const jobRef = useRef<FitJob | null>(null);
  useEffect(() => {
    jobRef.current = fitJob;
  }, [fitJob]);

  const onFitResult = useCallback(
    (resultPages: number) => {
      const job = jobRef.current;
      if (!job) return;
      const patch = job.candidates[job.index];
      if (resultPages <= job.target) {
        editorActions.update((d) => void Object.assign(d.theme, patch));
        toast.success(t("fitDone", { count: job.target }));
        setFitJob(null);
      } else if (job.index + 1 >= job.candidates.length) {
        toast.error(t("fitFailed"));
        setFitJob(null);
      } else {
        setFitJob({ ...job, index: job.index + 1 });
      }
    },
    [t],
  );

  const sparse = !!stats && stats.pages > 1 && stats.lastPageFill < SPARSE_LAST_PAGE;
  const showWarnings = pages > 2 || sparse || !!stats?.clipped;

  function onClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("a")) e.preventDefault();
    const item = target.closest<HTMLElement>("[data-item-id]");
    const section = target.closest<HTMLElement>("[data-section-id]");
    const sectionId = section?.dataset.sectionId ?? null;
    if (target.closest(".cv-name, .cv-headline, .cv-contacts, .cv-photo, [data-block-key='side:contact']")) {
      useEditorStore.getState().focus("basics", null, true);
      onJump?.();
      return;
    }
    if (sectionId) {
      useEditorStore.getState().focus(sectionId, item?.dataset.itemId ?? null, true);
      onJump?.();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-background/80 px-3 py-2 text-sm">
        <span className="font-medium" data-testid="page-count" aria-live="polite">
          {t("pages", { count: pages })}
        </span>
        <div className="ms-auto flex items-center gap-1" role="group" aria-label={t("zoom")}>
          <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={t("zoomOut")} title={t("zoomOut")}>
            <MinusIcon />
          </Button>
          <span className="w-12 text-center tabular-nums" aria-live="polite">
            {Math.round(effective * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label={t("zoomIn")} title={t("zoomIn")}>
            <PlusIcon />
          </Button>
          <Button
            variant={zoom === "fit" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setZoom("fit")}
            aria-label={t("zoomFit")}
            title={t("zoomFit")}
            aria-pressed={zoom === "fit"}
          >
            <MaximizeIcon />
          </Button>
        </div>
      </div>
      {showWarnings && (
        <div className="grid gap-1.5 border-b bg-amber-50/70 px-3 py-2 text-sm dark:bg-amber-950/30" role="status" data-testid="page-warnings">
          {stats?.clipped && (
            <p className="flex items-start gap-1.5 text-destructive" data-testid="clip-warning">
              <ScissorsIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("clipWarning")}
            </p>
          )}
          {sparse && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-amber-800 dark:text-amber-300" data-testid="sparse-warning">
              <span className="flex items-center gap-1.5">
                <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
                {t("lastPageWarning", { n: pages })}
              </span>
              <Button size="sm" variant="outline" onClick={() => startFit(pages - 1)} disabled={!!fitJob} data-testid="fit-pages">
                {fitJob ? <LoaderIcon className="animate-spin" /> : <ShrinkIcon />}
                {fitJob ? t("fitting") : t("fitTo", { count: pages - 1 })}
              </Button>
            </div>
          )}
          {pages > 2 && !sparse && (
            <p className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300" data-testid="page-warning">
              <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
              {t("pageWarning")}
            </p>
          )}
        </div>
      )}
      {fitJob && (
        <FitProbe
          key={fitJob.index}
          doc={fitJob.doc}
          patch={fitJob.candidates[fitJob.index]}
          onResult={onFitResult}
        />
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-muted/60 px-6 py-6" data-testid="preview-scroll">
        <div
          className="mx-auto w-fit"
          onClick={onClick}
          data-testid="preview"
          title={t("previewHint")}
        >
          <PagedDocument
            doc={deferredDoc}
            onPageCount={onPageCount}
            onStats={setStats}
            renderPage={(page, i, count) => (
              <div className="relative" data-testid="preview-page">
                {/* Zoom is applied per page so the paginator always measures at 100%. */}
                <div className="overflow-hidden rounded-[2px] shadow-paper" style={{ zoom: effective }}>
                  {page}
                </div>
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {t("pageLabel", { n: i + 1, count })}
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
