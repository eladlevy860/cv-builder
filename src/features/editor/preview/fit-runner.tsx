"use client";

import { useCallback, useMemo, useRef } from "react";
import type { CvDocument } from "@/core/model/schema";
import type { FitPatch } from "@/templates/fit";
import { PagedDocument, type LayoutStats } from "@/templates/paginator";

/**
 * Renders one candidate off-screen with the real renderer and reports its
 * page count. Mounted with a new `key` per candidate.
 */
export function FitProbe({ doc, patch, onResult }: { doc: CvDocument; patch: FitPatch; onResult: (pages: number) => void }) {
  const stats = useRef<LayoutStats | null>(null);
  const candidate = useMemo<CvDocument>(() => ({ ...doc, theme: { ...doc.theme, ...patch } }), [doc, patch]);
  const onStats = useCallback((s: LayoutStats) => void (stats.current = s), []);
  const done = useRef(false);
  const onReady = useCallback(() => {
    if (done.current || !stats.current) return;
    done.current = true;
    onResult(stats.current.pages);
  }, [onResult]);
  return (
    <div aria-hidden inert style={{ position: "fixed", left: -20000, top: 0, visibility: "hidden", pointerEvents: "none" }}>
      <PagedDocument doc={candidate} onStats={onStats} onReady={onReady} />
    </div>
  );
}
