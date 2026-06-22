'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Lightbox, type LightboxImage } from './lightbox';

// Data-ready shape (maps to MediaAsset later); `src` optional so we render placeholder
// tiles until media is wired. A "grid" section becomes a 2×2 cluster; others are single.
export type GalleryImage = { src?: string; alt: string };
export type GallerySection = { type?: 'grid'; images: GalleryImage[] };

const PLACEHOLDER_SECTIONS: GallerySection[] = [
  { images: [{ alt: 'Coastal cliffs above the sea' }] },
  {
    type: 'grid',
    images: [
      { alt: 'Lantern-lit old town' },
      { alt: 'Terraced rice fields' },
      { alt: 'Limestone karsts at dawn' },
      { alt: 'Riverside floating market' },
    ],
  },
  {
    type: 'grid',
    images: [
      { alt: 'Misty mountain pass' },
      { alt: 'Fishing boats at sunset' },
      { alt: 'Temple courtyard' },
      { alt: 'Street food stalls' },
    ],
  },
  { images: [{ alt: 'Rolling green highlands' }] },
];

export function Tile({ image, className }: { image: GalleryImage; className?: string }) {
  if (image.src) {
    return (
      <div className={cn('overflow-hidden rounded-lg', className)}>
        <img src={image.src} alt={image.alt} className="size-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'from-primary via-primary/80 to-rating flex items-center justify-center rounded-lg bg-linear-to-br',
        className,
      )}
      role="img"
      aria-label={image.alt}
    >
      <ImageIcon className="text-primary-foreground/80 size-7" aria-hidden />
    </div>
  );
}

export function Gallery({
  sections = PLACEHOLDER_SECTIONS,
  heading,
  subtitle,
}: {
  sections?: GallerySection[];
  heading?: string;
  subtitle?: string;
}) {
  const t = messages.gallery;
  const flat: LightboxImage[] = sections.flatMap((s) => s.images);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Running flat index so each tile maps to its position in `flat` (the lightbox order).
  let running = 0;
  const renderTile = (img: GalleryImage, aspect: string) => {
    const i = running++;
    const clickable = Boolean(img.src);
    return (
      <button
        key={i}
        type="button"
        disabled={!clickable}
        onClick={() => setOpenIndex(i)}
        aria-label={img.alt}
        className={cn(
          'group relative block overflow-hidden rounded-lg',
          aspect,
          clickable && 'cursor-zoom-in',
        )}
      >
        <Tile image={img} className="size-full" />
        {clickable ? (
          <span
            aria-hidden
            className="bg-overlay/0 group-hover:bg-overlay/25 absolute inset-0 transition-colors"
          />
        ) : null}
      </button>
    );
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center sm:mb-16">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {heading ?? t.heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{subtitle ?? t.subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section, i) =>
            section.type === 'grid' ? (
              <div key={i} className="grid grid-cols-2 gap-5">
                {section.images.map((img) => renderTile(img, 'aspect-square'))}
              </div>
            ) : (
              <div key={i}>{section.images.map((img) => renderTile(img, 'aspect-square'))}</div>
            ),
          )}
        </div>
      </div>

      <Lightbox
        images={flat}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndex={setOpenIndex}
      />
    </section>
  );
}

export default Gallery;
