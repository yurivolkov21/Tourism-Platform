import { ImageIcon } from 'lucide-react';

import { Badge, Separator, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { FacebookIcon, InstagramIcon, TwitterIcon } from '../icons/social';

export type TourGalleryFact = { label: string; value: string };

// Prop-driven so the tour-detail page can feed real Tour data later (like TourCard).
// `images` is optional: until the schema carries media, the grid renders placeholder tiles.
export type TourGalleryData = {
  title: string;
  description: string;
  facts: TourGalleryFact[];
  images?: string[];
};

// Varied aspect ratios give the masonry column genuine rhythm (not uniform squares).
const PLACEHOLDER_TILES = [
  'aspect-3/4',
  'aspect-square',
  'aspect-4/5',
  'aspect-square',
  'aspect-3/4',
];

const shareLinks = [
  { Icon: FacebookIcon, label: 'Facebook' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: TwitterIcon, label: 'X' },
];

export function TourGallery({ tour }: { tour: TourGalleryData }) {
  const t = messages.tourGallery;
  const images = tour.images ?? [];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:gap-12 lg:px-8">
        {/* Masonry image collage */}
        <div className="columns-1 gap-5 sm:columns-2 lg:col-span-2">
          {images.length > 0
            ? images.map((src) => (
                <div
                  key={src}
                  className="mb-5 break-inside-avoid overflow-hidden rounded-xl"
                >
                  <img
                    src={src}
                    alt={t.imageAlt}
                    className="w-full object-cover"
                  />
                </div>
              ))
            : PLACEHOLDER_TILES.map((aspect, i) => (
                <div
                  key={i}
                  className={cn(
                    'mb-5 break-inside-avoid overflow-hidden rounded-xl',
                    'from-primary via-primary/80 to-rating flex items-center justify-center bg-linear-to-br',
                    aspect,
                  )}
                >
                  <ImageIcon className="text-primary-foreground/80 size-7" />
                </div>
              ))}
        </div>

        {/* Facts + share panel */}
        <div className="space-y-6 lg:pl-2">
          <Badge variant="outline" className="font-normal">
            {t.eyebrow}
          </Badge>

          <h3 className="font-heading text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            {tour.title}
          </h3>

          <p className="text-muted-foreground text-pretty">
            {tour.description}
          </p>

          <Separator />

          <dl className="space-y-3">
            {tour.facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline gap-6">
                <dt className="w-28 shrink-0 font-medium">{fact.label}</dt>
                <dd className="text-muted-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <Separator />

          <div className="flex items-center gap-6">
            <span className="font-medium">{t.shareLabel}</span>
            <div className="flex gap-1">
              {shareLinks.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={`Share on ${label}`}
                  className="text-muted-foreground hover:text-primary hover:bg-muted flex size-9 items-center justify-center rounded-full transition-colors"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TourGallery;
