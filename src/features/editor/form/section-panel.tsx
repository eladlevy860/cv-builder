"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  LightbulbIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_SECTION_TITLES, sectionTitle } from "@/core/i18n-doc/labels";
import { createItem, reId, type ItemSectionType } from "@/core/model/factory";
import type { CvDocument, Section, SectionItem } from "@/core/model/schema";
import { toEntry } from "@/core/render/entries";
import { getTemplateMeta } from "@/templates/meta";
import { cn } from "@/lib/utils";
import { editorActions, useEditorStore } from "../store";
import { TextField } from "./fields";
import { findItem, ItemForm } from "./item-forms";
import { RichTextEditor } from "./rich-text-editor";
import { SummaryHint } from "../writing/length-hints";
import { WritingHelp, hasWritingHelp } from "../writing/writing-help";
import { DragHandle, moveInArray, SortableItem, SortableList, type HandleProps } from "./sortable";

type ItemSection = Exclude<Section, { type: "summary" }>;

function updateSection(id: string, recipe: (s: Section) => void, coalesce?: string) {
  editorActions.update(
    (d) => {
      const s = d.sections.find((x) => x.id === id);
      if (s) recipe(s as Section);
    },
    coalesce ? { coalesce } : undefined,
  );
}

/** Short label for an item header in the form. */
export function itemLabel(doc: CvDocument, section: ItemSection, item: SectionItem): { title: string; detail: string } {
  if (section.type === "skills") {
    const it = item as Extract<SectionItem, { skills: unknown }>;
    return { title: it.name, detail: it.skills.map((s) => s.name).join(", ") };
  }
  if (section.type === "languages") {
    const it = item as Extract<SectionItem, { language: string }>;
    return { title: it.language, detail: it.fluency };
  }
  const e = toEntry(section, item, doc.language, doc.theme);
  return { title: e.title || e.subtitle, detail: [e.title ? e.subtitle : "", e.date?.text ?? ""].filter(Boolean).join(" · ") };
}

