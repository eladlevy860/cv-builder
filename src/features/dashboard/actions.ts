"use client";

import { buildBackup, buildDocumentExport } from "@/core/export/backup";
import { duplicateDocument, cloneToOtherLanguage } from "@/core/model/operations";
import type { AnyDocument, Language } from "@/core/model/schema";
import { getStorage } from "@/core/storage";
import { dateStamp, downloadJson, safeFilename } from "@/lib/download";

/** Document-level actions shared by the dashboard (and later the editor). */
export const docActions = {
  async duplicate(doc: AnyDocument, uiLang: Language) {
    const copy = duplicateDocument(doc, uiLang);
    await getStorage().putDocument(copy);
    return copy;
  },

  async cloneToOtherLanguage(doc: AnyDocument) {
    const copy = cloneToOtherLanguage(doc);
    await getStorage().putDocument(copy);
    return copy;
  },

  async rename(doc: AnyDocument, title: string) {
    await getStorage().putDocument({ ...doc, title, updatedAt: new Date().toISOString() });
  },

  async remove(doc: AnyDocument) {
    await getStorage().deleteDocument(doc.id);
  },

  async downloadJson(doc: AnyDocument) {
    const snapshots = await getStorage().listSnapshots(doc.id);
    downloadJson(`${safeFilename(doc.title)}.json`, buildDocumentExport(doc, snapshots));
  },

  async downloadBackup() {
    const backup = await buildBackup(getStorage());
    downloadJson(`cv-builder-backup-${dateStamp()}.json`, backup);
  },
};
