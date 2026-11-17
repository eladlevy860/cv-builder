import { sectionTitle } from "@/core/i18n-doc/labels";
import type { AnyDocument, Language } from "@/core/model/schema";
import { getTemplateMeta } from "@/templates/meta";
import { cn } from "@/lib/utils";

/**
 * Lightweight schematic thumbnail of a document (or of a template when no
 * document is given). Uses container-query units so it scales with the card.
 * The document's own direction and language are applied, so Hebrew CVs show
 * mirrored layouts. Used for cover letters; CVs use the real renderer (CvThumbnail).
 */
export function DocThumbnail({
  doc,
  templateId,
  language,
  accent,
  className,
  label,
}: {
  doc?: AnyDocument;
  templateId?: string;
  language?: Language;
  accent?: string;
  className?: string;
  label?: string;
}) {
  const meta = getTemplateMeta(doc?.templateId ?? templateId ?? "classic");
  const lang: Language = doc?.language ?? language ?? "he";
  const dir = lang === "he" ? "rtl" : "ltr";
  const color = accent ?? doc?.theme.accentColor ?? meta.defaultAccent;
  const name = doc?.basics.name || (lang === "he" ? "השם שלך" : "Your Name");
  const headline = doc?.basics.headline || (lang === "he" ? "תפקיד מבוקש" : "Target role");
  const titles =
    doc?.type === "cv"
      ? doc.sections.filter((s) => s.visible).map((s) => sectionTitle(s, lang))
      : doc?.type === "coverLetter"
        ? []
        : ["summary", "experience", "education", "skills"].map((t) =>
            sectionTitle({ type: t as "summary", title: null }, lang),
          );

  const layout =
    meta.columns === 2
      ? "sidebar"
      : meta.id === "professional-header"
        ? "band"
        : meta.id === "elegant"
          ? "centered"
          : "plain";

  const header = (
    <div
      className={cn(
        "flex flex-col gap-[1.2cqw]",
        layout === "band" && "px-[7cqw] py-[5cqw] text-white",
        layout === "centered" && "items-center text-center",
      )}
      style={layout === "band" ? { background: color } : undefined}
    >
      <div
        className="bidi-plain truncate text-[6cqw] leading-tight font-bold"
        style={{ color: layout === "band" ? "white" : layout === "plain" ? color : undefined }}
      >
        {name}
      </div>
      <div className="bidi-plain truncate text-[3.4cqw] opacity-75">{headline}</div>
    </div>
  );

  const section = (title: string, i: number, lines = 3) => (
    <div key={i} className="flex flex-col gap-[1.2cqw]">
      <div className="truncate text-[3.2cqw] font-semibold" style={{ color }}>
        {title}
      </div>
      <div className="h-[0.25cqw] w-full opacity-30" style={{ background: color }} />
      {Array.from({ length: lines }, (_, j) => (
        <div key={j} className="h-[1.3cqw] rounded-full bg-slate-200" style={{ width: `${92 - ((i + j) % 3) * 14}%` }} />
      ))}
    </div>
  );

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("@container aspect-[210/297] w-full overflow-hidden bg-white text-slate-800 select-none", className)}
    >
      <div dir={dir} lang={lang} className="flex h-full flex-col" style={{ fontFamily: "Heebo, Assistant, sans-serif" }}>
        {layout === "sidebar" ? (
          <div className="flex h-full">
            <div className="flex w-[34%] flex-col gap-[3cqw] p-[5cqw] text-white" style={{ background: color }}>
              <div className="mx-auto aspect-square w-[60%] rounded-full bg-white/25" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-[1.2cqw]">
                  <div className="h-[1.6cqw] w-[60%] rounded-full bg-white/70" />
                  <div className="h-[1.2cqw] w-[85%] rounded-full bg-white/35" />
                  <div className="h-[1.2cqw] w-[70%] rounded-full bg-white/35" />
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[4cqw] p-[6cqw]">
              {header}
              {titles.slice(0, 4).map((t, i) => section(t, i))}
            </div>
          </div>
        ) : (
          <>
            {layout === "band" ? header : <div className="px-[7cqw] pt-[7cqw]">{header}</div>}
            <div className="flex flex-col gap-[4cqw] p-[7cqw]">
              {doc?.type === "coverLetter"
                ? Array.from({ length: 10 }, (_, j) => (
                    <div key={j} className="h-[1.3cqw] rounded-full bg-slate-200" style={{ width: `${95 - (j % 4) * 10}%` }} />
                  ))
                : titles.slice(0, 5).map((t, i) => section(t, i, i === 1 ? 4 : 2))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
