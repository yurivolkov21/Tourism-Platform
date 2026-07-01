'use client';

import { useRef, useState, type ReactNode } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button, FieldDescription, FieldLegend, FieldSet, cn } from '@tourism/ui';

type WithKey<T> = T & { _key: string };

function SortableCard({
  id,
  label,
  index,
  onRemove,
  children,
}: {
  id: string;
  label: string;
  index: number;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('bg-card space-y-3 rounded-lg border p-3', isDragging && 'z-10 opacity-70')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="hover:text-foreground grid size-6 cursor-grab place-items-center rounded-md active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="text-xs font-medium">
            {label} {index + 1}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove ${label} ${index + 1}`}
          className="text-muted-foreground hover:text-destructive cursor-pointer"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

/**
 * Generic repeatable object editor — a Form-Layout-2 section of stacked cards with add / remove /
 * drag-reorder. Self-contained: owns the list state and serialises it (minus the client `_key`) into
 * a hidden `<input name>` as JSON, so the parent form just posts it. Reused for a tour's itinerary,
 * FAQs, and policies.
 */
export function RepeatableCards<T extends Record<string, unknown>>({
  name,
  legend,
  description,
  addLabel,
  emptyText,
  itemLabel,
  initial,
  makeItem,
  renderFields,
}: {
  name: string;
  legend: string;
  description: string;
  addLabel: string;
  emptyText: string;
  itemLabel: string;
  initial: T[];
  makeItem: () => T;
  renderFields: (item: T, patch: (partial: Partial<T>) => void, index: number) => ReactNode;
}) {
  const keySeq = useRef(0);
  const [items, setItems] = useState<WithKey<T>[]>(() =>
    initial.map((it) => ({ ...it, _key: String(keySeq.current++) })),
  );
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const add = () => setItems((prev) => [...prev, { ...makeItem(), _key: String(keySeq.current++) }]);
  const remove = (key: string) => setItems((prev) => prev.filter((x) => x._key !== key));
  const patch = (key: string, partial: Partial<T>) =>
    setItems((prev) => prev.map((x) => (x._key === key ? { ...x, ...partial } : x)));

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((x) => x._key === active.id);
      const to = prev.findIndex((x) => x._key === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  };

  // Serialise without the client-only `_key`.
  const serialised = JSON.stringify(
    items.map((it) => {
      const rest: Record<string, unknown> = { ...it };
      delete rest._key;
      return rest;
    }),
  );

  return (
    <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div>
        <FieldLegend className="mb-1.5 font-semibold">{legend}</FieldLegend>
        <FieldDescription>{description}</FieldDescription>
      </div>

      <div className="space-y-3 md:col-span-2">
        {items.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((x) => x._key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <SortableCard
                    key={item._key}
                    id={item._key}
                    label={itemLabel}
                    index={i}
                    onRemove={() => remove(item._key)}
                  >
                    {renderFields(item, (partial) => patch(item._key, partial), i)}
                  </SortableCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
            {emptyText}
          </p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={add} className="cursor-pointer">
          <Plus className="size-4" />
          {addLabel}
        </Button>

        <input type="hidden" name={name} value={serialised} />
      </div>
    </FieldSet>
  );
}

export default RepeatableCards;
