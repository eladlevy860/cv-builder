import type { FrameProps } from "../types";

/**
 * Frame for two-column templates with a full-width header on the first
 * page: the header, then main and side regions side by side. `sideFirst`
 * puts the side column at the inline start (right in Hebrew).
 */
export function TwoColumnFrame({ header, main, side, prefix, sideFirst = false }: FrameProps & { prefix: string; sideFirst?: boolean }) {
  const sideEl = (
    <div className={`cv-region ${prefix}-side`} data-region="side">
      {side}
    </div>
  );
  const mainEl = (
    <div className={`cv-region ${prefix}-main`} data-region="main">
      {main}
    </div>
  );
  return (
    <div className={`cv-frame cv-2col ${prefix}-frame ${header ? "" : `${prefix}-frame--rest`}`}>
      {header && <header className={`${prefix}-header`}>{header}</header>}
      <div className={`cv-2col-body ${prefix}-body ${sideFirst ? "cv-2col-body--side-first" : ""}`}>
        {sideFirst ? (
          <>
            {sideEl}
            {mainEl}
          </>
        ) : (
          <>
            {mainEl}
            {sideEl}
          </>
        )}
      </div>
    </div>
  );
}
