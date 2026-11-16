import Dexie, { liveQuery, type Table } from "dexie";
import { migrateDocument } from "../migrations";
import { applicationSchema, type AnyDocument, type JobApplication, type Snapshot } from "../model/schema";
import type { StorageAdapter, Unsubscribe } from "./adapter";

type StoredDocument = AnyDocument;
type StoredSnapshot = Snapshot;
type StoredSetting = { key: string; value: unknown };

export class CvDatabase extends Dexie {
  documents!: Table<StoredDocument, string>;
  snapshots!: Table<StoredSnapshot, string>;
  applications!: Table<JobApplication, string>;
  settings!: Table<StoredSetting, string>;

  constructor(name = "cv-builder") {
    super(name);
    this.version(1).stores({
      documents: "id, type, language, updatedAt",
      snapshots: "id, docId, createdAt",
      applications: "id, stage, updatedAt",
      settings: "key",
    });
  }
}

/** Migrate on read; skip (and log once) anything unreadable rather than crash the dashboard. */
function safeMigrate(raw: unknown): AnyDocument | undefined {
  try {
    return migrateDocument(raw);
  } catch (err) {
    console.warn("[storage] skipping unreadable document", err);
    return undefined;
  }
}

function byUpdatedDesc(a: { updatedAt: string }, b: { updatedAt: string }) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class DexieStorageAdapter implements StorageAdapter {
  readonly db: CvDatabase;

  constructor(db: CvDatabase = new CvDatabase()) {
    this.db = db;
  }

  private async readAllDocuments(): Promise<AnyDocument[]> {
    const raw = await this.db.documents.toArray();
    return raw.map(safeMigrate).filter((d): d is AnyDocument => !!d).sort(byUpdatedDesc);
  }

  listDocuments() {
    return this.readAllDocuments();
  }

  async getDocument(id: string) {
    const raw = await this.db.documents.get(id);
    return raw ? safeMigrate(raw) : undefined;
  }

  async putDocument(doc: AnyDocument) {
    await this.db.documents.put(migrateDocument(doc));
  }

  async deleteDocument(id: string) {
    await this.db.transaction("rw", this.db.documents, this.db.snapshots, async () => {
      await this.db.documents.delete(id);
      await this.db.snapshots.where("docId").equals(id).delete();
    });
  }

  watchDocuments(cb: (docs: AnyDocument[]) => void): Unsubscribe {
    const sub = liveQuery(() => this.readAllDocuments()).subscribe({
      next: cb,
      error: (e) => console.error("[storage] watchDocuments", e),
    });
    return () => sub.unsubscribe();
  }

  watchDocument(id: string, cb: (doc: AnyDocument | undefined) => void): Unsubscribe {
    const sub = liveQuery(() => this.getDocument(id)).subscribe({
      next: cb,
      error: (e) => console.error("[storage] watchDocument", e),
    });
    return () => sub.unsubscribe();
  }

  async listSnapshots(docId: string) {
    const raw = await this.db.snapshots.where("docId").equals(docId).toArray();
    const out: Snapshot[] = [];
    for (const s of raw) {
      const data = safeMigrate(s.data);
      if (data) out.push({ ...s, data });
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async putSnapshot(snapshot: Snapshot) {
    await this.db.snapshots.put(snapshot);
  }

  async deleteSnapshot(id: string) {
    await this.db.snapshots.delete(id);
  }

  private async readApplications() {
    const raw = await this.db.applications.toArray();
    return raw
      .map((a) => applicationSchema.safeParse(a))
      .filter((r) => r.success)
      .map((r) => r.data)
      .sort((a, b) => a.order - b.order);
  }

  listApplications() {
    return this.readApplications();
  }

  async putApplication(app: JobApplication) {
    await this.db.applications.put(applicationSchema.parse(app));
  }

  async deleteApplication(id: string) {
    await this.db.applications.delete(id);
  }

  watchApplications(cb: (apps: JobApplication[]) => void): Unsubscribe {
    const sub = liveQuery(() => this.readApplications()).subscribe({
      next: cb,
      error: (e) => console.error("[storage] watchApplications", e),
    });
    return () => sub.unsubscribe();
  }

  async getSetting<T = unknown>(key: string) {
    const row = await this.db.settings.get(key);
    return row?.value as T | undefined;
  }

  async setSetting(key: string, value: unknown) {
    await this.db.settings.put({ key, value });
  }

  async clearAll() {
    await this.db.transaction(
      "rw",
      [this.db.documents, this.db.snapshots, this.db.applications, this.db.settings],
      async () => {
        await Promise.all([
          this.db.documents.clear(),
          this.db.snapshots.clear(),
          this.db.applications.clear(),
          this.db.settings.clear(),
        ]);
      },
    );
  }
}
