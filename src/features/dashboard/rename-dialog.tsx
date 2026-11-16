"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: string;
  onSubmit: (value: string) => void;
}) {
  const t = useTranslations();
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Re-mount the form each time the dialog opens so it starts from the current title. */}
        {open && <RenameForm id={id} initial={initial} onSubmit={(v) => { onSubmit(v); onOpenChange(false); }} onCancel={() => onOpenChange(false)} title={t("rename.title")} label={t("rename.label")} saveLabel={t("common.save")} cancelLabel={t("common.cancel")} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  id,
  initial,
  onSubmit,
  onCancel,
  title,
  label,
  saveLabel,
  cancelLabel,
}: {
  id: string;
  initial: string;
  onSubmit: (v: string) => void;
  onCancel: () => void;
  title: string;
  label: string;
  saveLabel: string;
  cancelLabel: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (v) onSubmit(v);
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} value={value} onChange={(e) => setValue(e.target.value)} autoFocus maxLength={120} data-testid="rename-input" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={!value.trim()}>
          {saveLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
