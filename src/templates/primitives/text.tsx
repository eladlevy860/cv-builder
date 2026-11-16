import type { ReactNode } from "react";
import { detectDir, splitRuns } from "@/core/bidi";
import type { RichText, RTInline, RTMark } from "@/core/model/richtext";
import type { Dir, RenderContext } from "../types";

/**
 * All bidi handling for templates lives here.
 *
 * Strategy:
 * - Paragraph-level text (bullets, summary) keeps the *document* direction so
 *   alignment and bullet markers stay consistent, and every run in the other
 *   direction is wrapped in an isolated span. This keeps tokens such as
 *   `C++`, `GD&T`, `ISO 9001:2015` and `(2023–2025)` intact inside Hebrew.
 * - Short fields (name, role, organization…) are isolated as a whole with
 *   `<bdi>`, take their direction from their first strong character, and also
 *   get their inner runs isolated.
 */
export function runs(text: string, base: Dir): ReactNode {
  const parts = splitRuns(text, base);
  if (parts.length === 1 && parts[0].rtl === (base === "rtl")) return text;
  return parts.map((r, i) =>
    r.rtl === (base === "rtl") ? (
      r.text
    ) : (
      <span key={i} dir={r.rtl ? "rtl" : "ltr"} className="cv-iso">
        {r.text}
      </span>
    ),
  );
}

/** A short user-entered field, isolated from its surroundings. */
export function Field({ text, ctx, className }: { text: string; ctx: RenderContext; className?: string }) {
  if (!text) return null;
  const dir: Dir = detectDir(text) ?? ctx.dir;
  return (
    <bdi dir={dir} className={className}>
      {runs(text, dir)}
    </bdi>
  );
}

/** Text that must always read left-to-right (emails, phones, URLs). */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={className ? `cv-iso ${className}` : "cv-iso"}>
      {children}
    </span>
  );
}

function withMarks(node: ReactNode, marks: RTMark[] | undefined, key: number): ReactNode {
  let out = node;
  for (const m of marks ?? []) {
    if (m.type === "bold") out = <strong key={key}>{out}</strong>;
    else if (m.type === "italic") out = <em key={key}>{out}</em>;
    else if (m.type === "link")
      out = (
        <a key={key} href={m.attrs.href}>
          {out}
        </a>
      );
  }
  return out;
}

function Inline({ nodes, dir }: { nodes: RTInline[] | undefined; dir: Dir }) {
  if (!nodes) return null;
  return (
    <>
      {nodes.map((n, i) =>
        n.type === "hardBreak" ? <br key={i} /> : <span key={i}>{withMarks(runs(n.text, dir), n.marks, i)}</span>,
      )}
    </>
  );
}

export function RichTextView({ value, ctx, className }: { value: RichText; ctx: RenderContext; className?: string }) {
  const dir = ctx.dir;
  return (
    <div className={className ? `cv-rt ${className}` : "cv-rt"}>
      {value.content.map((b, i) => {
        if (b.type === "paragraph") {
          return (
            <p key={i}>
              <Inline nodes={b.content} dir={dir} />
            </p>
          );
        }
        const List = b.type === "orderedList" ? "ol" : "ul";
        return (
          <List key={i}>
            {b.content.map((li, j) => (
              <li key={j}>
                {li.content.map((p, k) => (
                  <p key={k}>
                    <Inline nodes={p.content} dir={dir} />
                  </p>
                ))}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
