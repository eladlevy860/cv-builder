"use client";

import { useMemo, useState } from "react";
import { produce } from "immer";
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { CvDocument } from "@/core/model/schema";
import { applyTemplate } from "@/templates/apply";
import { TEMPLATES, type TemplateMeta } from "@/templates/meta";
import { CvThumbnail } from "@/features/thumbnail/cv-thumbnail";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "../store";

type Filter = "all" | "ats" | "one" | "two" | "photo";
const FILTERS: Filter[] = ["all", "ats", "one", "two", "photo"];

function matches(meta: TemplateMeta, f: Filter): boolean {
  switch (f) {
    case "ats":
      return meta.atsFriendly;
    case "one":
      return meta.columns === 1;
    case "two":
      return meta.columns === 2;
    case "photo":
      return meta.supportsPhoto;
    default:
      return true;
  }
}

/**
 * Template picker. Every thumbnail is the user's own CV rendered in that
 * template (with the theme the switch would produce). Picking one applies
 * it at once (undoable); the drawer opens over the form so the full
 * preview stays visible.
 */
export function TemplateDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");
  const ui = useLocale() === "he" ? "he" : "en";
  const doc = useEditorStore((s) => s.doc!);
  const [filter, setFilter] = useState<Filter>("all");

  // Thumbnails follow the document as it was when the drawer opened; switching
  // templates while it is open does not re-render all ten.
  const [snapshot, setSnapshot] = useState<CvDocument | null>(null);
  if (open && !snapshot) setSnapshot(doc);
  if (!open && snapshot) setSnapshot(null);

  const previews = useMemo(() => {
    if (!snapshot) return {};
    return Object.fromEntries(TEMPLATES.map((m) => [m.id, produce(snapshot, (d) => applyTemplate(d, m.id))]));
  }, [snapshot]);

  const list = TEMPLATES.filter((m) => matches(m, filter));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="start" className="sm:max-w-2xl" data-testid="template-drawer">
        <div className="grid gap-3 border-b p-4 pe-12">
          <div>
            <SheetTitle className="text-lg font-semibold">{t("title")}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">{t("subtitle")}</SheetDescription>
          </div>
          <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  filter === f && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                data-testid={`template-filter-${f}`}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div role="group" aria-label={t("title")} className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {list.map((m) => {
              const selected = doc.templateId === m.id;
              const preview = previews[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => editorActions.update((d) => applyTemplate(d, m.id))}
                  className={cn(
                    "group grid gap-2 rounded-xl border p-2 text-start transition-colors hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    selected && "border-primary bg-accent ring-1 ring-primary",
                  )}
                  data-testid={`template-card-${m.id}`}
                >
                  <div className="relative">
                    {preview && <CvThumbnail doc={preview} className="rounded-sm border shadow-xs" label={m.name[ui]} />}
                    {selected && (
                      <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                        <CheckIcon className="size-4" aria-hidden />
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{m.name[ui]}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{m.description[ui]}</span>
                  <span className="flex flex-wrap gap-1">
                    {m.atsFriendly && <Badge variant="muted">{tc("ats")}</Badge>}
                    <Badge variant="muted">{m.columns === 2 ? tc("twoColumns") : tc("oneColumn")}</Badge>
                    {m.supportsPhoto && <Badge variant="muted">{tc("photo")}</Badge>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
