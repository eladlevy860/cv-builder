"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CopyIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createItem, type ItemSectionType } from "@/core/model/factory";
import { appendBullet, isRichTextEmpty, richTextFromPlain, type RichText } from "@/core/model/richtext";
import type { Language, Section, SectionItem } from "@/core/model/schema";
import {
  ACTION_VERBS,
  EXAMPLE_FIELDS,
  EXAMPLE_KIND,
  GUIDANCE,
  VERB_CATEGORIES,
  examplesFor,
  type ExampleField,
  type VerbCategory,
} from "@/core/writing/content";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "../store";
import { itemLabel } from "../form/section-panel";

type Tab = "tips" | "verbs" | "examples";

/** Section types that get a writing-help panel. */
export function hasWritingHelp(type: Section["type"]): boolean {
  return !!GUIDANCE[type];
}

const VERB_TYPES: Section["type"][] = ["summary", "experience", "military", "projects", "volunteering", "education", "custom"];

function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function appendParagraph(rt: RichText, text: string): RichText {
  const p = richTextFromPlain(text).content;
  return isRichTextEmpty(rt) ? { type: "doc", content: p } : { type: "doc", content: [...rt.content, ...p] };
}

/**
 * Inserts an example into the section: a paragraph for the summary, a
 * bullet in the chosen item's description, or a new item holding the
 * bullet. Returns the item that received it.
 */
function insertExample(section: Section, text: string, targetItemId: string | null): string | null {
  if (section.type === "summary") {
    editorActions.update((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s?.type === "summary") s.content = appendParagraph(s.content as RichText, text);
    });
    return null;
  }
  let itemId = targetItemId;
  editorActions.update((d) => {
    const s = d.sections.find((x) => x.id === section.id);
    if (!s || s.type === "summary") return;
    const items = s.items as Array<SectionItem & { description?: RichText }>;
    let it = items.find((x) => x.id === targetItemId);
    if (!it) {
      it = createItem(section.type as ItemSectionType) as SectionItem & { description?: RichText };
      items.push(it);
      itemId = it.id;
    }
    if (it.description) it.description = appendBullet(it.description as RichText, text);
  });
  return itemId;
}

export function WritingHelp({ section }: { section: Section }) {
  const t = useTranslations("writing");
  const ui: Language = useLocale() === "he" ? "he" : "en";
  const doc = useEditorStore((s) => s.doc!);
  const activeItemId = useEditorStore((s) => s.activeItemId);
  const lang = doc.language;
  const other: Language = lang === "he" ? "en" : "he";
  const examples = examplesFor(section.type);
  const fields = EXAMPLE_FIELDS.filter((f) => examples[f]?.length);
  const hasExamples = fields.length > 0 && !!EXAMPLE_KIND[section.type];
  const hasVerbs = VERB_TYPES.includes(section.type);
  const tabs: Tab[] = ["tips", ...(hasVerbs ? (["verbs"] as const) : []), ...(hasExamples ? (["examples"] as const) : [])];
  const [tab, setTab] = useState<Tab>(hasExamples ? "examples" : "tips");
  const [field, setField] = useState<ExampleField>(fields.includes("mechanical") ? "mechanical" : (fields[0] ?? "general"));
  const [category, setCategory] = useState<VerbCategory>("design");
  const items = section.type === "summary" ? [] : (section.items as SectionItem[]);
  // The selected item, else the first one (usually the latest role).
  const defaultTarget = items.find((i) => i.id === activeItemId)?.id ?? items[0]?.id ?? "";
  const [target, setTarget] = useState<string>("");
  const effectiveTarget = target === "new" ? null : items.some((i) => i.id === target) ? target : defaultTarget || null;
  const targetId = useId();
  const tips = GUIDANCE[section.type]?.[ui] ?? [];

  return (
    <div className="grid gap-3 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-950/20" data-testid="writing-help">
      <div role="tablist" aria-label={t("help")} className="flex gap-1">
        {tabs.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-background/70",
              tab === k && "bg-background text-foreground shadow-xs",
            )}
            data-testid={`help-tab-${k}`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === "tips" && (
        <div role="tabpanel" className="grid gap-1.5">
          <p className="text-xs font-semibold">{t("tipsTitle")}</p>
          <ul className="grid list-disc gap-1 ps-5 text-sm">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === "verbs" && (
        <div role="tabpanel" className="grid gap-2">
          <p className="text-xs text-muted-foreground">{t("verbsHint")}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("tabs.verbs")}>
            {VERB_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)} testId={`verb-cat-${c}`}>
                {t(`verbCategories.${c}`)}
              </Chip>
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ACTION_VERBS[category].map((v) => (
              <li key={v.en}>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(v[lang]).catch(() => undefined);
                    toast.success(t("copied", { word: v[lang] }));
                  }}
                  className="group flex w-full items-center justify-between gap-1 rounded-md border bg-background px-2 py-1 text-start text-sm hover:border-primary/60"
                  data-testid="verb"
                >
                  <span className="min-w-0">
                    <bdi lang={lang} className="block truncate font-medium">
                      {v[lang]}
                    </bdi>
                    <bdi lang={other} className="block truncate text-xs text-muted-foreground">
                      {v[other]}
                    </bdi>
                  </span>
                  <CopyIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "examples" && (
        <div role="tabpanel" className="grid gap-2">
          <p className="text-xs text-muted-foreground">{section.type === "summary" ? t("summaryExamplesHint") : t("examplesHint")}</p>
          {fields.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("fieldsLabel")}>
              {fields.map((f) => (
                <Chip key={f} active={field === f} onClick={() => setField(f)} testId={`example-field-${f}`}>
                  {t(`fields.${f}`)}
                </Chip>
              ))}
            </div>
          )}
          {section.type !== "summary" && (
            <div className="flex items-center gap-2">
              <Label htmlFor={targetId} className="shrink-0 text-xs">
                {t("addTo")}
              </Label>
              <NativeSelect
                id={targetId}
                value={effectiveTarget ?? "new"}
                onChange={(e) => setTarget(e.target.value)}
                className="h-8 text-xs"
                data-testid="example-target"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {itemLabel(doc, section as Exclude<Section, { type: "summary" }>, it).title || t("untitled")}
                  </option>
                ))}
                <option value="new">{t("newItem")}</option>
              </NativeSelect>
            </div>
          )}
          <ul className="grid gap-1.5">
            {(examples[field] ?? []).map((ex) => (
              <li key={ex.en} className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm" data-testid="example">
                <bdi lang={lang} dir={lang === "he" ? "rtl" : "ltr"} className="block min-w-0 flex-1">
                  {ex[lang]}
                </bdi>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 px-2"
                  aria-label={t("addExample")}
                  onClick={() => {
                    const itemId = insertExample(section, ex[lang], effectiveTarget);
                    useEditorStore.getState().focus(section.id, itemId, true);
                    toast.success(t("added"));
                  }}
                  data-testid="add-example"
                >
                  <PlusIcon />
                  {t("add")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
