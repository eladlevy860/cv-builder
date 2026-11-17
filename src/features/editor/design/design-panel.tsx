"use client";

import { useId, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { CheckIcon, LayoutTemplateIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { formatYearMonth } from "@/core/i18n-doc/dates";
import { BODY_FONTS, FONTS, HEADING_FONTS, type FontId } from "@/core/model/fonts";
import { DATE_FORMATS, type Theme } from "@/core/model/schema";
import { resetDesign } from "@/templates/apply";
import { getTemplateMeta } from "@/templates/meta";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "../store";

const HEX = /^#[0-9a-fA-F]{6}$/;

function setTheme<K extends keyof Theme>(key: K, value: Theme[K]) {
  editorActions.update((d) => void (d.theme[key] = value), { coalesce: `theme.${key}` });
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <output htmlFor={id} className="text-sm text-muted-foreground tabular-nums" dir="ltr">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-5 w-full cursor-pointer accent-primary"
        data-testid={testId}
      />
    </div>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  disabled,
  onChange,
  testId,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className={cn(disabled && "opacity-60")}>
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}

function AccentPicker({ value, presets }: { value: string; presets: string[] }) {
  const t = useTranslations("design");
  const [hex, setHex] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Keep the text box in sync with undo/redo and swatch clicks.
  if (value !== lastValue) {
    setLastValue(value);
    setHex(value);
  }
  const inPresets = presets.some((p) => p.toLowerCase() === value.toLowerCase());
  return (
    <div className="grid gap-3">
      <RadioGroupPrimitive.Root
        value={inPresets ? value.toLowerCase() : ""}
        onValueChange={(v) => setTheme("accentColor", v)}
        aria-label={t("color")}
        className="flex flex-wrap gap-2"
        data-testid="accent-presets"
      >
        {presets.map((c) => (
          <RadioGroupPrimitive.Item
            key={c}
            value={c.toLowerCase()}
            aria-label={c}
            title={c}
            className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 data-[state=checked]:ring-2 data-[state=checked]:ring-foreground/70"
            style={{ background: c }}
          >
            <RadioGroupPrimitive.Indicator>
              <CheckIcon className="size-4 text-white drop-shadow" aria-hidden />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs" title={t("customColor")}>
          <span className="sr-only">{t("customColor")}</span>
          <input
            type="color"
            value={value}
            onChange={(e) => setTheme("accentColor", e.target.value)}
            className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 p-0"
            data-testid="accent-custom"
          />
        </label>
        <Input
          aria-label={t("hex")}
          dir="ltr"
          value={hex}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            setHex(v);
            const full = v.startsWith("#") ? v : `#${v}`;
            if (HEX.test(full)) setTheme("accentColor", full.toLowerCase());
          }}
          aria-invalid={!HEX.test(hex.startsWith("#") ? hex : `#${hex}`)}
          className="h-9 w-28 font-mono text-sm"
          data-testid="accent-hex"
        />
      </div>
    </div>
  );
}

function FontSelect({ label, value, options, onChange, testId }: { label: string; value: FontId; options: readonly FontId[]; onChange: (v: FontId) => void; testId?: string }) {
  const id = useId();
  const ui = useLocale() === "he" ? "he" : "en";
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as FontId)} data-testid={testId}>
        {options.map((f) => (
          <option key={f} value={f}>
            {FONTS[f].label[ui]}
          </option>
        ))}
      </NativeSelect>
      <p className="truncate text-lg leading-snug" style={{ fontFamily: FONTS[value].stack }} aria-hidden>
        אבגדה Abcde 0123
      </p>
    </div>
  );
}

const HEADING_STYLES: Theme["headingStyle"][] = ["line", "plain", "filled", "caps"];

