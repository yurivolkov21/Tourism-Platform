'use client';

import { useCallback, useEffect } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

export type LightboxImage = { src?: string; alt: string };

const CONTROL =
  'text-primary-foreground hover:bg-background/15 flex items-center justify-center rounded-full transition-colors';

/** Larger image variant for the viewer (Unsplash width bump; falls back to the original). */
function large(src?: string): string | undefined {
  return src?.replace(/([?&])w=\d+/, '$1w=1600');
}

/**
 * Full-screen image viewer (lightbox): dark backdrop, enlarged image, counter, prev/next, close.
 * Reuses the Base UI Dialog (focus trap, Esc, scroll lock); arrow keys navigate.
 */
export function Lightbox({
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
  const t = messages.gallery.viewer;

  const go = useCallback(
    (delta: number) => {
      if (index === null || images.length === 0) return;
      onIndex((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndex],
  );

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-foreground/95 z-50" />
        <DialogPrimitive.Popup
          data-slot="lightbox"
          className="fixed inset-0 z-50 flex flex-col outline-none"
        >
          <DialogTitle className="sr-only">{t.label}</DialogTitle>

          {/* Top bar: counter + close */}
          <div className="text-primary-foreground flex items-center justify-between p-4 sm:p-5">
            <span className="text-sm tabular-nums">
              {t.counter((index ?? 0) + 1, images.length)}
            </span>
            <DialogClose className={`${CONTROL} size-10`} aria-label={t.close}>
              <XIcon className="size-5" />
            </DialogClose>
          </div>

          {/* Image + arrows */}
          <div className="relative flex flex-1 items-center justify-center px-4 pb-6 sm:px-16">
            {current?.src ? (
              <img
                src={large(current.src)}
                alt={current.alt}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : null}

            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t.previous}
              className={`${CONTROL} absolute left-3 size-11 sm:left-5 sm:size-12`}
            >
              <ChevronLeftIcon className="size-6 sm:size-7" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t.next}
              className={`${CONTROL} absolute right-3 size-11 sm:right-5 sm:size-12`}
            >
              <ChevronRightIcon className="size-6 sm:size-7" />
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

export default Lightbox;
