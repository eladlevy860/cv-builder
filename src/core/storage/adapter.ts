import type { AnyDocument, JobApplication, Snapshot } from "../model/schema";

export type Unsubscribe = () => void;

/**
 * Persistence boundary. The editor, dashboard and tracker only talk to this
 * interface, so a cloud backend (e.g. Supabase) can be added as another
 * implementation without touching UI code.
 *
 * All methods return validated, migrated, latest-schema objects.
 */
export interface StorageAdapter {
  // Documents
  listDocuments(): Promise<AnyDocument[]>;
  getDocument(id: string): Promise<AnyDocument | undefined>;
  putDocument(doc: AnyDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  /** Calls `cb` with the current list now and whenever it changes. */
  watchDocuments(cb: (docs: AnyDocument[]) => void): Unsubscribe;
  watchDocument(id: string, cb: (doc: AnyDocument | undefined) => void): Unsubscribe;

  // Version snapshots
  listSnapshots(docId: string): Promise<Snapshot[]>;
  putSnapshot(snapshot: Snapshot): Promise<void>;
  deleteSnapshot(id: string): Promise<void>;

  // Job applications
  listApplications(): Promise<JobApplication[]>;
  putApplication(app: JobApplication): Promise<void>;
  deleteApplication(id: string): Promise<void>;
  watchApplications(cb: (apps: JobApplication[]) => void): Unsubscribe;

  // Settings (small key/value pairs, e.g. AI key, preferences)
  getSetting<T = unknown>(key: string): Promise<T | undefined>;
  setSetting(key: string, value: unknown): Promise<void>;

  /** Removes everything (used by "replace all" import and tests). */
  clearAll(): Promise<void>;
}
