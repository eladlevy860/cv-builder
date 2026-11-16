"use client";

import { useCallback, useEffect, useRef } from "react";
import { newId, nowIso } from "@/core/model/factory";
import { getStorage } from "@/core/storage";
import { useEditorStore } from "./store";

const SAVE_DELAY = 700;
const AUTO_SNAPSHOT_EVERY = 10 * 60 * 1000;
const MAX_AUTO_SNAPSHOTS = 20;

async function pruneAutoSnapshots(docId: string) {
  const storage = getStorage();
  const autos = (await storage.listSnapshots(docId)).filter((s) => s.auto);
  for (const s of autos.slice(MAX_AUTO_SNAPSHOTS)) await storage.deleteSnapshot(s.id);
}

export async function saveSnapshot(name: string | null, auto: boolean) {
  const doc = useEditorStore.getState().doc;
  if (!doc) return;
  await getStorage().putSnapshot({ id: newId(), docId: doc.id, name, auto, createdAt: nowIso(), data: doc });
  if (auto) await pruneAutoSnapshots(doc.id);
}

/**
 * Debounced autosave of the editor document to storage, plus an automatic
 * version snapshot at most every 10 minutes of editing. Returns `flush` to
 * save immediately (Ctrl+S, leaving the page).
 */
export function useAutosave() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const lastAutoSnapshot = useRef<number>(0);

  const save = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const { doc, revision, savedRevision, setSaveStatus } = useEditorStore.getState();
    if (!doc || revision === savedRevision) return;
    // Serialize saves.
    if (saving.current) await saving.current;
    const run = (async () => {
      setSaveStatus("saving");
      try {
        await getStorage().putDocument({ ...doc, updatedAt: nowIso() });
        setSaveStatus("saved", revision);
        const now = Date.now();
        if (now - lastAutoSnapshot.current > AUTO_SNAPSHOT_EVERY) {
          lastAutoSnapshot.current = now;
          await saveSnapshot(null, true);
        }
      } catch (e) {
        console.error("[autosave]", e);
        setSaveStatus("error");
      }
    })();
    saving.current = run;
    await run;
    saving.current = null;
  }, []);

  useEffect(() => {
    // The first save of a session also records an automatic snapshot.
    lastAutoSnapshot.current = 0;
    const unsub = useEditorStore.subscribe((s, prev) => {
      if (s.revision !== prev.revision && s.revision !== s.savedRevision) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(), SAVE_DELAY);
      }
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void save();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const { revision, savedRevision } = useEditorStore.getState();
      if (revision !== savedRevision) {
        void save();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void save(); // flush when leaving the editor
    };
  }, [save]);

  return save;
}
