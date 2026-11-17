import type { Metadata } from "next";
import { RenderView } from "@/features/render/render-view";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Bare document renderer (no app shell). Used by:
 * - the Chromium PDF pipeline (phase 3), which injects the document as
 *   `window.__CV_DOC__` before navigation;
 * - visual tests: `/render?sample=he&template=classic`.
 * Sets `window.__RENDER_DONE__ = true` once fonts are loaded and pages are laid out.
 */
export default function RenderPage() {
  return <RenderView />;
}
