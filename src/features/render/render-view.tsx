"use client";

import { useCallback, useEffect, useState } from "react";
import { migrateDocument } from "@/core/migrations";
import type { CvDocument } from "@/core/model/schema";
import { createSampleCv } from "@/core/samples";
import { getStorage } from "@/core/storage";
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

/**
 * Where the document comes from:
 * - `window.__CV_DOC__` — injected by the Chromium PDF renderer;
 * - `?id=<docId>` — read from this browser's storage (print fallback);
 * - `?sample=he|en&template=<id>` — sample data (visual tests).
 */
async function loadDoc(): Promise<CvDocument | null> {
  if (window.__CV_DOC__) {
    const doc = migrateDocument(window.__CV_DOC__);
    return doc.type === "cv" ? doc : null;
  }
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    const doc = await getStorage().getDocument(id);
    return doc?.type === "cv" ? doc : null;
  }
  const sample = params.get("sample");
  if (sample === "he" || sample === "en") {
    const doc = createSampleCv(sample);
    applyTemplate(doc, params.get("template") ?? "classic", true);
    return doc;
  }
  return null;
}

export function RenderView() {
  const [state, setState] = useState<{ doc: CvDocument | null } | null>(null);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    loadDoc().then(
      (doc) => setState({ doc }),
      () => setState({ doc: null }),
    );
  }, []);

  useEffect(() => {
    if (state?.doc) document.title = state.doc.basics.name.trim() || state.doc.title;
  }, [state]);

  const onReady = useCallback(() => {
    if (window.__RENDER_DONE__) return;
    window.__RENDER_DONE__ = true;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      // Let the browser paint the final layout before opening the dialog.
      requestAnimationFrame(() => setTimeout(() => window.print(), 50));
    }
  }, []);
  const onPageCount = useCallback((n: number) => {
    window.__RENDER_PAGES__ = n;
    setPages(n);
  }, []);

  if (!state) return null;
  if (!state.doc) return <p style={{ padding: 24 }}>Document not found.</p>;
  const size = PAGE_SIZES[state.doc.theme.pageSize];
  return (
    <div className="render-root" data-pages={pages}>
      {/* @page must match the document's page size so printing is 1:1. */}
      <style>{`@page { size: ${size.width}mm ${size.height}mm; margin: 0; }
html, body { background: #fff !important; margin: 0; }
.render-root .cv-pages { gap: 0; }
@media screen { .render-root { background: #e5e7eb; min-height: 100vh; padding: 16px 0; } .render-root .cv-pages { gap: 16px; } }`}</style>
      <PagedDocument doc={state.doc} onPageCount={onPageCount} onReady={onReady} />
    </div>
  );
}
