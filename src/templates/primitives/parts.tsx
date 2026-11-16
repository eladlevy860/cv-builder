import type { ReactNode } from "react";
import { CalendarIcon, CarIcon, GlobeIcon, IdCardIcon, Link2Icon, MailIcon, MapPinIcon, PhoneIcon, UserIcon } from "lucide-react";
import { classifyContact, formatIsraeliPhone } from "@/core/bidi";
import type { FormattedRange } from "@/core/i18n-doc/dates";
import { sectionTitle } from "@/core/i18n-doc/labels";
import type { Section, SectionOf } from "@/core/model/schema";
import { extraLabel, levelLabel, type Entry } from "@/core/render/entries";
import type { RenderContext } from "../types";
import { Field, Ltr, RichTextView, runs } from "./text";

// ---------------------------------------------------------------------------
// Headings and dates
// ---------------------------------------------------------------------------

export function SectionHeading({ ctx, section }: { ctx: RenderContext; section: Section }) {
  return (
    <h2 className="cv-heading" data-section-id={section.id}>
      <span className="cv-heading-text">{runs(sectionTitle(section, ctx.lang), ctx.dir)}</span>
    </h2>
  );
}

/**
 * Date or date range. Purely numeric ranges ("05/2023 – 02/2025") are
 * isolated as one LTR run so the dash and slashes never flip in Hebrew.
 * Ranges ending in "היום" keep document order: start (isolated) – היום.
 */
export function DateText({ ctx, date, numeric }: { ctx: RenderContext; date: FormattedRange | null; numeric: boolean }) {
  if (!date) return null;
  if (ctx.lang === "en" || numeric) {
    return (
      <Ltr className="cv-date">
        {date.text}
      </Ltr>
    );
  }
  if (date.start && date.end && date.start !== date.end) {
    return (
      <bdi dir="rtl" className="cv-date">
        {runs(date.start, "rtl")} – {runs(date.end, "rtl")}
      </bdi>
    );
  }
  return (
    <bdi dir="rtl" className="cv-date">
      {runs(date.text, "rtl")}
    </bdi>
  );
}

// ---------------------------------------------------------------------------
// Entries (experience, education, military, …)
// ---------------------------------------------------------------------------

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export function LinkText({ value }: { value: string }) {
  const kind = classifyContact(value);
  const href = kind === "email" ? `mailto:${value}` : kind === "phone" ? `tel:${value.replace(/[^\d+]/g, "")}` : /^https?:/i.test(value) ? value : `https://${value}`;
  return (
    <a href={href} className="cv-link">
      <Ltr>{kind === "url" ? displayUrl(value) : value}</Ltr>
    </a>
  );
}

