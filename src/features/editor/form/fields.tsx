"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { DateRange, Language, Skill, YearMonth } from "@/core/model/schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "../store";

/** Language of the document being edited (drives spellcheck via `lang`). */
export function useDocLang(): Language {
  return useEditorStore((s) => s.doc?.language ?? "he");
}

export function FieldShell({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
  className,
  onBlur,
  multiline,
  ltr,
  testId,
  autoComplete,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  placeholder?: string;
  type?: string;
  className?: string;
  onBlur?: () => void;
  multiline?: boolean;
  /** Always left-to-right (email, URL, phone). */
  ltr?: boolean;
  testId?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const lang = useDocLang();
  const common = {
    id,
    value,
    placeholder,
    lang: ltr ? undefined : lang,
    dir: ltr ? "ltr" : "auto",
    "aria-describedby": hint ? `${id}-hint` : undefined,
    "data-testid": testId,
    onBlur,
    autoComplete: autoComplete ?? "off",
  } as const;
  return (
    <FieldShell id={id} label={label} hint={hint} className={className}>
      {multiline ? (
        <Textarea {...common} onChange={(e) => onChange(e.target.value)} rows={2} />
      ) : (
        <Input {...common} type={type} onChange={(e) => onChange(e.target.value)} className={ltr ? "text-start" : undefined} />
      )}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function useMonthNames(): string[] {
  const locale = useLocale();
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
  }, [locale]);
}

export function YearMonthField({
  label,
  value,
  onChange,
  disabled,
  testId,
}: {
  label: ReactNode;
  value: YearMonth | null;
  onChange: (v: YearMonth | null) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const t = useTranslations("fields");
  const months = useMonthNames();
  const id = useId();
  // Keep the typed year locally so partial input ("20") doesn't get rejected.
  const [yearText, setYearText] = useState(value ? String(value.year) : "");
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if ((value?.year ?? null) !== (Number(yearText) || null)) setYearText(value ? String(value.year) : "");
  }

  function setYear(text: string) {
    const clean = text.replace(/\D/g, "").slice(0, 4);
    setYearText(clean);
    const y = Number(clean);
    if (clean.length === 4 && y >= 1900 && y <= 2200) onChange({ year: y, ...(value?.month ? { month: value.month } : {}) });
    else if (clean === "") onChange(null);
  }

  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <div>
          <label htmlFor={`${id}-m`} className="sr-only">
            {t("month")}
          </label>
          <NativeSelect
            id={`${id}-m`}
            value={value?.month ?? ""}
            disabled={disabled || !value}
            data-testid={testId ? `${testId}-month` : undefined}
            onChange={(e) => {
              if (!value) return;
              const m = Number(e.target.value);
              onChange(m ? { year: value.year, month: m } : { year: value.year });
            }}
          >
            <option value="">{t("noMonth")}</option>
            {months.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <label htmlFor={`${id}-y`} className="sr-only">
            {t("year")}
          </label>
          <Input
            id={`${id}-y`}
            inputMode="numeric"
            dir="ltr"
            placeholder={t("year")}
            value={yearText}
            disabled={disabled}
            data-testid={testId ? `${testId}-year` : undefined}
            onChange={(e) => setYear(e.target.value)}
            className="text-center"
          />
        </div>
      </div>
    </fieldset>
  );
}

export function DateRangeField({ value, onChange, testId }: { value: DateRange; onChange: (v: DateRange) => void; testId?: string }) {
  const t = useTranslations("fields");
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-3">
        <YearMonthField label={t("startDate")} value={value.start} onChange={(start) => onChange({ ...value, start })} testId={testId ? `${testId}-start` : undefined} />
        <YearMonthField
          label={t("endDate")}
          value={value.present ? null : value.end}
          disabled={value.present}
          onChange={(end) => onChange({ ...value, end })}
          testId={testId ? `${testId}-end` : undefined}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`${id}-present`}
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={value.present}
          onChange={(e) => onChange({ ...value, present: e.target.checked })}
          data-testid={testId ? `${testId}-present` : undefined}
        />
        <label htmlFor={`${id}-present`} className="text-sm">
          {t("present")}
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Levels and chips
// ---------------------------------------------------------------------------

export function LevelSelect({
  value,
  onChange,
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
}) {
  const t = useTranslations("fields");
  return (
    <NativeSelect aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} className={className}>
      <option value={0}>{t("levelNone")}</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {"●".repeat(n) + "○".repeat(5 - n)}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Tag input for skills. Enter or comma adds; Backspace on empty removes the last. */
export function SkillsInput({
  skills,
  onAdd,
  onRemove,
  onLevel,
  showLevels,
  testId,
}: {
  skills: Skill[];
  onAdd: (names: string[]) => void;
  onRemove: (id: string) => void;
  onLevel: (id: string, level: number) => void;
  showLevels: boolean;
  testId?: string;
}) {
  const t = useTranslations("fields");
  const lang = useDocLang();
  const id = useId();
  const [text, setText] = useState("");

  function commit(raw = text) {
    const names = raw
      .split(/[,\n،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length) onAdd(names);
    setText("");
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t("skills")}</Label>
      {showLevels ? (
        <ul className="grid gap-1.5">
          {skills.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <bdi className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-2 py-1.5 text-sm">{s.name}</bdi>
              <LevelSelect value={s.level} onChange={(v) => onLevel(s.id, v)} label={t("skillLevel", { name: s.name })} className="w-32" />
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t("removeSkill", { name: s.name })}
                onClick={() => onRemove(s.id)}
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        skills.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <li key={s.id} className="flex items-center gap-1 rounded-full border bg-secondary py-0.5 ps-2.5 pe-1 text-sm">
                <bdi>{s.name}</bdi>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label={t("removeSkill", { name: s.name })}
                  onClick={() => onRemove(s.id)}
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <Input
        id={id}
        value={text}
        dir="auto"
        lang={lang}
        placeholder={t("addSkillPlaceholder")}
        data-testid={testId}
        onChange={(e) => {
          const v = e.target.value;
          if (/[,،]/.test(v)) commit(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !text && skills.length) {
            onRemove(skills[skills.length - 1].id);
          }
        }}
        onBlur={() => commit()}
      />
    </div>
  );
}
