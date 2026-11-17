"use client";

import type { CvDocument } from "@/core/model/schema";
import { downloadBlob, safeFilename } from "@/lib/download";

export class PdfServerUnavailable extends Error {}

/** Server-side PDF via headless Chromium (identical to the preview). */
export async function downloadPdf(doc: CvDocument): Promise<void> {
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document: doc }),
  });
  if (res.status === 503 || res.status === 404) {
    const info = await res.json().catch(() => ({ message: "" }));
    throw new PdfServerUnavailable(info.message ?? "");
  }
  if (!res.ok) {
    const info = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(info.message || res.statusText);
  }
  downloadBlob(`${safeFilename(doc.title, "cv")}.pdf`, await res.blob());
}

/** Word export, generated in the browser. The docx library is loaded on demand. */
export async function downloadDocx(doc: CvDocument): Promise<void> {
  const { docxToBlob } = await import("@/core/export/docx");
  downloadBlob(`${safeFilename(doc.title, "cv")}.docx`, await docxToBlob(doc));
}

/**
 * Print / Save as PDF with the browser's own dialog. Opens the bare render
 * page in a new tab; `beforeOpen` (e.g. flushing autosave) runs after the
 * tab is opened synchronously, so popup blockers don't interfere.
 */
export async function openPrintView(docId: string, beforeOpen?: () => Promise<unknown>): Promise<boolean> {
  const win = window.open("about:blank", "_blank");
  if (!win) return false;
  try {
    await beforeOpen?.();
  } finally {
    win.location.href = `/render?id=${encodeURIComponent(docId)}&print=1`;
  }
  return true;
}
