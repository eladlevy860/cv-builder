"use client";

import { useEffect, useRef, useState } from "react";
import type { CvDocument } from "@/core/model/schema";
import { PagedDocument } from "@/templates/paginator";
import { PAGE_SIZES } from "@/templates/theme-vars";
import { cn } from "@/lib/utils";

const MM_TO_PX = 96 / 25.4;

/** True once the element has come near the viewport (stays true). */
function useSeen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/**
 * The real first page of a CV, scaled down to the container width. Uses
 * the same renderer as the preview and the PDF, so the thumbnail is exactly
 * what the user gets. Rendering starts when the thumbnail scrolls into view.
 */
export function CvThumbnail({ doc, className, label }: { doc: CvDocument; className?: string; label?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const [width, setWidth] = useState(0);
  const size = PAGE_SIZES[doc.theme.pageSize];
  const pageWidthPx = size.width * MM_TO_PX;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn("relative w-full overflow-hidden bg-white select-none", className)}
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
      data-testid="cv-thumbnail"
    >
      {seen && width > 0 && (
        <div className="pointer-events-none absolute inset-0" aria-hidden inert>
          <PagedDocument
            doc={doc}
            pageGap="0px"
            renderPage={(page, i) => (i === 0 ? <div style={{ zoom: width / pageWidthPx }}>{page}</div> : null)}
          />
        </div>
      )}
    </div>
  );
}
