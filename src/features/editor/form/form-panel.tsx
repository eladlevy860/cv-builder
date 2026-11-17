"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, UserIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sectionTitle } from "@/core/i18n-doc/labels";
import { createSection } from "@/core/model/factory";
import { SECTION_TYPES } from "@/core/model/schema";
import { editorActions, useEditorStore } from "../store";
import { BasicsForm } from "./basics-form";
import { SectionPanel } from "./section-panel";
import { moveInArray, SortableItem, SortableList } from "./sortable";

export const BASICS_ID = "basics";

export function FormPanel() {
  const t = useTranslations("sections");
  const doc = useEditorStore((s) => s.doc!);
  const activeSectionId = useEditorStore((s) => s.activeSectionId);
  const focusNonce = useEditorStore((s) => s.focusNonce);
  // Mounted by a jump from another tab: open the target section right away.
  const [open, setOpen] = useState<string[]>(() => {
    const active = useEditorStore.getState().activeSectionId;
    return active && active !== BASICS_ID ? [BASICS_ID, active] : [BASICS_ID];
  });
  const [lastNonce, setLastNonce] = useState(focusNonce);

  // Preview click → open that section (state adjusted during render, no effect needed).
  if (focusNonce !== lastNonce) {
    setLastNonce(focusNonce);
    if (activeSectionId && !open.includes(activeSectionId)) setOpen([...open, activeSectionId]);
  }

  useEffect(() => {
    if (!activeSectionId || focusNonce === 0) return;
    const el = document.querySelector(`[data-section-panel="${activeSectionId}"]`);
    // Wait a frame so a newly opened accordion has its content.
    requestAnimationFrame(() => el?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [activeSectionId, focusNonce]);

  const ids = doc.sections.map((s) => s.id);
  const names = useMemo(
    () => Object.fromEntries(doc.sections.map((s) => [s.id, sectionTitle(s, doc.language)])),
    [doc.sections, doc.language],
  );

  function addSection(type: (typeof SECTION_TYPES)[number]) {
    const section = createSection(type);
    editorActions.update((d) => void d.sections.push(section));
    setOpen((o) => [...o, section.id]);
    useEditorStore.getState().focus(section.id, null, true);
  }

  return (
    <div className="grid gap-3 p-4">
      <Accordion type="multiple" value={open} onValueChange={setOpen} className="grid gap-3">
        <AccordionItem value={BASICS_ID} data-section-panel={BASICS_ID}>
          <AccordionHeader className="flex items-center gap-1 ps-3 pe-2">
            <UserIcon className="size-4 text-muted-foreground" aria-hidden />
            <AccordionTrigger className="px-1" data-testid="section-trigger-basics">
              {t("personal")}
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <BasicsForm />
          </AccordionContent>
        </AccordionItem>
        <SortableList ids={ids} names={names} onMove={(from, to) => editorActions.update((d) => moveInArray(d.sections, from, to))}>
          {doc.sections.map((section, i) => (
            <SortableItem key={section.id} id={section.id}>
              {(handle) => <SectionPanel section={section} index={i} count={doc.sections.length} handle={handle} />}
            </SortableItem>
          ))}
        </SortableList>
      </Accordion>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-self-start border-dashed" data-testid="add-section">
            <PlusIcon />
            {t("addSection")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {SECTION_TYPES.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => addSection(type)} data-testid={`add-section-${type}`}>
              {t(`types.${type}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
