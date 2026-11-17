"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangleIcon, CheckIcon, CopyIcon, InfoIcon, LayoutTemplateIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matchKeywords, type HighlightRange, type Keyword } from "@/core/ats/keywords";
import { splitRuns } from "@/core/bidi";
import { fieldDir } from "@/templates/primitives/text";
import { cvToPlainText } from "@/core/ats/plain-text";
import { isDefaultSectionTitle, sectionTitle } from "@/core/i18n-doc/labels";
import { createItem, createSection, createSkill } from "@/core/model/factory";
import { getTemplateMeta } from "@/templates/meta";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "../store";

type View = "match" | "text";

const adKey = (id: string) => `cv-builder:job-ad:${id}`;

function readAd(id: string): string {
  try {
    return localStorage.getItem(adKey(id)) ?? "";
  } catch {
    return "";
  }
}

function Note({ warn, children, action }: { warn?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-sm", warn ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-950/30" : "bg-card")}>
      {warn ? <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /> : <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </li>
  );
}

/** Adds a skill to the first skills group (creating the section or group if needed). */
function addSkill(name: string) {
  editorActions.update((d) => {
    let s: (typeof d.sections)[number] | undefined = d.sections.find((x) => x.type === "skills");
    if (!s) {
      d.sections.push(createSection("skills"));
      s = d.sections[d.sections.length - 1];
    }
    if (s?.type !== "skills") return;
    if (!s.items.length) s.items.push(createItem("skills"));
    s.items[0].skills.push(createSkill(name));
  });
}

/** The job ad with matched and missing keywords marked. */
function HighlightedAd({ text, ranges }: { text: string; ranges: HighlightRange[] }) {
  const parts: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.start < pos) return;
    if (r.start > pos) parts.push(text.slice(pos, r.start));
    parts.push(
      <mark
        key={i}
        className={cn("rounded-sm px-0.5", r.matched ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100")}
        data-matched={r.matched}
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  });
  parts.push(text.slice(pos));
  return (
    <div dir="auto" className="max-h-72 overflow-y-auto rounded-lg border bg-card p-3 text-sm leading-relaxed whitespace-pre-wrap" data-testid="highlighted-ad">
      {parts}
    </div>
  );
}

function KeywordChip({ k, onAdd }: { k: Keyword; onAdd?: () => void }) {
  const t = useTranslations("ats");
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-full border py-0.5 ps-2 text-sm",
        onAdd ? "pe-0.5" : "pe-2",
        k.matched ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
      )}
      data-testid={k.matched ? "kw-matched" : "kw-missing"}
    >
      {k.matched ? <CheckIcon className="size-3.5" aria-hidden /> : <XIcon className="size-3.5" aria-hidden />}
      <bdi>{k.label}</bdi>
      {k.count > 1 && <span className="text-xs opacity-70">×{k.count}</span>}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="ms-0.5 grid size-5 place-items-center rounded-full hover:bg-amber-200/70 dark:hover:bg-amber-800/60"
          aria-label={t("addSkill", { skill: k.label })}
          title={t("addSkill", { skill: k.label })}
          data-testid="kw-add"
        >
          <PlusIcon className="size-3.5" aria-hidden />
        </button>
      )}
    </li>
  );
}

/**
 * One line of the plain-text view. The text is exactly what an ATS gets;
 * on screen, runs in the other direction are isolated so "(2023–2025)" and
 * dates read correctly inside Hebrew lines.
 */
