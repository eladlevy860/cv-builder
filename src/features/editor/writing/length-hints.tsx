"use client";

import { useTranslations } from "next-intl";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { countBullets, isRichTextEmpty, type RichText } from "@/core/model/richtext";
import { BULLET_MAX, BULLETS_PER_ROLE, SUMMARY_RANGE, bulletIssues, summaryVerdict, weakParagraphs } from "@/core/writing/analysis";
import { cn } from "@/lib/utils";
import { useDocLang } from "../form/fields";

function Line({ warn, children, testId }: { warn?: boolean; children: React.ReactNode; testId?: string }) {
  const Icon = warn ? AlertTriangleIcon : InfoIcon;
  return (
    <li className={cn("flex items-start gap-1.5", warn ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")} data-testid={testId}>
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** Live length feedback for the summary. */
export function SummaryHint({ value }: { value: RichText }) {
  const t = useTranslations("writing.hints");
  const lang = useDocLang();
  const { length, verdict } = summaryVerdict(value);
  if (verdict === "empty") return null;
  const weak = weakParagraphs(value, lang);
  return (
    <ul className="grid gap-1 text-xs" aria-live="polite" data-testid="summary-hint">
      <Line warn={verdict !== "ok"}>
        {t("summaryLength", { length, min: SUMMARY_RANGE.min, max: SUMMARY_RANGE.max })}
        {verdict === "short" && ` ${t("summaryShort")}`}
        {verdict === "long" && ` ${t("summaryLong")}`}
      </Line>
      {weak.map((phrase, i) => (
        <Line key={i} warn>
          {t("paragraphWeak", { phrase, example: t(`verbExample.${lang}`) })}
        </Line>
      ))}
    </ul>
  );
}

/** Live feedback for bullets: count (for roles), long, short and weak openings. */
export function BulletHints({ value, role = false }: { value: RichText; role?: boolean }) {
  const t = useTranslations("writing.hints");
  const lang = useDocLang();
  if (isRichTextEmpty(value)) return null;
  const n = countBullets(value);
  const issues = bulletIssues(value, lang);
  const weakParas = n === 0 ? weakParagraphs(value, lang) : [];
  const countOff = role && (n < BULLETS_PER_ROLE.min || n > BULLETS_PER_ROLE.max);
  if (!role && issues.length === 0 && weakParas.length === 0) return null;
  return (
    <ul className="grid gap-1 text-xs" aria-live="polite" data-testid="bullet-hints">
      {role && (
        <Line warn={countOff}>
          {n === 0 ? t("asBullets") : t("bulletCount", { count: n, min: BULLETS_PER_ROLE.min, max: BULLETS_PER_ROLE.max })}
        </Line>
      )}
      {issues.map((b) => (
        <Line key={b.index} warn testId="bullet-issue">
          {b.weak
            ? t("bulletWeak", { n: b.index + 1, phrase: b.weak, example: t(`verbExample.${lang}`) })
            : b.long
              ? t("bulletLong", { n: b.index + 1, length: b.text.length, max: BULLET_MAX })
              : t("bulletShort", { n: b.index + 1 })}
        </Line>
      ))}
      {weakParas.map((phrase, i) => (
        <Line key={`p${i}`} warn>
          {t("paragraphWeak", { phrase, example: t(`verbExample.${lang}`) })}
        </Line>
      ))}
    </ul>
  );
}
