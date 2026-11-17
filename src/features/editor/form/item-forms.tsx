"use client";

import { useTranslations } from "next-intl";
import { formatIsraeliPhone } from "@/core/bidi";
import { createSkill } from "@/core/model/factory";
import type { Draft } from "immer";
import type { CvDocument, Section, SectionItem, SectionOf } from "@/core/model/schema";
import { editorActions } from "../store";
import { DateRangeField, LevelSelect, SkillsInput, TextField, YearMonthField } from "./fields";
import { RichTextEditor } from "./rich-text-editor";
import { BulletHints } from "../writing/length-hints";
import { Label } from "@/components/ui/label";
import { useId } from "react";

type ItemOf<T extends Section["type"]> = SectionOf<T> extends { items: Array<infer I> } ? I : never;

export function findItem(d: Draft<CvDocument>, sectionId: string, itemId: string): Draft<SectionItem> | undefined {
  const s = d.sections.find((x) => x.id === sectionId);
  if (!s || s.type === "summary") return undefined;
  return (s.items as Draft<SectionItem>[]).find((x) => x.id === itemId);
}

/** Returns a setter bound to one item; edits to the same field coalesce in undo history. */
function useItemSetter<I extends SectionItem>(sectionId: string, itemId: string) {
  return <K extends keyof I>(key: K, value: I[K]) =>
    editorActions.update(
      (d) => {
        const it = findItem(d, sectionId, itemId) as unknown as I | undefined;
        if (it) it[key] = value;
      },
      { coalesce: `${itemId}.${String(key)}` },
    );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function ItemForm({ section, item }: { section: Exclude<Section, { type: "summary" }>; item: SectionItem }) {
  switch (section.type) {
    case "experience":
    case "volunteering":
      return <ExperienceForm sectionId={section.id} item={item as ItemOf<"experience">} />;
    case "education":
      return <EducationForm sectionId={section.id} item={item as ItemOf<"education">} />;
    case "military":
      return <MilitaryForm sectionId={section.id} item={item as ItemOf<"military">} />;
    case "projects":
      return <ProjectForm sectionId={section.id} item={item as ItemOf<"projects">} />;
    case "skills":
      return <SkillGroupForm section={section} item={item as ItemOf<"skills">} />;
    case "languages":
      return <LanguageForm sectionId={section.id} item={item as ItemOf<"languages">} />;
    case "courses":
      return <CourseForm sectionId={section.id} item={item as ItemOf<"courses">} />;
    case "awards":
      return <AwardForm sectionId={section.id} item={item as ItemOf<"awards">} />;
    case "references":
      return <ReferenceForm sectionId={section.id} item={item as ItemOf<"references">} />;
    case "custom":
      return <CustomForm sectionId={section.id} item={item as ItemOf<"custom">} />;
  }
}

function ExperienceForm({ sectionId, item }: { sectionId: string; item: ItemOf<"experience"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"experience">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("role")} value={item.role} onChange={(v) => set("role", v)} testId="field-role" />
        <TextField label={t("organization")} value={item.organization} onChange={(v) => set("organization", v)} testId="field-organization" />
      </Grid2>
      <p className="-mt-1 text-xs text-muted-foreground">{t("organizationHint")}</p>
      <TextField label={t("location")} value={item.location} onChange={(v) => set("location", v)} />
      <DateRangeField value={item.dates} onChange={(v) => set("dates", v)} testId="field-dates" />
      <RichTextEditor
        label={t("description")}
        value={item.description}
        onChange={(v) => set("description", v)}
        testId="field-description"
        footer={<BulletHints value={item.description} role />}
      />
    </div>
  );
}

function EducationForm({ sectionId, item }: { sectionId: string; item: ItemOf<"education"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"education">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("degree")} value={item.degree} onChange={(v) => set("degree", v)} />
        <TextField label={t("field")} value={item.field} onChange={(v) => set("field", v)} />
      </Grid2>
      <Grid2>
        <TextField label={t("institution")} value={item.institution} onChange={(v) => set("institution", v)} />
        <TextField label={t("location")} value={item.location} onChange={(v) => set("location", v)} />
      </Grid2>
      <DateRangeField value={item.dates} onChange={(v) => set("dates", v)} />
      <TextField label={t("grade")} value={item.grade} onChange={(v) => set("grade", v)} />
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} footer={<BulletHints value={item.description} />} />
    </div>
  );
}

function MilitaryForm({ sectionId, item }: { sectionId: string; item: ItemOf<"military"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"military">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <TextField label={t("militaryRole")} hint={t("militaryRoleHint")} value={item.role} onChange={(v) => set("role", v)} testId="field-military-role" />
      <Grid2>
        <TextField label={t("unit")} value={item.unit} onChange={(v) => set("unit", v)} />
        <TextField label={t("rank")} value={item.rank} onChange={(v) => set("rank", v)} />
      </Grid2>
      <DateRangeField value={item.dates} onChange={(v) => set("dates", v)} />
      <TextField label={t("distinctions")} value={item.distinctions} onChange={(v) => set("distinctions", v)} />
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} footer={<BulletHints value={item.description} />} />
    </div>
  );
}

