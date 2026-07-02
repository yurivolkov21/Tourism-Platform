'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { GripVertical, ImagePlus, X } from 'lucide-react';
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

import { Button, FieldDescription, FieldLegend, FieldSet, Spinner, cn } from '@tourism/ui';

import { ErrorAlert } from './error-alert';
import { ImageLightbox, type LightboxImage } from './image-lightbox';
import { signUpload, type UploadPurpose } from '../../lib/uploads';
import { MAX_GALLERY, cloudinaryUrl, type MediaInput } from '../../lib/media';

const ACCEPT = 'image/png,image/jpeg,image/webp';

type UploadResult = { item: MediaInput } | { error: string };

/** Sign → POST straight to Cloudinary → return the new media item, or the reason it failed. */
async function uploadFile(
  file: File,
  role: 'hero' | 'gallery',
  purpose: UploadPurpose,
): Promise<UploadResult> {
  const signed = await signUpload(purpose, file.name, file.type);
  if (signed.error || !signed.params) {
    return { error: signed.error ?? 'Could not sign the upload.' };
  }
  const p = signed.params;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', p.apiKey);
  fd.append('timestamp', String(p.timestamp));
  fd.append('signature', p.signature);
  fd.append('folder', p.folder);
  fd.append('public_id', p.publicId);
  let res: Response;
  try {
    res = await fetch(p.uploadUrl, { method: 'POST', body: fd });
  } catch {
    return { error: 'Could not reach Cloudinary.' };
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    const msg = (detail as { error?: { message?: string } } | null)?.error?.message;
    return { error: `Cloudinary rejected the upload${msg ? `: ${msg}` : ` (HTTP ${res.status})`}.` };
  }
  const up = (await res.json()) as {
    public_id: string;
    format?: string;
    width?: number;
    height?: number;
  };
  return {
    item: {
      publicId: up.public_id,
      role,
      format: up.format,
      width: up.width,
      height: up.height,
      url: cloudinaryUrl(p.cloudName, up.public_id, up.format),
    },
  };
}

function GalleryTile({
  item,
  onRemove,
  onView,
}: {
  item: MediaInput;
  onRemove: () => void;
  onView: () => void;
}) {
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
      <button type="button" onClick={onView} className="block size-full cursor-zoom-in" aria-label="View image">
        <img src={item.url} alt="" className="size-full object-cover" />
      </button>
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
 * Hero slot + gallery grid for any media owner. Each image uploads to Cloudinary on pick (signed by
 * the generic `signUpload` with the given `heroPurpose`/`galleryPurpose`); the parent serialises the
 * list into a hidden form field. Reorder the gallery by drag. Gallery capped at {@link MAX_GALLERY}.
 * Shared by the destination + tour + post forms; omit `galleryPurpose` for a hero-only field (post cover).
 */
export function MediaField({
  initial,
  onChange,
  heroPurpose,
  galleryPurpose,
  legend = 'Images',
  description,
  heroLabel = 'Hero image',
}: {
  initial: MediaInput[];
  onChange: (items: MediaInput[]) => void;
  heroPurpose: UploadPurpose;
  /** Omit to render a hero-only field (no gallery section) — e.g. the post cover. */
  galleryPurpose?: UploadPurpose;
  legend?: string;
  description?: string;
  heroLabel?: string;
}) {
  const [items, setItems] = useState<MediaInput[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const hero = items.find((m) => m.role === 'hero');
  const gallery = items.filter((m) => m.role === 'gallery');
  const galleryFull = gallery.length >= MAX_GALLERY;

  // Lightbox list in display order (hero first), so a tile maps to its viewer index.
  const viewList = hero ? [hero, ...gallery] : gallery;
  const viewImages: LightboxImage[] = viewList.map((m) => ({ src: m.url ?? '', alt: '' }));
  const galleryOffset = hero ? 1 : 0;

  async function onHeroPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    const r = await uploadFile(file, 'hero', heroPurpose);
    if ('error' in r) setError(r.error);
    else setItems((prev) => [r.item, ...prev.filter((x) => x.role !== 'hero')]);
    setBusy(false);
  }

  async function onGalleryPick(e: ChangeEvent<HTMLInputElement>) {
    if (!galleryPurpose) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const toUpload = files.slice(0, MAX_GALLERY - gallery.length);
    setBusy(true);
    setError(null);
    const results = await Promise.all(toUpload.map((f) => uploadFile(f, 'gallery', galleryPurpose)));
    const ok = results.flatMap((r) => ('item' in r ? [r.item] : []));
    const firstErr = results.find((r): r is { error: string } => 'error' in r);
    if (firstErr) setError(firstErr.error);
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
    <>
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">{legend}</FieldLegend>
          <FieldDescription>
            {description ?? `A hero photo and up to ${MAX_GALLERY} gallery images. Drag gallery tiles to reorder.`}
          </FieldDescription>
        </div>

        <div className="space-y-6 md:col-span-2">
          {/* Hero */}
          <div className="space-y-2">
            <span className="text-sm font-medium">{heroLabel}</span>
            {hero ? (
              <div className="bg-muted relative aspect-video w-full max-w-md overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => setViewIndex(0)}
                  className="block size-full cursor-zoom-in"
                  aria-label="View hero image"
                >
                  <img src={hero.url} alt="" className="size-full object-cover" />
                </button>
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
                  {busy ? <Spinner /> : <ImagePlus className="size-4" />}
                  Upload hero image
                </Button>
              </div>
            )}
            <input ref={heroInput} type="file" accept={ACCEPT} className="sr-only" onChange={onHeroPick} />
          </div>

          {galleryPurpose ? (
            <>
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
                        {gallery.map((g, i) => (
                          <GalleryTile
                            key={g.publicId}
                            item={g}
                            onRemove={() => setItems((prev) => prev.filter((x) => x.publicId !== g.publicId))}
                            onView={() => setViewIndex(galleryOffset + i)}
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
            </>
          ) : null}

          {error ? <ErrorAlert>{error}</ErrorAlert> : null}
        </div>
      </FieldSet>

      <ImageLightbox
        images={viewImages}
        index={viewIndex}
        onClose={() => setViewIndex(null)}
        onIndex={setViewIndex}
      />
    </>
  );
}

export default MediaField;
