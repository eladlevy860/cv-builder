"use client";

import { create } from "zustand";
import { produce, type Draft } from "immer";
import type { CvDocument } from "@/core/model/schema";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

const HISTORY_LIMIT = 200;
/** Edits to the same field within this window merge into one undo step. */
const COALESCE_MS = 1200;

export type EditorState = {
  doc: CvDocument | null;
  past: CvDocument[];
  future: CvDocument[];
  /** Bumps on every content change (used by autosave). */
  revision: number;
  savedRevision: number;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  /** Form ↔ preview linking. */
  activeSectionId: string | null;
  activeItemId: string | null;
  /** Bumped to ask the form to scroll to the active section/item. */
  focusNonce: number;

  load(doc: CvDocument): void;
  /**
   * Applies an immer recipe. `coalesce` is a key (e.g. a field path):
   * consecutive edits with the same key inside a short window become one
   * undo step, so typing a word is undone at once.
   */
  update(recipe: (draft: Draft<CvDocument>) => void, opts?: { coalesce?: string }): void;
  /** Replaces the whole document (restoring a version) as one undo step. */
  replace(doc: CvDocument): void;
  undo(): void;
  redo(): void;
  setSaveStatus(status: SaveStatus, savedRevision?: number): void;
  focus(sectionId: string | null, itemId?: string | null, scroll?: boolean): void;
};

let lastKey: string | undefined;
let lastTime = 0;

export const useEditorStore = create<EditorState>()((set, get) => ({
  doc: null,
  past: [],
  future: [],
  revision: 0,
  savedRevision: 0,
  saveStatus: "saved",
  lastSavedAt: null,
  activeSectionId: null,
  activeItemId: null,
  focusNonce: 0,

  load(doc) {
    lastKey = undefined;
    set({
      doc,
      past: [],
      future: [],
      revision: 0,
      savedRevision: 0,
      saveStatus: "saved",
      lastSavedAt: null,
      activeSectionId: null,
      activeItemId: null,
    });
  },

  update(recipe, opts) {
    const { doc, past, revision } = get();
    if (!doc) return;
    const next = produce(doc, recipe);
    if (next === doc) return;
    const now = Date.now();
    const merge = !!opts?.coalesce && opts.coalesce === lastKey && now - lastTime < COALESCE_MS && past.length > 0;
    lastKey = opts?.coalesce;
    lastTime = now;
    set({
      doc: next,
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      revision: revision + 1,
      saveStatus: "dirty",
    });
  },

  replace(nextDoc) {
    const { doc, past, revision } = get();
    if (!doc) return;
    lastKey = undefined;
    set({
      doc: { ...nextDoc, id: doc.id, createdAt: doc.createdAt },
      past: [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      revision: revision + 1,
      saveStatus: "dirty",
    });
  },

  undo() {
    const { doc, past, future, revision } = get();
    if (!doc || past.length === 0) return;
    lastKey = undefined;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future],
      revision: revision + 1,
      saveStatus: "dirty",
    });
  },

  redo() {
    const { doc, past, future, revision } = get();
    if (!doc || future.length === 0) return;
    lastKey = undefined;
    set({
      doc: future[0],
      past: [...past, doc],
      future: future.slice(1),
      revision: revision + 1,
      saveStatus: "dirty",
    });
  },

  setSaveStatus(status, savedRevision) {
    const patch: Partial<EditorState> = { saveStatus: status };
    if (savedRevision !== undefined) {
      patch.savedRevision = savedRevision;
      patch.lastSavedAt = Date.now();
      // Edits made while the save was in flight keep the doc dirty.
      if (get().revision !== savedRevision) patch.saveStatus = "dirty";
    }
    set(patch);
  },

  focus(sectionId, itemId = null, scroll = false) {
    set((s) => ({
      activeSectionId: sectionId,
      activeItemId: itemId,
      focusNonce: scroll ? s.focusNonce + 1 : s.focusNonce,
    }));
  },
}));

/** Shorthand for components. */
export const editorActions = {
  update: (...args: Parameters<EditorState["update"]>) => useEditorStore.getState().update(...args),
  undo: () => useEditorStore.getState().undo(),
  redo: () => useEditorStore.getState().redo(),
};
