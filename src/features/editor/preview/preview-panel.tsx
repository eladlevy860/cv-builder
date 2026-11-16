"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangleIcon, MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagedDocument } from "@/templates/paginator";
import { PAGE_SIZES } from "@/templates/theme-vars";
import { useEditorStore } from "../store";

const MM_TO_PX = 96 / 25.4;
const ZOOMS = [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];

export function PreviewPanel({ onJump }: { onJump?: () => void }) {
  const t = useTranslations("editor");
  const doc = useEditorStore((s) => s.doc!);
  // Typing stays responsive: the preview renders a deferred copy.
  const deferredDoc = useDeferredValue(doc);
  const [pages, setPages] = useState(1);
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
        {pages > 2 && (
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400" role="status" data-testid="page-warning">
            <AlertTriangleIcon className="size-4" aria-hidden />
            {t("pageWarning")}
          </span>
        )}
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
