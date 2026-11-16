"use client";

import { useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { ImageUpIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { formatIsraeliPhone } from "@/core/bidi";
import { newId } from "@/core/model/factory";
import { EXTRA_FIELD_KINDS, type Basics, type Photo } from "@/core/model/schema";
import { getTemplateMeta } from "@/templates/meta";
import { editorActions, useEditorStore } from "../store";
import { TextField } from "./fields";

function setBasics<K extends keyof Basics>(key: K, value: Basics[K]) {
  editorActions.update(
    (d) => {
      d.basics[key] = value as never;
    },
    { coalesce: `basics.${key}` },
  );
}

/** Downscales an image file to a JPEG data URL (keeps documents small). */
async function readImage(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BasicsForm() {
  const t = useTranslations("fields");
  const basics = useEditorStore((s) => s.doc!.basics);

  return (
    <div className="grid gap-4" data-testid="basics-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t("name")} value={basics.name} onChange={(v) => setBasics("name", v)} testId="field-name" autoComplete="name" />
        <TextField
          label={t("headline")}
          placeholder={t("headlinePlaceholder")}
          value={basics.headline}
          onChange={(v) => setBasics("headline", v)}
          testId="field-headline"
        />
        <TextField label={t("email")} value={basics.email} onChange={(v) => setBasics("email", v)} ltr type="email" testId="field-email" autoComplete="email" />
        <TextField
          label={t("phone")}
          hint={t("phoneHint")}
          value={basics.phone}
          onChange={(v) => setBasics("phone", v)}
          onBlur={() => {
            const formatted = formatIsraeliPhone(useEditorStore.getState().doc!.basics.phone);
            if (formatted !== useEditorStore.getState().doc!.basics.phone) setBasics("phone", formatted);
          }}
          ltr
          type="tel"
          testId="field-phone"
          autoComplete="tel"
        />
        <TextField label={t("city")} value={basics.city} onChange={(v) => setBasics("city", v)} testId="field-city" />
      </div>
      <LinksEditor />
      <PhotoEditor />
      <ExtrasEditor />
    </div>
  );
}

function LinksEditor() {
  const t = useTranslations("fields");
  const links = useEditorStore((s) => s.doc!.basics.links);
  const update = (id: string, key: "label" | "url", value: string) =>
    editorActions.update(
      (d) => {
        const l = d.basics.links.find((x) => x.id === id);
        if (l) l[key] = value;
      },
      { coalesce: `link.${id}.${key}` },
    );
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{t("links")}</legend>
      {links.map((l) => (
        <div key={l.id} className="grid grid-cols-[8rem_1fr_auto] items-end gap-2">
          <TextField label={t("linkLabel")} value={l.label} onChange={(v) => update(l.id, "label", v)} />
          <TextField label={t("linkUrl")} value={l.url} onChange={(v) => update(l.id, "url", v)} ltr type="url" />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("removeLink")}
            onClick={() => editorActions.update((d) => void (d.basics.links = d.basics.links.filter((x) => x.id !== l.id)))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => editorActions.update((d) => void d.basics.links.push({ id: newId(), label: "", url: "" }))}
      >
        <PlusIcon />
        {t("addLink")}
      </Button>
    </fieldset>
  );
}

function PhotoEditor() {
  const t = useTranslations("fields");
  const photo = useEditorStore((s) => s.doc!.basics.photo);
  const showPhoto = useEditorStore((s) => s.doc!.theme.showPhoto);
  const supports = useEditorStore((s) => getTemplateMeta(s.doc!.templateId).supportsPhoto);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readImage(file);
      editorActions.update((d) => {
        d.basics.photo = { dataUrl, crop: { x: 0, y: 0, zoom: 1 }, shape: d.basics.photo?.shape ?? "circle" };
        d.theme.showPhoto = true;
      });
    } catch {
      toast.error(t("imageError"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const setCrop = (key: keyof Photo["crop"], value: number) =>
    editorActions.update(
      (d) => {
        if (d.basics.photo) d.basics.photo.crop[key] = value;
      },
      { coalesce: `photo.${key}` },
    );

  return (
    <fieldset className="grid gap-3 rounded-lg border border-dashed p-3">
      <legend className="px-1 text-sm font-medium">{t("photo")}</legend>
      <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        {photo && (
          <div className={`size-16 overflow-hidden bg-muted ${photo.shape === "circle" ? "rounded-full" : photo.shape === "rounded" ? "rounded-lg" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img
              src={photo.dataUrl}
              alt=""
              className="size-full object-cover"
              style={{ transform: `translate(${photo.crop.x}%, ${photo.crop.y}%) scale(${photo.crop.zoom})` }}
            />
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImageUpIcon />
          {photo ? t("replacePhoto") : t("uploadPhoto")}
        </Button>
        {photo && (
          <Button variant="ghost" size="sm" onClick={() => editorActions.update((d) => void (d.basics.photo = null))}>
            <Trash2Icon />
            {t("removePhoto")}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {photo && (
        <>
          <div className="flex items-center gap-2">
            <Switch
              id={`${id}-show`}
              checked={showPhoto}
              onCheckedChange={(v) => editorActions.update((d) => void (d.theme.showPhoto = v))}
            />
            <Label htmlFor={`${id}-show`} className="font-normal">
              {t("showPhoto")}
            </Label>
          </div>
          {!supports && <p className="text-xs text-amber-700 dark:text-amber-400">{t("photoUnsupported")}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <RangeField label={t("photoZoom")} min={1} max={3} step={0.05} value={photo.crop.zoom} onChange={(v) => setCrop("zoom", v)} />
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-shape`}>{t("photoShape")}</Label>
              <NativeSelect
                id={`${id}-shape`}
                value={photo.shape}
                onChange={(e) =>
                  editorActions.update((d) => {
                    if (d.basics.photo) d.basics.photo.shape = e.target.value as Photo["shape"];
                  })
                }
              >
                <option value="circle">{t("shapeCircle")}</option>
                <option value="rounded">{t("shapeRounded")}</option>
                <option value="square">{t("shapeSquare")}</option>
              </NativeSelect>
            </div>
            <RangeField label={t("photoX")} min={-40} max={40} step={1} value={photo.crop.x} onChange={(v) => setCrop("x", v)} ltr />
            <RangeField label={t("photoY")} min={-40} max={40} step={1} value={photo.crop.y} onChange={(v) => setCrop("y", v)} />
          </div>
        </>
      )}
    </fieldset>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  ltr,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Physical left/right control (image offset), so it does not mirror. */
  ltr?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="range"
        dir={ltr ? "ltr" : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--primary)]"
      />
    </div>
  );
}

function ExtrasEditor() {
  const t = useTranslations("fields");
  const ts = useTranslations("sections");
  const extras = useEditorStore((s) => s.doc!.basics.extras);
  const id = useId();
  const update = (xid: string, key: "label" | "value", value: string) =>
    editorActions.update(
      (d) => {
        const x = d.basics.extras.find((e) => e.id === xid);
        if (x) x[key] = value;
      },
      { coalesce: `extra.${xid}.${key}` },
    );
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{t("extras")}</legend>
      <p className="text-xs text-muted-foreground">{t("extrasHint")}</p>
      {extras.map((x) => (
        <div key={x.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
          {x.kind === "custom" ? (
            <TextField label={t("extraLabel")} value={x.label} onChange={(v) => update(x.id, "label", v)} />
          ) : (
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">{t("extraLabel")}</span>
              <span className="flex h-9 items-center text-sm text-muted-foreground">{t(`extraKinds.${x.kind}`)}</span>
            </div>
          )}
          <TextField label={t("extraValue")} value={x.value} onChange={(v) => update(x.id, "value", v)} />
          <Switch
            className="mb-2"
            aria-label={ts("show")}
            checked={x.visible}
            onCheckedChange={(v) =>
              editorActions.update((d) => {
                const e = d.basics.extras.find((y) => y.id === x.id);
                if (e) e.visible = v;
              })
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("removeExtra")}
            onClick={() => editorActions.update((d) => void (d.basics.extras = d.basics.extras.filter((e) => e.id !== x.id)))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          {t("addExtra")}
        </label>
        <NativeSelect
          id={id}
          value=""
          className="w-56"
          onChange={(e) => {
            const kind = e.target.value as (typeof EXTRA_FIELD_KINDS)[number];
            if (!kind) return;
            editorActions.update((d) => void d.basics.extras.push({ id: newId(), kind, label: "", value: "", visible: true }));
          }}
        >
          <option value="">+ {t("addExtra")}</option>
          {EXTRA_FIELD_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`extraKinds.${k}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </fieldset>
  );
}