function HeadingStylePicker({ value }: { value: Theme["headingStyle"] }) {
  const t = useTranslations("design");
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => setTheme("headingStyle", v as Theme["headingStyle"])}
      aria-label={t("headingStyle")}
      className="grid grid-cols-2 gap-2"
      data-testid="heading-styles"
    >
      {HEADING_STYLES.map((s) => (
        <RadioGroupPrimitive.Item
          key={s}
          value={s}
          className="grid gap-1.5 rounded-lg border p-2.5 text-start outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-accent data-[state=checked]:ring-1 data-[state=checked]:ring-primary"
          data-testid={`heading-style-${s}`}
        >
          <span
            aria-hidden
            className={cn(
              "text-xs font-bold text-primary",
              s === "line" && "border-b border-primary/50 pb-0.5",
              s === "filled" && "rounded-sm bg-primary/12 px-1.5 py-0.5",
              s === "caps" && "tracking-[0.12em] uppercase",
            )}
          >
            {t("headingSample")}
          </span>
          <span className="text-xs text-muted-foreground">{t(`headingStyles.${s}`)}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export function DesignPanel({ onChangeTemplate }: { onChangeTemplate: () => void }) {
  const t = useTranslations("design");
  const ui = useLocale() === "he" ? "he" : "en";
  const theme = useEditorStore((s) => s.doc!.theme);
  const templateId = useEditorStore((s) => s.doc!.templateId);
  const language = useEditorStore((s) => s.doc!.language);
  const hasPhoto = useEditorStore((s) => !!s.doc!.basics.photo);
  const meta = getTemplateMeta(templateId);
  const sample = { year: 2025, month: 5 };

  return (
    <div className="grid gap-4 p-4" data-testid="design-panel">
      <section className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <LayoutTemplateIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{t("template")}</p>
          <p className="truncate font-medium" data-testid="design-template-name">
            {meta.name[ui]}
          </p>
        </div>
        {meta.atsFriendly && <Badge variant="muted">{t("ats")}</Badge>}
        <Button variant="outline" size="sm" onClick={onChangeTemplate} data-testid="design-change-template">
          {t("changeTemplate")}
        </Button>
      </section>

      <Group title={t("color")}>
        <AccentPicker value={theme.accentColor} presets={meta.accentPresets} />
      </Group>

      <Group title={t("typography")}>
        <FontSelect label={t("fontBody")} value={theme.fontBody} options={BODY_FONTS} onChange={(v) => setTheme("fontBody", v)} testId="font-body" />
        <FontSelect label={t("fontHeading")} value={theme.fontHeading} options={HEADING_FONTS} onChange={(v) => setTheme("fontHeading", v)} testId="font-heading" />
        <SliderField
          label={t("fontSize")}
          value={theme.baseFontSize}
          min={8}
          max={13}
          step={0.5}
          display={t("pt", { value: theme.baseFontSize })}
          onChange={(v) => setTheme("baseFontSize", v)}
          testId="font-size"
        />
        <SliderField
          label={t("lineHeight")}
          value={theme.lineHeight}
          min={1.1}
          max={1.8}
          step={0.05}
          display={theme.lineHeight.toFixed(2)}
          onChange={(v) => setTheme("lineHeight", Math.round(v * 100) / 100)}
          testId="line-height"
        />
      </Group>

      <Group title={t("headingStyle")}>
        <HeadingStylePicker value={theme.headingStyle} />
      </Group>

      <Group title={t("layout")}>
        <SliderField
          label={t("sectionSpacing")}
          value={theme.sectionSpacing}
          min={1}
          max={12}
          step={0.5}
          display={t("mm", { value: theme.sectionSpacing })}
          onChange={(v) => setTheme("sectionSpacing", v)}
          testId="section-spacing"
        />
        <SliderField
          label={t("margins")}
          value={theme.pageMargins}
          min={6}
          max={25}
          step={1}
          display={t("mm", { value: theme.pageMargins })}
          onChange={(v) => setTheme("pageMargins", v)}
          testId="page-margins"
        />
        <div className="grid gap-1.5">
          <span className="text-sm font-medium" id="page-size-label">
            {t("pageSize")}
          </span>
          <RadioGroupPrimitive.Root
            value={theme.pageSize}
            onValueChange={(v) => setTheme("pageSize", v as Theme["pageSize"])}
            aria-labelledby="page-size-label"
            className="grid grid-cols-2 gap-2"
          >
            {(["A4", "Letter"] as const).map((s) => (
              <RadioGroupPrimitive.Item
                key={s}
                value={s}
                className="grid rounded-lg border px-3 py-2 text-start text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-accent data-[state=checked]:ring-1 data-[state=checked]:ring-primary"
                data-testid={`page-size-${s}`}
              >
                <span className="font-medium">{s === "A4" ? "A4" : t("letter")}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {s === "A4" ? "210 × 297 mm" : "8.5 × 11 in"}
                </span>
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>
        </div>
      </Group>

      <Group title={t("details")}>
        <SwitchField
          label={t("showPhoto")}
          hint={!meta.supportsPhoto ? t("photoUnsupported") : !hasPhoto ? t("noPhoto") : undefined}
          checked={theme.showPhoto && meta.supportsPhoto}
          disabled={!meta.supportsPhoto}
          onChange={(v) => setTheme("showPhoto", v)}
          testId="show-photo"
        />
        <SwitchField label={t("showIcons")} checked={theme.showIcons} onChange={(v) => setTheme("showIcons", v)} testId="show-icons" />
        <div className="grid gap-1.5">
          <Label htmlFor="date-format">{t("dateFormat")}</Label>
          <NativeSelect
            id="date-format"
            value={theme.dateFormat}
            onChange={(e) => setTheme("dateFormat", e.target.value as Theme["dateFormat"])}
            data-testid="date-format"
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {formatYearMonth(sample, language, f)}
              </option>
            ))}
          </NativeSelect>
        </div>
        {language === "he" && (
          <div className="grid gap-1.5">
            <Label htmlFor="present-label">{t("presentLabel")}</Label>
            <NativeSelect
              id="present-label"
              value={theme.presentLabelHe}
              onChange={(e) => setTheme("presentLabelHe", e.target.value as Theme["presentLabelHe"])}
            >
              <option value="היום">05/2025 – היום</option>
              <option value="כיום">05/2025 – כיום</option>
            </NativeSelect>
          </div>
        )}
      </Group>

      <Button
        variant="ghost"
        className="justify-self-start"
        onClick={() => {
          editorActions.update((d) => resetDesign(d));
          toast.success(t("resetDone"));
        }}
        data-testid="reset-design"
      >
        <RotateCcwIcon />
        {t("reset")}
      </Button>
    </div>
  );
}
