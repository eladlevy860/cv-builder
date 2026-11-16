"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { migrateDocument } from "@/core/migrations";
import type { CvDocument } from "@/core/model/schema";
import { createSampleCv } from "@/core/samples";
import { applyTemplate } from "@/templates/apply";
import { PagedDocument } from "@/templates/paginator";
import { PAGE_SIZES } from "@/templates/theme-vars";

declare global {
  interface Window {
    __CV_DOC__?: unknown;
    __RENDER_DONE__?: boolean;
    __RENDER_PAGES__?: number;
  }
}

function readDoc(): CvDocument | null {
  if (typeof window === "undefined") return null;
  if (window.__CV_DOC__) {
    const doc = migrateDocument(window.__CV_DOC__);
    return doc.type === "cv" ? doc : null;
  }
  const params = new URLSearchParams(window.location.search);
  const sample = params.get("sample");
  if (sample === "he" || sample === "en") {
    const doc = createSampleCv(sample);
    applyTemplate(doc, params.get("template") ?? "classic", true);
    return doc;
  }
  return null;
}

let cached: { doc: CvDocument | null } | null = null;
const subscribe = () => () => {};
const getSnapshot = () => (cached ??= { doc: readDoc() });
const getServerSnapshot = () => null;

export function RenderView() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [pages, setPages] = useState(0);
  const onReady = useCallback(() => {
    window.__RENDER_DONE__ = true;
  }, []);
  const onPageCount = useCallback((n: number) => {
    window.__RENDER_PAGES__ = n;
    setPages(n);
  }, []);

  if (!state) return null;
  if (!state.doc) return <p style={{ padding: 24 }}>No document.</p>;
  const size = PAGE_SIZES[state.doc.theme.pageSize];
  return (
    <div className="render-root" data-pages={pages}>
      {/* @page must match the document's page size so Chromium prints 1:1. */}
      <style>{`@page { size: ${size.width}mm ${size.height}mm; margin: 0; } html, body { background: #fff; margin: 0; } .render-root .cv-pages { gap: 0; }`}</style>
      <PagedDocument doc={state.doc} onPageCount={onPageCount} onReady={onReady} />
    </div>
  );
}
