'use client';

import { useState } from 'react';

import { ImageLightbox, type LightboxImage } from '../crud/image-lightbox';

/**
 * Read-only hero + gallery viewer; click any image to open the lightbox. Media roles (`hero` /
 * `gallery`) are the shared closed enum, so this works for any owner (destinations, tours…) —
 * pass `emptyText` to tailor the no-images message.
 */
export function DestinationMediaView({
  media,
  emptyText = 'No images for this destination yet.',
}: {
  media: { url: string; role: string }[];
  emptyText?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);

  const hero = media.find((m) => m.role === 'hero');
  const gallery = media.filter((m) => m.role === 'gallery');
  const ordered = hero ? [hero, ...gallery] : gallery;
  const images: LightboxImage[] = ordered.map((m) => ({ src: m.url, alt: '' }));
  const galleryOffset = hero ? 1 : 0;

  if (ordered.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hero ? (
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="bg-muted block w-full max-w-2xl cursor-zoom-in overflow-hidden rounded-xl border"
          aria-label="View hero image"
        >
          <img src={hero.url} alt="" className="aspect-video w-full object-cover" />
        </button>
      ) : null}

      {gallery.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {gallery.map((g, i) => (
            <button
              key={`${g.url}-${i}`}
              type="button"
              onClick={() => setIndex(galleryOffset + i)}
              className="bg-muted aspect-square cursor-zoom-in overflow-hidden rounded-lg border"
              aria-label="View image"
            >
              <img src={g.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <ImageLightbox
        images={images}
        index={index}
        onClose={() => setIndex(null)}
        onIndex={setIndex}
      />
    </div>
  );
}

export default DestinationMediaView;