function ProjectForm({ sectionId, item }: { sectionId: string; item: ItemOf<"projects"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"projects">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("projectName")} value={item.name} onChange={(v) => set("name", v)} />
        <TextField label={t("projectRole")} value={item.role} onChange={(v) => set("role", v)} />
      </Grid2>
      <TextField label={t("link")} value={item.link} onChange={(v) => set("link", v)} ltr type="url" />
      <DateRangeField value={item.dates} onChange={(v) => set("dates", v)} />
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} footer={<BulletHints value={item.description} />} />
    </div>
  );
}

function SkillGroupForm({ section, item }: { section: SectionOf<"skills">; item: ItemOf<"skills"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"skills">>(section.id, item.id);
  const mutate = (recipe: (it: Draft<ItemOf<"skills">>) => void) =>
    editorActions.update((d) => {
      const it = findItem(d, section.id, item.id) as Draft<ItemOf<"skills">> | undefined;
      if (it) recipe(it);
    });
  return (
    <div className="grid gap-3">
      <TextField label={t("groupName")} placeholder={t("groupNamePlaceholder")} value={item.name} onChange={(v) => set("name", v)} testId="field-group-name" />
      <SkillsInput
        skills={item.skills}
        showLevels={section.levelDisplay !== "none"}
        testId="field-skill-input"
        onAdd={(names) =>
          mutate((it) => {
            for (const n of names) if (!it.skills.some((s) => s.name === n)) it.skills.push(createSkill(n));
          })
        }
        onRemove={(id) => mutate((it) => void (it.skills = it.skills.filter((s) => s.id !== id)))}
        onLevel={(id, level) =>
          mutate((it) => {
            const s = it.skills.find((x) => x.id === id);
            if (s) s.level = level;
          })
        }
      />
    </div>
  );
}

function LanguageForm({ sectionId, item }: { sectionId: string; item: ItemOf<"languages"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"languages">>(sectionId, item.id);
  const id = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem]">
      <TextField label={t("language")} value={item.language} onChange={(v) => set("language", v)} />
      <TextField label={t("fluency")} placeholder={t("fluencyPlaceholder")} value={item.fluency} onChange={(v) => set("fluency", v)} />
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{t("level")}</Label>
        <div id={id}>
          <LevelSelect value={item.level} onChange={(v) => set("level", v)} label={t("level")} />
        </div>
      </div>
    </div>
  );
}

function CourseForm({ sectionId, item }: { sectionId: string; item: ItemOf<"courses"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"courses">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("courseName")} value={item.name} onChange={(v) => set("name", v)} />
        <TextField label={t("issuer")} value={item.issuer} onChange={(v) => set("issuer", v)} />
      </Grid2>
      <Grid2>
        <YearMonthField label={t("date")} value={item.date} onChange={(v) => set("date", v)} />
        <TextField label={t("link")} value={item.link} onChange={(v) => set("link", v)} ltr type="url" />
      </Grid2>
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} minHeight="3rem" />
    </div>
  );
}

function AwardForm({ sectionId, item }: { sectionId: string; item: ItemOf<"awards"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"awards">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("awardTitle")} value={item.title} onChange={(v) => set("title", v)} />
        <TextField label={t("issuer")} value={item.issuer} onChange={(v) => set("issuer", v)} />
      </Grid2>
      <YearMonthField label={t("date")} value={item.date} onChange={(v) => set("date", v)} />
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} minHeight="3rem" />
    </div>
  );
}

function ReferenceForm({ sectionId, item }: { sectionId: string; item: ItemOf<"references"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"references">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("refName")} value={item.name} onChange={(v) => set("name", v)} />
        <TextField label={t("refRole")} value={item.role} onChange={(v) => set("role", v)} />
      </Grid2>
      <TextField label={t("refOrg")} value={item.organization} onChange={(v) => set("organization", v)} />
      <Grid2>
        <TextField label={t("email")} value={item.email} onChange={(v) => set("email", v)} ltr type="email" />
        <TextField
          label={t("phone")}
          value={item.phone}
          onChange={(v) => set("phone", v)}
          onBlur={() => set("phone", formatIsraeliPhone(item.phone))}
          ltr
          type="tel"
        />
      </Grid2>
      <TextField label={t("refNote")} value={item.note} onChange={(v) => set("note", v)} multiline />
    </div>
  );
}

function CustomForm({ sectionId, item }: { sectionId: string; item: ItemOf<"custom"> }) {
  const t = useTranslations("fields");
  const set = useItemSetter<ItemOf<"custom">>(sectionId, item.id);
  return (
    <div className="grid gap-3">
      <Grid2>
        <TextField label={t("title")} value={item.title} onChange={(v) => set("title", v)} />
        <TextField label={t("subtitle")} value={item.subtitle} onChange={(v) => set("subtitle", v)} />
      </Grid2>
      <Grid2>
        <TextField label={t("location")} value={item.location} onChange={(v) => set("location", v)} />
        <TextField label={t("link")} value={item.link} onChange={(v) => set("link", v)} ltr type="url" />
      </Grid2>
      <DateRangeField value={item.dates} onChange={(v) => set("dates", v)} />
      <RichTextEditor label={t("description")} value={item.description} onChange={(v) => set("description", v)} footer={<BulletHints value={item.description} />} />
    </div>
  );
}