export function SectionPanel({
  section,
  index,
  count,
  handle,
}: {
  section: Section;
  index: number;
  count: number;
  handle: HandleProps;
}) {
  const t = useTranslations("sections");
  const tf = useTranslations("fields");
  const tc = useTranslations("common");
  const tw = useTranslations("writing");
  const doc = useEditorStore((s) => s.doc!);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const title = sectionTitle(section, doc.language);
  const columns = getTemplateMeta(doc.templateId).columns;

  function move(delta: number) {
    editorActions.update((d) => moveInArray(d.sections, index, index + delta));
  }

  return (
    <AccordionItem value={section.id} data-section-panel={section.id} className={cn(!section.visible && "opacity-70")}>
      <AccordionHeader className="flex items-center gap-1 ps-2 pe-2">
        <DragHandle handle={handle} label={t("drag", { title })} />
        <AccordionTrigger className="px-1" data-testid={`section-trigger-${section.type}`}>
          <span className="flex min-w-0 items-center gap-2">
            <bdi lang={doc.language} className="truncate">
              {title}
            </bdi>
            {!section.visible && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t("hidden")}</span>}
          </span>
        </AccordionTrigger>
        {hasWritingHelp(section.type) && (
          <Button
            variant={helpOpen ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={tw("helpFor", { title })}
            title={tw("help")}
            aria-pressed={helpOpen}
            onClick={() => {
              // Opening the help also opens the section.
              if (!helpOpen) useEditorStore.getState().focus(section.id, null, true);
              setHelpOpen((o) => !o);
            }}
            data-testid="writing-help-toggle"
          >
            <LightbulbIcon className={cn(helpOpen && "text-amber-600")} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={section.visible ? t("hide") : t("show")}
          title={section.visible ? t("hide") : t("show")}
          aria-pressed={!section.visible}
          onClick={() => updateSection(section.id, (s) => void (s.visible = !s.visible))}
          data-testid="section-visibility"
        >
          {section.visible ? <EyeIcon /> : <EyeOffIcon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("actions", { title })} data-testid="section-menu">
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => move(-1)}>
              <ArrowUpIcon />
              {t("moveUp")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => move(1)}>
              <ArrowDownIcon />
              {t("moveDown")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2Icon className="text-destructive" />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </AccordionHeader>
      <AccordionContent className="grid gap-4">
        {helpOpen && <WritingHelp section={section} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label={t("title")}
            hint={t("titleHint")}
            placeholder={DEFAULT_SECTION_TITLES[doc.language][section.type]}
            value={section.title ?? ""}
            onChange={(v) => updateSection(section.id, (s) => void (s.title = v.trim() ? v : null), `${section.id}.title`)}
            testId="section-title-input"
          />
          {columns === 2 && <PlacementSelect section={section} />}
          {(section.type === "skills" || section.type === "languages") && <LevelDisplaySelect section={section} />}
        </div>
        {section.type === "summary" ? (
          <RichTextEditor
            label={tf("summary")}
            hint={tf("summaryHint")}
            value={section.content}
            minHeight="7rem"
            testId="field-summary"
            footer={<SummaryHint value={section.content} />}
            onChange={(v) =>
              updateSection(
                section.id,
                (s) => {
                  if (s.type === "summary") s.content = v;
                },
                `${section.id}.content`,
              )
            }
          />
        ) : (
          <ItemList section={section} />
        )}
      </AccordionContent>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.rich("deleteTitle", { title, bdi: (c) => <bdi>{c}</bdi> })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              data-testid="confirm-delete-section"
              onClick={() => editorActions.update((d) => void (d.sections = d.sections.filter((s) => s.id !== section.id)))}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AccordionItem>
  );
}

function PlacementSelect({ section }: { section: Section }) {
  const t = useTranslations("sections");
  const id = `${section.id}-placement`;
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{t("placement")}</Label>
      <NativeSelect
        id={id}
        value={section.placement}
        onChange={(e) => updateSection(section.id, (s) => void (s.placement = e.target.value as Section["placement"]))}
      >
        <option value="auto">{t("placementAuto")}</option>
        <option value="main">{t("placementMain")}</option>
        <option value="side">{t("placementSide")}</option>
      </NativeSelect>
    </div>
  );
}

function LevelDisplaySelect({ section }: { section: Extract<Section, { type: "skills" | "languages" }> }) {
  const t = useTranslations("sections");
  const id = `${section.id}-levels`;
  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{t("levelDisplay")}</Label>
      <NativeSelect
        id={id}
        value={section.levelDisplay}
        data-testid="level-display"
        onChange={(e) =>
          updateSection(section.id, (s) => {
            if (s.type === "skills" || s.type === "languages") s.levelDisplay = e.target.value as typeof s.levelDisplay;
          })
        }
      >
        <option value="none">{t("levelNone")}</option>
        <option value="text">{t("levelText")}</option>
        <option value="dots">{t("levelDots")}</option>
      </NativeSelect>
    </div>
  );
}

function ItemList({ section }: { section: ItemSection }) {
  const t = useTranslations("sections");
  const doc = useEditorStore((s) => s.doc!);
  const activeItemId = useEditorStore((s) => s.activeItemId);
  const focusNonce = useEditorStore((s) => s.focusNonce);
  const items = section.items as SectionItem[];
  const [open, setOpen] = useState<string[]>(() => {
    const ids = items.length === 1 ? [items[0].id] : [];
    // Mounted because the preview was clicked: open that item right away.
    const active = useEditorStore.getState().activeItemId;
    if (active && items.some((i) => i.id === active) && !ids.includes(active)) ids.push(active);
    return ids;
  });
  const [lastNonce, setLastNonce] = useState(focusNonce);
  // Open the item that was clicked in the preview.
  if (focusNonce !== lastNonce) {
    setLastNonce(focusNonce);
    if (activeItemId && items.some((i) => i.id === activeItemId) && !open.includes(activeItemId)) setOpen([...open, activeItemId]);
  }
  const noun = t(`itemNoun.${section.type}`);
  const names = useMemo(
    () => Object.fromEntries(items.map((it) => [it.id, itemLabel(doc, section, it).title || t("untitled")])),
    [items, doc, section, t],
  );

  function addItem() {
    const item = createItem(section.type as ItemSectionType);
    editorActions.update((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s && s.type !== "summary") (s.items as SectionItem[]).push(item);
    });
    setOpen((o) => [...o, item.id]);
  }

  return (
    <div className="grid gap-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      <SortableList
        ids={items.map((i) => i.id)}
        names={names}
        onMove={(from, to) =>
          editorActions.update((d) => {
            const s = d.sections.find((x) => x.id === section.id);
            if (s && s.type !== "summary") moveInArray(s.items as SectionItem[], from, to);
          })
        }
      >
        <ul className="grid gap-2">
          {items.map((item, i) => (
            <li key={item.id}>
              <SortableItem id={item.id}>
                {(handle) => (
                  <ItemCard
                    section={section}
                    item={item}
                    index={i}
                    count={items.length}
                    handle={handle}
                    open={open.includes(item.id)}
                    onToggle={() => setOpen((o) => (o.includes(item.id) ? o.filter((x) => x !== item.id) : [...o, item.id]))}
                    name={names[item.id]}
                  />
                )}
              </SortableItem>
            </li>
          ))}
        </ul>
      </SortableList>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={addItem} data-testid={`add-item-${section.type}`}>
        <PlusIcon />
        {t("addItem", { type: noun })}
      </Button>
    </div>
  );
}

