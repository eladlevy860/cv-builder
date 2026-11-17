import type { NextRequest } from "next/server";
import { migrateDocument } from "@/core/migrations";
import { safeFilename } from "@/lib/download";
import { PdfUnavailableError, renderPdf } from "@/server/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

function json(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

/** RFC 6266 / 5987 header that keeps Hebrew file names. */
function contentDisposition(name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "cv";
  return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`;
}

/**
 * POST { document } → application/pdf
 * The document comes from the browser (it lives in the user's IndexedDB);
 * it is validated and migrated before rendering.
 */
export async function POST(req: NextRequest) {
  // Only same-origin pages may ask for a PDF.
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return json(403, "forbidden", "Cross-origin requests are not allowed.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return json(413, "too-large", "Document is too large.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, "bad-json", "Request body is not valid JSON.");
  }

  let doc;
  try {
    doc = migrateDocument((body as { document?: unknown } | null)?.document);
  } catch (e) {
    return json(400, "invalid-document", (e as Error).message);
  }
  if (doc.type !== "cv") return json(400, "unsupported", "Only CVs can be exported to PDF for now.");

  // The render page is loaded from this same server. Behind a proxy the
  // public origin may not be reachable from inside the server; set
  // PDF_RENDER_ORIGIN (e.g. http://127.0.0.1:3000) in that case.
  const renderOrigin = process.env.PDF_RENDER_ORIGIN ?? req.nextUrl.origin;

  try {
    const pdf = await renderPdf(doc, renderOrigin);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(safeFilename(doc.title, "cv")),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof PdfUnavailableError) return json(503, "chromium-unavailable", e.message);
    console.error("[pdf] render failed:", (e as Error).message);
    return json(500, "render-failed", "PDF rendering failed.");
  }
}
