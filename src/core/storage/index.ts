import type { StorageAdapter } from "./adapter";
import { DexieStorageAdapter } from "./dexie-adapter";

export type { StorageAdapter, Unsubscribe } from "./adapter";

let instance: StorageAdapter | null = null;

/**
 * Returns the app-wide storage adapter. Browser-only (IndexedDB).
 * To add a cloud backend, pick the implementation here based on auth state.
 */
export function getStorage(): StorageAdapter {
  if (typeof window === "undefined") {
    throw new Error("getStorage() is browser-only");
  }
  instance ??= new DexieStorageAdapter();
  return instance;
}

/** For tests: inject a specific adapter. */
export function setStorage(adapter: StorageAdapter | null) {
  instance = adapter;
}
