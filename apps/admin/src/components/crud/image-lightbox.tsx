'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';

import { Dialog, DialogClose, DialogPortal, DialogTitle, cn } from '@tourism/ui';

export type LightboxImage = { src?: string; alt: string };

const ZOOMS = [1, 1.5, 2, 2.5] as const;

const CONTROL =
  'text-primary-foreground hover:bg-background/15 disabled:pointer-events-none disabled:opacity-40 flex size-10 items-center justify-center rounded-full transition-colors cursor-pointer';

/**
 * Full-screen image viewer (ported from the web `marketing/lightbox`, i18n stripped). Base UI
 * Dialog (focus trap, Esc, scroll lock) + zoom in/out, prev/next, counter, arrow-key nav. Used to
 * preview uploaded destination images full-size.
 */
export function ImageLightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index !== null;
  const [zoom, setZoom] = useState(0);

  const go = useCallback(
    (delta: number) => {
      if (index === null || images.length === 0) return;
      onIndex((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndex],
  );

  useEffect(() => {
    setZoom(0);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  const current = index !== null ? images[index] : undefined;
  const scale = ZOOMS[zoom];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Backdrop className="bg-foreground/95 fixed inset-0 z-50 duration-200 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Popup
          data-slot="lightbox"
          className="fixed inset-0 z-50 flex flex-col outline-none duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
        >
          <DialogTitle className="sr-only">Image viewer</DialogTitle>

          {/* Top bar: counter + zoom + close */}
          <div className="text-primary-foreground flex items-center justify-between p-4 sm:p-5">
            <span className="text-sm tabular-nums">
              {(index ?? 0) + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0, z - 1))}
                disabled={zoom === 0}
                aria-label="Zoom out"
                className={CONTROL}
              >
                <ZoomOutIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
                disabled={zoom === ZOOMS.length - 1}
                aria-label="Zoom in"
                className={CONTROL}
              >
                <ZoomInIcon className="size-5" />
              </button>
              <DialogClose className={CONTROL} aria-label="Close">
                <XIcon className="size-5" />
              </DialogClose>
            </div>
          </div>

          {/* Image area */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-8 sm:px-20">
            {current?.src ? (
              <img
                src={current.src}
                alt={current.alt}
                style={{ transform: `scale(${scale})` }}
                className="max-h-[78vh] max-w-5xl rounded-lg object-contain transition-transform duration-200"
              />
            ) : null}

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous"
                  className={cn(CONTROL, 'absolute left-3 size-11 sm:left-5 sm:size-12')}
                >
                  <ChevronLeftIcon className="size-6 sm:size-7" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next"
                  className={cn(CONTROL, 'absolute right-3 size-11 sm:right-5 sm:size-12')}
                >
                  <ChevronRightIcon className="size-6 sm:size-7" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

export default ImageLightbox;
