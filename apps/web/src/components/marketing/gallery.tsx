import { ImageIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

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

function Tile({ image, className }: { image: GalleryImage; className?: string }) {
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

export function Gallery({ sections = PLACEHOLDER_SECTIONS }: { sections?: GallerySection[] }) {
  const t = messages.gallery;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center sm:mb-16">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section, i) =>
            section.type === 'grid' ? (
              <div key={i} className="grid grid-cols-2 gap-5">
                {section.images.map((img, j) => (
                  <Tile key={j} image={img} className="aspect-square" />
                ))}
              </div>
            ) : (
              <div key={i}>
                {section.images.map((img, j) => (
                  <Tile key={j} image={img} className="aspect-3/4 size-full" />
                ))}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export default Gallery;
