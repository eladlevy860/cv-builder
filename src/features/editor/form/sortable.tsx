"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HandleProps = { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };

/**
 * Vertical sortable list. Vertical movement is direction-independent, so it
 * behaves the same in RTL; screen-reader announcements are localized.
 */
export function SortableList({
  ids,
  names,
  onMove,
  children,
}: {
  ids: string[];
  /** Human-readable names for announcements. */
  names: Record<string, string>;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const t = useTranslations("dnd");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const announcements = useMemo<Announcements>(() => {
    const name = (id: string | number) => names[String(id)] ?? "";
    const pos = (id: string | number | undefined) => (id === undefined ? 0 : ids.indexOf(String(id)) + 1);
    return {
      onDragStart: ({ active }) => t("pickedUp", { name: name(active.id) }),
      onDragOver: ({ active, over }) =>
        over ? t("movedOver", { name: name(active.id), position: pos(over.id), total: ids.length }) : undefined,
      onDragEnd: ({ active, over }) =>
        over ? t("dropped", { name: name(active.id), position: pos(over.id), total: ids.length }) : undefined,
      onDragCancel: ({ active }) => t("cancelled", { name: name(active.id) }),
    };
  }, [ids, names, t]);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("instructions") } }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: (handle: HandleProps, isDragging: boolean) => ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-90 shadow-lg", className)}
    >
      {children({ attributes, listeners }, isDragging)}
    </div>
  );
}

export function DragHandle({ handle, label }: { handle: HandleProps; label: string }) {
  return (
    <button
      type="button"
      className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      {...handle.attributes}
      {...handle.listeners}
      aria-label={label}
      title={label}
    >
      <GripVerticalIcon className="size-4" aria-hidden />
    </button>
  );
}

export function moveInArray<T>(arr: T[], from: number, to: number) {
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}