function ItemCard({
  section,
  item,
  index,
  count,
  handle,
  open,
  onToggle,
  name,
}: {
  section: ItemSection;
  item: SectionItem;
  index: number;
  count: number;
  handle: HandleProps;
  open: boolean;
  onToggle: () => void;
  name: string;
}) {
  const t = useTranslations("sections");
  const doc = useEditorStore((s) => s.doc!);
  const isActive = useEditorStore((s) => s.activeItemId === item.id);
  const focusNonce = useEditorStore((s) => s.focusNonce);
  const ref = useRef<HTMLDivElement>(null);
  const { detail } = itemLabel(doc, section, item);
  const bodyId = `item-body-${item.id}`;

  useEffect(() => {
    if (isActive && focusNonce > 0) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isActive, focusNonce]);

  const mutateItems = (recipe: (items: SectionItem[]) => void) =>
    editorActions.update((d) => {
      const s = d.sections.find((x) => x.id === section.id);
      if (s && s.type !== "summary") recipe(s.items as SectionItem[]);
    });

  return (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-background", isActive && "ring-2 ring-primary/40", !item.visible && "opacity-60")}
      data-item-panel={item.id}
    >
      <div className="flex items-center gap-1 p-1.5">
        <DragHandle handle={handle} label={t("dragItem", { title: name })} />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          data-testid="item-toggle"
        >
          <span className="min-w-0 flex-1">
            <bdi className="block truncate text-sm font-medium" lang={doc.language}>
              {name}
            </bdi>
            {detail && (
              <bdi className="block truncate text-xs text-muted-foreground" lang={doc.language}>
                {detail}
              </bdi>
            )}
          </span>
          <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={item.visible ? t("hide") : t("show")}
          title={item.visible ? t("hide") : t("show")}
          aria-pressed={!item.visible}
          onClick={() =>
            editorActions.update((d) => {
              const it = findItem(d, section.id, item.id);
              if (it) it.visible = !it.visible;
            })
          }
        >
          {item.visible ? <EyeIcon /> : <EyeOffIcon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t("itemActions", { title: name })}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => mutateItems((items) => moveInArray(items, index, index - 1))}>
              <ArrowUpIcon />
              {t("moveUp")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => mutateItems((items) => moveInArray(items, index, index + 1))}>
              <ArrowDownIcon />
              {t("moveDown")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => mutateItems((items) => void items.splice(index + 1, 0, reId(structuredClone(item))))}>
              <CopyIcon />
              {t("duplicateItem")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => mutateItems((items) => void items.splice(index, 1))} data-testid="delete-item">
              <Trash2Icon className="text-destructive" />
              {t("deleteItem")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <div id={bodyId} className="border-t p-3">
          <ItemForm section={section} item={item} />
        </div>
      )}
    </div>
  );
}
