"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, AlertTriangleIcon, ArrowRightIcon, CheckCircle2Icon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionTitle } from "@/core/i18n-doc/labels";
import { analyzeCompleteness, type Check, type Issue, type Target } from "@/core/writing/completeness";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store";

export function useCompleteness() {
  const doc = useEditorStore((s) => s.doc!);
  const layout = useEditorStore((s) => s.layout);
  return useMemo(() => analyzeCompleteness(doc, layout), [doc, layout]);
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500";
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke="currentColor"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        className={cn("transition-[stroke-dashoffset] duration-500", color)}
      />
    </svg>
  );
}

const STATUS_ICON = {
  ok: <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />,
  warning: <AlertTriangleIcon className="size-4 text-amber-500" aria-hidden />,
  error: <AlertCircleIcon className="size-4 text-red-500" aria-hidden />,
};

function CheckRow({ check, issueText, onGo }: { check: Check; issueText: (i: Issue) => string; onGo: (target: Target) => void }) {
const t = useTranslations("review");
  return (
    <li className="grid gap-1.5 rounded-lg border bg-card p-3" data-testid={`check-${check.id}`} data-status={check.status}>
      <div className="flex items-center gap-2">
        {STATUS_ICON[check.status]}
        <span className="flex-1 text-sm font-medium">{t(`checks.${check.id}`)}</span>
      </div>
      {check.issues.length > 0 && (
        <ul className="grid gap-1 ps-6">
          {check.issues.slice(0, 6).map((issue, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
              <span className="min-w-0">
                <bdi>{issueText(issue)}</bdi>
              </span>
              {issue.target && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-primary"
                  onClick={() => onGo(issue.target!)}
                  data-testid="issue-go"
                >
                  {t("fix")}
                  <ArrowRightIcon className="rtl:-scale-x-100" />
                </Button>
              )}
            </li>
          ))}
          {check.issues.length > 6 && <li className="text-xs text-muted-foreground">{t("more", { count: check.issues.length - 6 })}</li>}
        </ul>
      )}
    </li>
  );
}

/**
 * Completeness score and checklist. Every issue links to the section or
 * item it is about.
 */
export function ReviewPanel({ onGo }: { onGo: (target: Target) => void }) {
  const t = useTranslations("review");
  const doc = useEditorStore((s) => s.doc!);
  const { score, checks } = useCompleteness();
  const [showDone, setShowDone] = useState(false);
  const open = checks.filter((c) => c.status !== "ok");
  const done = checks.filter((c) => c.status === "ok");
  const level = score >= 85 ? "great" : score >= 60 ? "good" : "low";

  function issueText(issue: Issue): string {
    const p = { ...(issue.params ?? {}) } as Record<string, string | number>;
    if (issue.key === "contactMissing") {
      p.fields = String(p.fields)
        .split(",")
        .map((f) => t(`fields.${f}` as Parameters<typeof t>[0]))
        .join(t("listSeparator"));
    }
    if (issue.key === "sectionEmpty" && issue.target) {
      const s = doc.sections.find((x) => x.id === issue.target!.sectionId);
      p.title = s ? sectionTitle(s, doc.language) : "";
    }
    return t(`issues.${issue.key}` as Parameters<typeof t>[0], p);
  }

  return (
    <div className="grid gap-4 p-4" data-testid="review-panel">
      <section className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <div className="relative grid place-items-center">
          <ScoreRing score={score} />
          <span className="absolute text-xl font-bold tabular-nums" data-testid="score">
            {score}
          </span>
        </div>
        <div className="grid gap-1">
          <h2 className="font-semibold">{t(`level.${level}`)}</h2>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
      </section>

      {open.length > 0 ? (
        <ul className="grid gap-2" aria-label={t("toFix")}>
          {open.map((c) => (
            <CheckRow key={c.id} check={c} issueText={issueText} onGo={onGo} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {t("allDone")}
        </p>
      )}

      {done.length > 0 && (
        <div className="grid gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 justify-self-start text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", showDone && "rotate-180")} aria-hidden />
            {t("done", { count: done.length })}
          </button>
          {showDone && (
            <ul className="grid gap-2">
              {done.map((c) => (
                <CheckRow key={c.id} check={c} issueText={issueText} onGo={onGo} />
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
