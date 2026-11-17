"use client";

import { useEffect, useState } from "react";
import type { AnyDocument } from "@/core/model/schema";
import { getStorage } from "@/core/storage";

export type DocumentsState =
  | { status: "loading"; docs: AnyDocument[] }
  | { status: "ready"; docs: AnyDocument[] }
  | { status: "error"; docs: AnyDocument[]; error: unknown };

/** Live list of all documents (newest first) from the storage adapter. */
export function useDocuments(): DocumentsState {
  const [state, setState] = useState<DocumentsState>({ status: "loading", docs: [] });
  useEffect(() => {
    try {
      return getStorage().watchDocuments((docs) => setState({ status: "ready", docs }));
    } catch (error) {
      queueMicrotask(() => setState({ status: "error", docs: [], error }));
    }
  }, []);
  return state;
}

export type DocumentState =
  | { status: "loading" }
  | { status: "ready"; doc: AnyDocument }
  | { status: "missing" };

export function useDocument(id: string): DocumentState {
  const [state, setState] = useState<DocumentState>({ status: "loading" });
  useEffect(() => {
    return getStorage().watchDocument(id, (doc) => setState(doc ? { status: "ready", doc } : { status: "missing" }));
  }, [id]);
  return state;
}
