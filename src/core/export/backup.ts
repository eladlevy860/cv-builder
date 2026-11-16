import { z } from "zod";
import { migrateDocument } from "../migrations";
import { newId } from "../model/factory";
import { SCHEMA_VERSION, applicationSchema, type AnyDocument, type JobApplication, type Snapshot } from "../model/schema";
import type { StorageAdapter } from "../storage/adapter";
import { fromJsonResume, looksLikeJsonResume } from "./json-resume";

export const BACKUP_FORMAT = "cv-builder-backup";
export const DOCUMENT_FORMAT = "cv-builder-document";

export type DocumentExport = {
  format: typeof DOCUMENT_FORMAT;
  exportedAt: string;
  schemaVersion: number;
  document: AnyDocument;
  snapshots?: Snapshot[];
};

export type BackupExport = {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  schemaVersion: number;
  documents: AnyDocument[];
  snapshots: Snapshot[];
  applications: JobApplication[];
};

export function buildDocumentExport(doc: AnyDocument, snapshots?: Snapshot[]): DocumentExport {
  return { format: DOCUMENT_FORMAT, exportedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION, document: doc, snapshots };
}

export async function buildBackup(storage: StorageAdapter): Promise<BackupExport> {
  const documents = await storage.listDocuments();
  const snapshots = (await Promise.all(documents.map((d) => storage.listSnapshots(d.id)))).flat();
  const applications = await storage.listApplications();
  return {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    documents,
    snapshots,
    applications,
  };
}

export type ParsedImport = {
  kind: "backup" | "document" | "jsonResume";
  documents: AnyDocument[];
  snapshots: Snapshot[];
  applications: JobApplication[];
  /** Human-readable problems with individual entries that were skipped. */
  warnings: string[];
};

export class ImportError extends Error {}

const rawSnapshot = z.object({
  id: z.string(),
  docId: z.string(),
  name: z.string().nullable(),
  auto: z.boolean(),
  createdAt: z.string(),
  data: z.unknown(),
});

function parseSnapshots(list: unknown, warnings: string[]): Snapshot[] {
  if (!Array.isArray(list)) return [];
  const out: Snapshot[] = [];
  for (const s of list) {
    const r = rawSnapshot.safeParse(s);
    if (!r.success) {
      warnings.push("Skipped an invalid snapshot");
      continue;
    }
    try {
      out.push({ ...r.data, data: migrateDocument(r.data.data) });
    } catch (e) {
      warnings.push(`Skipped snapshot: ${(e as Error).message}`);
    }
  }
  return out;
}

/** Parses any supported JSON import (backup, single document, JSON Resume). */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("The file is not valid JSON.");
  }
  if (!data || typeof data !== "object") throw new ImportError("Unsupported file.");
  const o = data as Record<string, unknown>;
  const warnings: string[] = [];

  if (o.format === BACKUP_FORMAT) {
    const documents: AnyDocument[] = [];
    for (const d of Array.isArray(o.documents) ? o.documents : []) {
      try {
        documents.push(migrateDocument(d));
      } catch (e) {
        warnings.push((e as Error).message);
      }
    }
    const applications: JobApplication[] = [];
    for (const a of Array.isArray(o.applications) ? o.applications : []) {
      const r = applicationSchema.safeParse(a);
      if (r.success) applications.push(r.data);
      else warnings.push("Skipped an invalid job application");
    }
    return { kind: "backup", documents, snapshots: parseSnapshots(o.snapshots, warnings), applications, warnings };
  }

  if (o.format === DOCUMENT_FORMAT) {
    return {
      kind: "document",
      documents: [migrateDocument(o.document)],
      snapshots: parseSnapshots(o.snapshots, warnings),
      applications: [],
      warnings,
    };
  }

  // A bare document (e.g. copied from the store)
  if (typeof o.schemaVersion === "number" && typeof o.type === "string") {
    return { kind: "document", documents: [migrateDocument(o)], snapshots: [], applications: [], warnings };
  }

  if (looksLikeJsonResume(o)) {
    return { kind: "jsonResume", documents: [fromJsonResume(o)], snapshots: [], applications: [], warnings };
  }

  throw new ImportError("Unrecognised file. Expected a CV Builder backup/document or a JSON Resume file.");
}

export type ImportResult = { added: number; skipped: number; copied: number; applications: number };

/**
 * Writes an import into storage.
 * - "merge": keeps existing data. Identical documents (same id and updatedAt)
 *   are skipped; documents whose id exists with different content are added
 *   as copies with a new id, so nothing is ever overwritten.
 * - "replace": clears everything first (full restore).
 */
export async function applyImport(
  storage: StorageAdapter,
  parsed: ParsedImport,
  mode: "merge" | "replace" = "merge",
): Promise<ImportResult & { ids: string[] }> {
  if (mode === "replace") await storage.clearAll();
  const result = { added: 0, skipped: 0, copied: 0, applications: 0, ids: [] as string[] };
  const idMap = new Map<string, string>();

  for (const doc of parsed.documents) {
    const existing = mode === "merge" ? await storage.getDocument(doc.id) : undefined;
    if (existing && existing.updatedAt === doc.updatedAt) {
      result.skipped++;
      continue;
    }
    if (existing) {
      const id = newId();
      idMap.set(doc.id, id);
      await storage.putDocument({ ...doc, id });
      result.copied++;
      result.ids.push(id);
    } else {
      idMap.set(doc.id, doc.id);
      await storage.putDocument(doc);
      result.added++;
      result.ids.push(doc.id);
    }
  }

  for (const s of parsed.snapshots) {
    const docId = idMap.get(s.docId);
    if (!docId) continue;
    const data = { ...s.data, id: docId };
    await storage.putSnapshot({ ...s, id: docId === s.docId ? s.id : newId(), docId, data });
  }

  const existingApps = new Set((await storage.listApplications()).map((a) => a.id));
  for (const a of parsed.applications) {
    const remap = (id: string | null) => (id ? idMap.get(id) ?? id : null);
    await storage.putApplication({
      ...a,
      id: existingApps.has(a.id) ? newId() : a.id,
      cvId: remap(a.cvId),
      coverLetterId: remap(a.coverLetterId),
    });
    result.applications++;
  }
  return result;
}
