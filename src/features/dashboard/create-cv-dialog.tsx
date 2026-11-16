"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon, FileIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCv } from "@/core/model/factory";
import type { Language } from "@/core/model/schema";
import { createSampleCv } from "@/core/samples";
import { getStorage } from "@/core/storage";
import { applyTemplate } from "@/templates/apply";
import { TEMPLATES } from "@/templates/meta";
import { cn } from "@/lib/utils";
import { DocThumbnail } from "./doc-thumbnail";
import { importFile, summarizeImport } from "./import-dialog";

type Step = 0 | 1 | 2;

export function CreateCvDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const t = useTranslations();
  const ti = useTranslations("import");
  const uiLocale = useLocale();
  const ui: Language = uiLocale === "he" ? "he" : "en";
  const [step, setStep] = useState<Step>(0);
  const [language, setLanguage] = useState<Language>(ui);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset(nextOpen: boolean) {
    if (!nextOpen) {
      setStep(0);
      setBusy(false);
    }
    onOpenChange(nextOpen);
  }

  async function start(kind: "blank" | "sample") {
    setBusy(true);
    try {
      const doc = kind === "sample" ? createSampleCv(language) : createCv({ language });
      applyTemplate(doc, templateId, true);
      await getStorage().putDocument(doc);
      toast.success(t("create.created"));
      onCreated?.(doc.id);
      reset(false);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  function choose(kind: "blank" | "sample" | "import") {
    if (kind === "import") fileRef.current?.click();
    else void start(kind);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { result } = await importFile(file);
      toast.success(summarizeImport(ti, result));
      if (result.ids[0]) onCreated?.(result.ids[0]);
      reset(false);
    } catch (e) {
      toast.error(t("import.failed", { message: (e as Error).message }));
      setBusy(false);
    }
  }

  const steps = [t("create.stepLanguage"), t("create.stepTemplate"), t("create.stepStart")];
  // Directional icons: "back" points to the inline-start side, "next" to the inline-end side.
  const BackIcon = ArrowLeftIcon;
  const NextIcon = ArrowRightIcon;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-3xl" data-testid="create-dialog">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <ol className="mt-1 flex items-center gap-2 text-xs text-muted-foreground" aria-label={t("create.title")}>
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border text-[10px] font-semibold",
                    i <= step && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn(i === step && "font-medium text-foreground")}>{s}</span>
                {i < steps.length - 1 && <span className="h-px w-6 bg-border" aria-hidden />}
              </li>
            ))}
          </ol>
        </DialogHeader>

        {step === 0 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-medium">{t("create.languageQuestion")}</h3>
              <DialogDescription>{t("create.languageHint")}</DialogDescription>
            </div>
            <div role="group" aria-label={t("create.stepLanguage")} className="grid gap-3 sm:grid-cols-2">
              {(["he", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  
                  aria-pressed={language === l}
                  data-testid={`create-lang-${l}`}
                  onClick={() => setLanguage(l)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 text-start transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    language === l && "border-primary bg-accent ring-1 ring-primary",
                  )}
                >
                  <span
                    lang={l}
                    className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary text-lg font-bold"
                  >
                    {l === "he" ? "עב" : "EN"}
                  </span>
                  <span className="grid gap-0.5">
                    <span className="font-medium">{l === "he" ? t("create.heTitle") : t("create.enTitle")}</span>
                    <span className="text-sm text-muted-foreground">{l === "he" ? t("create.heBody") : t("create.enBody")}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="grid gap-3">
            <div>
              <h3 className="font-medium">{t("create.templateQuestion")}</h3>
              <DialogDescription>{t("create.templateHint")}</DialogDescription>
            </div>
            <div
              role="group"
              aria-label={t("create.stepTemplate")}
              className="grid max-h-[55dvh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-4"
            >
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  
                  aria-pressed={templateId === tpl.id}
                  data-testid={`create-template-${tpl.id}`}
                  onClick={() => setTemplateId(tpl.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-2 text-start transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    templateId === tpl.id && "border-primary bg-accent ring-1 ring-primary",
                  )}
                >
                  <DocThumbnail templateId={tpl.id} language={language} className="rounded-sm border" />
                  <span className="text-sm font-medium">{tpl.name[ui]}</span>
                  <span className="flex flex-wrap gap-1">
                    {tpl.atsFriendly && <Badge variant="muted">{t("common.ats")}</Badge>}
                    <Badge variant="muted">{tpl.columns === 2 ? t("common.twoColumns") : t("common.oneColumn")}</Badge>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-3">
            <h3 className="font-medium">{t("create.startQuestion")}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "blank", icon: FileIcon, title: t("create.blank"), body: t("create.blankBody") },
                  { key: "sample", icon: SparklesIcon, title: t("create.sample"), body: t("create.sampleBody") },
                  { key: "import", icon: UploadIcon, title: t("create.importJson"), body: t("create.importBody") },
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  disabled={busy}
                  data-testid={`create-start-${o.key}`}
                  onClick={() => choose(o.key)}
                  className="flex flex-col gap-2 rounded-xl border p-4 text-start transition-colors hover:border-primary hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                >
                  <o.icon className="size-5 text-primary" aria-hidden />
                  <span className="font-medium">{o.title}</span>
                  <span className="text-sm text-muted-foreground">{o.body}</span>
                </button>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              data-testid="create-import-file"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </section>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? reset(false) : setStep((s) => (s - 1) as Step))}>
            {step > 0 && <BackIcon className="rtl:-scale-x-100" />}
            {step === 0 ? t("common.cancel") : t("common.back")}
          </Button>
          {step < 2 && (
            <Button onClick={() => setStep((s) => (s + 1) as Step)} data-testid="create-next">
              {t("common.next")}
              <NextIcon className="rtl:-scale-x-100" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
