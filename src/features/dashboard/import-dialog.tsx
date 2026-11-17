"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { applyImport, parseImport, type ImportResult } from "@/core/export/backup";
import { getStorage } from "@/core/storage";

type T = ReturnType<typeof useTranslations<"import">>;

export function summarizeImport(t: T, r: ImportResult): string {
  const parts = [t("result", { added: r.added + r.copied })];
  if (r.copied) parts.push(t("resultCopies", { count: r.copied }));
  if (r.skipped) parts.push(t("resultSkipped", { count: r.skipped }));
  return parts.join(" · ");
}

/** Reads a JSON file chosen by the user and imports it (merge mode). */
export async function importFile(file: File, mode: "merge" | "replace" = "merge") {
  const text = await file.text();
  const parsed = parseImport(text);
  const result = await applyImport(getStorage(), parsed, mode);
  return { parsed, result };
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations();
  const ti = useTranslations("import");
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { result } = await importFile(file, mode);
      toast.success(summarizeImport(ti, result));
      onOpenChange(false);
    } catch (e) {
      toast.error(t("import.failed", { message: (e as Error).message }));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.body")}</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-medium">{t("import.modeLabel")}</legend>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "merge" | "replace")}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="merge" id={`${id}-merge`} />
              <Label htmlFor={`${id}-merge`} className="font-normal">
                {t("import.merge")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="replace" id={`${id}-replace`} />
              <Label htmlFor={`${id}-replace`} className="font-normal">
                {t("import.replace")}
              </Label>
            </div>
          </RadioGroup>
          {mode === "replace" && <p className="text-sm text-destructive">{t("import.replaceWarning")}</p>}
        </fieldset>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          id={`${id}-file`}
          data-testid="import-file"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={busy}>
            <UploadIcon />
            {t("import.choose")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
