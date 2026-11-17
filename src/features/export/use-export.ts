"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AnyDocument } from "@/core/model/schema";
import { downloadDocx, downloadPdf, openPrintView, PdfServerUnavailable } from "./export";

/** Export actions with localized progress/error toasts. */
export function useExport() {
  const t = useTranslations("editor");

  async function print(doc: AnyDocument, beforeOpen?: () => Promise<unknown>) {
    const ok = await openPrintView(doc.id, beforeOpen);
    if (!ok) toast.error(t("printBlocked"));
  }

  async function pdf(doc: AnyDocument) {
    if (doc.type !== "cv") return;
    const id = toast.loading(t("pdfPreparing"));
    try {
      await downloadPdf(doc);
      toast.success(t("pdfReady"), { id });
    } catch (e) {
      if (e instanceof PdfServerUnavailable) {
        // Opening a window needs a user gesture, so offer a button.
        toast.info(t("pdfFallback"), { id, duration: 12000, action: { label: t("print"), onClick: () => void print(doc) } });
      } else {
        toast.error(t("pdfFailed", { message: (e as Error).message }), { id });
      }
    }
  }

  async function docx(doc: AnyDocument) {
    if (doc.type !== "cv") return;
    try {
      await downloadDocx(doc);
      toast.success(t("docxReady"), { description: t("docxHint") });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return { pdf, docx, print };
}
