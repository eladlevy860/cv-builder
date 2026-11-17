"use client";

import { useCallback, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { HistoryIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Snapshot } from "@/core/model/schema";
import { getStorage } from "@/core/storage";
import { useEditorStore } from "./store";
import { saveSnapshot } from "./use-autosave";

export function HistoryDialog() {
  const t = useTranslations("history");
  const te = useTranslations("editor");
  const locale = useLocale();
  const docId = useEditorStore((s) => s.doc!.id);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Snapshot[]>([]);
  const [name, setName] = useState("");
  const id = useId();

  const refresh = useCallback(async () => setList(await getStorage().listSnapshots(docId)), [docId]);

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void refresh();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={te("history")} title={te("history")} data-testid="history-btn">
          <HistoryIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveSnapshot(name.trim() || null, false);
            setName("");
            toast.success(te("versionSaved"));
            await refresh();
          }}
        >
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor={id}>{t("nameLabel")}</Label>
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} data-testid="version-name" />
          </div>
          <Button type="submit" data-testid="save-version">
            {t("save")}
          </Button>
        </form>
        <ul className="grid max-h-[50dvh] gap-2 overflow-y-auto" data-testid="version-list">
          {list.length === 0 && <li className="text-sm text-muted-foreground">{t("empty")}</li>}
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <bdi className="truncate font-medium">{s.name ?? fmt.format(new Date(s.createdAt))}</bdi>
                  <Badge variant="muted">{s.auto ? t("auto") : t("manual")}</Badge>
                </div>
                {s.name && <time className="text-xs text-muted-foreground">{fmt.format(new Date(s.createdAt))}</time>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  useEditorStore.getState().replace(s.data.type === "cv" ? s.data : useEditorStore.getState().doc!);
                  toast.success(t("restored"));
                  setOpen(false);
                }}
              >
                <RotateCcwIcon className="rtl:-scale-x-100" />
                {t("restore")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("delete")}
                onClick={async () => {
                  await getStorage().deleteSnapshot(s.id);
                  await refresh();
                }}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