function PlainLine({ line, docDir }: { line: string; docDir: "rtl" | "ltr" }) {
  // Same rule as template fields: a line with letters of the CV's own script follows the CV's direction.
  const dir = fieldDir(line, docDir);
  return (
    <p dir={dir} className="min-h-[1lh] whitespace-pre-wrap">
      {splitRuns(line, dir).map((r, i) =>
        r.rtl === (dir === "rtl") ? (
          r.text
        ) : (
          <span key={i} dir={r.rtl ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">
            {r.text}
          </span>
        ),
      )}
    </p>
  );
}

export function AtsPanel({ onTemplates }: { onTemplates: () => void }) {
  const t = useTranslations("ats");
  const ui = useLocale() === "he" ? "he" : "en";
  const doc = useEditorStore((s) => s.doc!);
  const [view, setView] = useState<View>("match");
  const [ad, setAd] = useState(() => readAd(doc.id));
  const plain = useMemo(() => cvToPlainText(doc), [doc]);
  const result = useMemo(() => (ad.trim() ? matchKeywords(ad, plain) : null), [ad, plain]);
  const meta = getTemplateMeta(doc.templateId);
  const customTitles = doc.sections.filter((s) => s.visible && s.title && !isDefaultSectionTitle(s.type, s.title));

  // Keep the pasted ad per document (this browser only).
  useEffect(() => {
    try {
      if (ad.trim()) localStorage.setItem(adKey(doc.id), ad);
      else localStorage.removeItem(adKey(doc.id));
    } catch {
      /* storage unavailable: nothing to keep */
    }
  }, [ad, doc.id]);

  const matched = result?.keywords.filter((k) => k.matched) ?? [];
  const missing = result?.keywords.filter((k) => !k.matched) ?? [];

  return (
    <div className="grid gap-4 p-4" data-testid="ats-panel">
      <ul className="grid gap-2" aria-label={t("readiness")}>
        {meta.atsFriendly ? (
          <Note>{t("templateOk", { name: meta.name[ui] })}</Note>
        ) : (
          <Note
            warn
            action={
              <Button size="sm" variant="outline" className="h-7 shrink-0 px-2" onClick={onTemplates}>
                <LayoutTemplateIcon />
                {t("switchTemplate")}
              </Button>
            }
          >
            {t("templateColumns")}
          </Note>
        )}
        {doc.theme.showPhoto && meta.supportsPhoto && doc.basics.photo && <Note>{t("photo")}</Note>}
        {customTitles.length > 0 && <Note>{t("customTitles", { titles: customTitles.map((s) => sectionTitle(s, doc.language)).join(", ") })}</Note>}
      </ul>

      <div role="tablist" aria-label={t("title")} className="flex gap-1 rounded-lg bg-muted p-1">
        {(["match", "text"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground", view === v && "bg-background text-foreground shadow-xs")}
            data-testid={`ats-view-${v}`}
          >
            {t(`views.${v}`)}
          </button>
        ))}
      </div>

      {view === "match" && (
        <div role="tabpanel" className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="job-ad">{t("adLabel")}</Label>
            <Textarea
              id="job-ad"
              dir="auto"
              rows={6}
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder={t("adPlaceholder")}
              data-testid="job-ad"
            />
            <p className="text-xs text-muted-foreground">{t("adHint")}</p>
          </div>
          {result && result.keywords.length > 0 && (
            <>
              <div className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{t("matchScore")}</span>
                  <span className="text-lg font-bold tabular-nums" data-testid="match-score">
                    {result.score}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                  <div
                    className={cn("h-full rounded-full transition-[width]", result.score >= 70 ? "bg-emerald-500" : result.score >= 40 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
              </div>
              {missing.length > 0 && (
                <section className="grid gap-1.5">
                  <h3 className="text-sm font-medium">{t("missing", { count: missing.length })}</h3>
                  <p className="text-xs text-muted-foreground">{t("missingHint")}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {missing.map((k) => (
                      <KeywordChip
                        key={k.id}
                        k={k}
                        onAdd={
                          k.known
                            ? () => {
                                addSkill(k.label);
                                toast.success(t("skillAdded", { skill: k.label }));
                              }
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </section>
              )}
              {matched.length > 0 && (
                <section className="grid gap-1.5">
                  <h3 className="text-sm font-medium">{t("matched", { count: matched.length })}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {matched.map((k) => (
                      <KeywordChip key={k.id} k={k} />
                    ))}
                  </ul>
                </section>
              )}
              <section className="grid gap-1.5">
                <h3 className="text-sm font-medium">{t("adHighlighted")}</h3>
                <HighlightedAd text={ad} ranges={result.ranges} />
              </section>
            </>
          )}
          {result && result.keywords.length === 0 && <p className="text-sm text-muted-foreground">{t("noKeywords")}</p>}
        </div>
      )}

      {view === "text" && (
        <div role="tabpanel" className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("textHint")}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(plain).then(
                  () => toast.success(t("copied")),
                  () => undefined,
                );
              }}
              data-testid="copy-plain"
            >
              <CopyIcon />
              {t("copy")}
            </Button>
          </div>
          <div className="max-h-[60dvh] overflow-y-auto rounded-lg border bg-card p-3 text-[13px] leading-relaxed tabular-nums" lang={doc.language} data-testid="plain-text">
            {plain.split("\n").map((line, i) => (
              <PlainLine key={i} line={line} docDir={doc.language === "he" ? "rtl" : "ltr"} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