export function EntryView({
  ctx,
  entry,
  subtitleInline = true,
  showLocation = true,
}: {
  ctx: RenderContext;
  entry: Entry;
  /** Render "Title, Subtitle" on one line (true) or the subtitle on its own line. */
  subtitleInline?: boolean;
  showLocation?: boolean;
}) {
  const sep = ctx.lang === "he" ? ", " : ", ";
  const subLine = !subtitleInline && (entry.subtitle || (showLocation && entry.location));
  return (
    <div className="cv-entry">
      <div className="cv-entry-head">
        <div className="cv-entry-what">
          <Field text={entry.title} ctx={ctx} className="cv-entry-title" />
          {subtitleInline && entry.subtitle && (
            <>
              {entry.title && <span className="cv-entry-sep">{sep}</span>}
              <Field text={entry.subtitle} ctx={ctx} className="cv-entry-sub" />
            </>
          )}
          {subtitleInline && showLocation && entry.location && (
            <>
              <span className="cv-entry-sep"> · </span>
              <Field text={entry.location} ctx={ctx} className="cv-entry-loc" />
            </>
          )}
        </div>
        <DateText ctx={ctx} date={entry.date} numeric={entry.numericDate} />
      </div>
      {subLine && (
        <div className="cv-entry-subline">
          <Field text={entry.subtitle} ctx={ctx} className="cv-entry-sub" />
          {showLocation && entry.location && (
            <>
              {entry.subtitle && <span className="cv-entry-sep"> · </span>}
              <Field text={entry.location} ctx={ctx} className="cv-entry-loc" />
            </>
          )}
        </div>
      )}
      {entry.meta.length > 0 && (
        <div className="cv-entry-meta">
          {entry.meta.map((m, i) => (
            <span key={i} className="cv-entry-meta-item">
              {m.label && <span className="cv-entry-meta-label">{m.label}: </span>}
              {m.kind === "link" ? <LinkText value={m.value} /> : <Field text={m.value} ctx={ctx} />}
            </span>
          ))}
        </div>
      )}
      {entry.description && <RichTextView value={entry.description} ctx={ctx} className="cv-entry-body" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skills and languages
// ---------------------------------------------------------------------------

export function Dots({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <span className="cv-dots" role="img" aria-label={`${level}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < level ? "cv-dot cv-dot--on" : "cv-dot"} />
      ))}
    </span>
  );
}

export function SkillGroupView({
  ctx,
  section,
  item,
  variant = "inline",
}: {
  ctx: RenderContext;
  section: SectionOf<"skills">;
  item: SectionOf<"skills">["items"][number];
  /** inline: "CAD: A · B · C"; list: one skill per line; chips: pill tags. */
  variant?: "inline" | "list" | "chips";
}) {
  const skills = item.skills.filter((s) => s.name.trim());
  const display = section.levelDisplay;
  const useList = variant === "list" || (display === "dots" && variant !== "chips");
  return (
    <div className={`cv-skills cv-skills--${useList ? "list" : variant}`}>
      {item.name.trim() && (
        <div className="cv-skills-name">
          <Field text={item.name} ctx={ctx} />
          {!useList && variant === "inline" && <span className="cv-skills-colon">: </span>}
        </div>
      )}
      {useList ? (
        <ul className="cv-skills-list">
          {skills.map((s) => (
            <li key={s.id}>
              <Field text={s.name} ctx={ctx} className="cv-skill" />
              {display === "dots" && s.level > 0 && <Dots level={s.level} />}
              {display === "text" && (s.levelText || s.level > 0) && (
                <span className="cv-skill-level">{runs(s.levelText || levelLabel(s.level, ctx.lang), ctx.dir)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="cv-skills-items">
          {skills.map((s, i) => (
            <span key={s.id} className="cv-skill-wrap">
              {i > 0 && variant === "inline" && <span className="cv-skills-sep"> · </span>}
              <Field text={s.name} ctx={ctx} className="cv-skill" />
              {display === "text" && (s.levelText || s.level > 0) && (
                <span className="cv-skill-level"> ({runs(s.levelText || levelLabel(s.level, ctx.lang), ctx.dir)})</span>
              )}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export function LanguageView({
  ctx,
  section,
  item,
}: {
  ctx: RenderContext;
  section: SectionOf<"languages">;
  item: SectionOf<"languages">["items"][number];
}) {
  const fluency = item.fluency || (item.level ? levelLabel(item.level, ctx.lang) : "");
  return (
    <div className="cv-lang">
      <Field text={item.language} ctx={ctx} className="cv-lang-name" />
      {section.levelDisplay === "dots" && item.level > 0 ? (
        <Dots level={item.level} />
      ) : (
        section.levelDisplay !== "none" &&
        fluency && (
          <>
            <span className="cv-entry-sep"> – </span>
            <Field text={fluency} ctx={ctx} className="cv-lang-level" />
          </>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header pieces
// ---------------------------------------------------------------------------

export type ContactEntry = { key: string; icon: ReactNode; node: ReactNode };

export function contactEntries(ctx: RenderContext): ContactEntry[] {
  const b = ctx.doc.basics;
  const out: ContactEntry[] = [];
  const icon = (C: typeof MailIcon) => (ctx.theme.showIcons ? <C className="cv-icon" aria-hidden /> : null);
  if (b.phone.trim()) {
    const phone = formatIsraeliPhone(b.phone);
    out.push({ key: "phone", icon: icon(PhoneIcon), node: <LinkText value={phone} /> });
  }
  if (b.email.trim()) out.push({ key: "email", icon: icon(MailIcon), node: <LinkText value={b.email.trim()} /> });
  if (b.city.trim()) out.push({ key: "city", icon: icon(MapPinIcon), node: <Field text={b.city} ctx={ctx} /> });
  for (const l of b.links) {
    if (!l.url.trim()) continue;
    const isWeb = /linkedin|github|gitlab|behance|portfolio/i.test(l.url) ? Link2Icon : GlobeIcon;
    out.push({ key: `link-${l.id}`, icon: icon(isWeb), node: <LinkText value={l.url.trim()} /> });
  }
  const extraIcons: Record<string, typeof MailIcon> = { idNumber: IdCardIcon, birthDate: CalendarIcon, drivingLicense: CarIcon };
  for (const x of b.extras) {
    if (!x.visible || !x.value.trim()) continue;
    const label = extraLabel(x.kind, x.label, ctx.lang);
    out.push({
      key: `extra-${x.id}`,
      icon: icon(extraIcons[x.kind] ?? UserIcon),
      node: (
        <span>
          {label && <span className="cv-contact-label">{runs(label, ctx.dir)}: </span>}
          <Field text={x.value} ctx={ctx} />
        </span>
      ),
    });
  }
  return out;
}

export function Contacts({ ctx, layout = "inline" }: { ctx: RenderContext; layout?: "inline" | "stack" }) {
  const items = contactEntries(ctx);
  if (!items.length) return null;
  return (
    <ul className={`cv-contacts cv-contacts--${layout}`}>
      {items.map((c) => (
        <li key={c.key} className="cv-contact">
          {c.icon}
          {c.node}
        </li>
      ))}
    </ul>
  );
}

export function Photo({ ctx, className }: { ctx: RenderContext; className?: string }) {
  const p = ctx.doc.basics.photo;
  if (!p || !ctx.theme.showPhoto || !ctx.meta.supportsPhoto) return null;
  return (
    <div className={`cv-photo cv-photo--${p.shape} ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL, rendered identically in the PDF */}
      <img
        src={p.dataUrl}
        alt=""
        style={{
          transform: `translate(${p.crop.x}%, ${p.crop.y}%) scale(${p.crop.zoom})`,
        }}
      />
    </div>
  );
}

export function NameBlock({ ctx }: { ctx: RenderContext }) {
  const b = ctx.doc.basics;
  return (
    <>
      {b.name.trim() && (
        <h1 className="cv-name">
          <Field text={b.name} ctx={ctx} />
        </h1>
      )}
      {b.headline.trim() && (
        <p className="cv-headline">
          <Field text={b.headline} ctx={ctx} />
        </p>
      )}
    </>
  );
}
