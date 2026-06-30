'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { GripVertical, ImagePlus, Loader2, X } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button, FieldDescription, FieldLegend, FieldSet, cn } from '@tourism/ui';

import { signDestinationUpload } from '../../lib/destinations/actions';
import { MAX_GALLERY, cloudinaryUrl, type MediaInput } from '../../lib/destinations/media';

const ACCEPT = 'image/png,image/jpeg,image/webp';

/** Sign → POST straight to Cloudinary → return the new media item (mirrors the web avatar uploader). */
async function uploadFile(file: File, role: 'hero' | 'gallery'): Promise<MediaInput | null> {
  const purpose = role === 'hero' ? 'DESTINATION_HERO' : 'DESTINATION_GALLERY';
  const signed = await signDestinationUpload(purpose, file.name, file.type);
  if (signed.error || !signed.params) return null;
  const p = signed.params;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', p.apiKey);
  fd.append('timestamp', String(p.timestamp));
  fd.append('signature', p.signature);
  fd.append('folder', p.folder);
  fd.append('public_id', p.publicId);
  const res = await fetch(p.uploadUrl, { method: 'POST', body: fd });
  if (!res.ok) return null;
  const up = (await res.json()) as {
    public_id: string;
    format?: string;
    width?: number;
    height?: number;
  };
  return {
    publicId: up.public_id,
    role,
    format: up.format,
    width: up.width,
    height: up.height,
    url: cloudinaryUrl(p.cloudName, up.public_id, up.format),
  };
}

function GalleryTile({ item, onRemove }: { item: MediaInput; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.publicId,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-muted relative aspect-square overflow-hidden rounded-lg border',
        isDragging && 'z-10 opacity-70',
      )}
    >
      <img src={item.url} alt="" className="size-full object-cover" />
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="bg-background/80 text-foreground absolute top-1 left-1 grid size-6 cursor-grab place-items-center rounded-md active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="bg-background/80 text-destructive hover:bg-background absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-md"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Hero slot + gallery grid for a destination. Each image uploads to Cloudinary on pick; the parent
 * serialises the list into a hidden form field. Reorder the gallery by drag. Gallery capped at
 * {@link MAX_GALLERY}.
 */
export function DestinationMediaField({
  initial,
  onChange,
}: {
  initial: MediaInput[];
  onChange: (items: MediaInput[]) => void;
}) {
  const [items, setItems] = useState<MediaInput[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const hero = items.find((m) => m.role === 'hero');
  const gallery = items.filter((m) => m.role === 'gallery');
  const galleryFull = gallery.length >= MAX_GALLERY;

  async function onHeroPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    const m = await uploadFile(file, 'hero');
    if (!m) setError('Hero image failed to upload.');
    else setItems((prev) => [m, ...prev.filter((x) => x.role !== 'hero')]);
    setBusy(false);
  }

  async function onGalleryPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const toUpload = files.slice(0, MAX_GALLERY - gallery.length);
    setBusy(true);
    setError(null);
    const results = await Promise.all(toUpload.map((f) => uploadFile(f, 'gallery')));
    const ok = results.filter((m): m is MediaInput => m !== null);
    if (ok.length < toUpload.length) setError('Some images failed to upload.');
    if (ok.length) setItems((prev) => [...prev, ...ok]);
    setBusy(false);
  }

  function onDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const heroes = prev.filter((m) => m.role === 'hero');
      const gal = prev.filter((m) => m.role === 'gallery');
      const from = gal.findIndex((x) => x.publicId === active.id);
      const to = gal.findIndex((x) => x.publicId === over.id);
      if (from < 0 || to < 0) return prev;
      return [...heroes, ...arrayMove(gal, from, to)];
    });
  }

  return (
    <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div>
        <FieldLegend className="mb-1.5 font-semibold">Images</FieldLegend>
        <FieldDescription>
          A hero photo and up to {MAX_GALLERY} gallery images. Drag gallery tiles to reorder.
        </FieldDescription>
      </div>

      <div className="space-y-6 md:col-span-2">
        {/* Hero */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Hero image</span>
          {hero ? (
            <div className="bg-muted relative aspect-video w-full max-w-md overflow-hidden rounded-lg border">
              <img src={hero.url} alt="" className="size-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setItems((prev) => prev.filter((x) => x.role !== 'hero'))}
                className="absolute top-2 right-2 cursor-pointer"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => heroInput.current?.click()}
                disabled={busy}
                className="cursor-pointer"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Upload hero image
              </Button>
            </div>
          )}
          <input ref={heroInput} type="file" accept={ACCEPT} className="sr-only" onChange={onHeroPick} />
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              Gallery <span className="text-muted-foreground">({gallery.length}/{MAX_GALLERY})</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => galleryInput.current?.click()}
              disabled={busy || galleryFull}
              className="cursor-pointer"
            >
              <ImagePlus className="size-4" />
              Add images
            </Button>
            <input
              ref={galleryInput}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={onGalleryPick}
            />
          </div>

          {gallery.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={gallery.map((g) => g.publicId)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {gallery.map((g) => (
                    <GalleryTile
                      key={g.publicId}
                      item={g}
                      onRemove={() => setItems((prev) => prev.filter((x) => x.publicId !== g.publicId))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              No gallery images yet.
            </p>
          )}
          {galleryFull ? (
            <p className="text-muted-foreground text-xs">Maximum {MAX_GALLERY} gallery images reached.</p>
          ) : null}
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </FieldSet>
  );
}

export default DestinationMediaField;
