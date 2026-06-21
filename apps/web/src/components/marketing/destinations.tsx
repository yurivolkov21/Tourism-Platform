import Image from 'next/image';
import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Placeholder fixtures shaped like the Destination model (slug/name/region) + a short editorial
// tagline and a derived tour count. `image` is a temporary Unsplash URL for design review —
// swap for MediaAsset/@tourism/core data later. `span` drives the bento grid emphasis.
type DestinationTile = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  tourCount: number;
  image: string;
  span: string;
};

// Temporary Unsplash imagery (review only).
const img = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=70&auto=format&fit=crop`;

// Bento grid: a 2×2 feature tile, two wide tiles, and standard tiles for rhythm (Lily-style).
const destinations: DestinationTile[] = [
  { slug: 'ha-long-bay', name: 'Hạ Long Bay', region: 'Northern Vietnam', tagline: 'Emerald waters, limestone giants', tourCount: 8, image: img('photo-1528127269322-539801943592'), span: 'lg:col-span-2 lg:row-span-2' },
  { slug: 'sa-pa', name: 'Sa Pa', region: 'Northern Vietnam', tagline: 'Misty peaks & hill-tribe trails', tourCount: 6, image: img('photo-1573790387438-4da905039392'), span: 'lg:col-span-2' },
  { slug: 'hoi-an', name: 'Hội An', region: 'Central Vietnam', tagline: 'Lantern-lit riverside heritage', tourCount: 12, image: img('photo-1583417319070-4a69db38a482'), span: '' },
  { slug: 'hue', name: 'Huế', region: 'Central Vietnam', tagline: 'Imperial citadel & royal tombs', tourCount: 9, image: img('photo-1555921015-5532091f6026'), span: '' },
  { slug: 'mekong-delta', name: 'Mekong Delta', region: 'Southern Vietnam', tagline: 'Floating markets & river life', tourCount: 7, image: img('photo-1528181304800-259b08848526'), span: 'lg:col-span-2' },
  { slug: 'ho-chi-minh-city', name: 'Hồ Chí Minh City', region: 'Southern Vietnam', tagline: 'Energy, history & street food', tourCount: 10, image: img('photo-1602002418816-5c0aeef426aa'), span: 'lg:col-span-2' },
];

export function Destinations() {
  const t = messages.destinations;

  return (
    <section id="destinations" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centred header + intro (Lily-style) */}
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[14rem]">
          {destinations.map((d) => (
            <a
              key={d.slug}
              href={`#destination-${d.slug}`}
              className={cn(
                'group relative block aspect-4/3 overflow-hidden rounded-xl lg:aspect-auto lg:h-full',
                d.span,
              )}
            >
              {/* Cover (temporary Unsplash image for review) */}
              <Image
                src={d.image}
                alt={d.name}
                fill
                sizes="(min-width: 1024px) 50vw, 50vw"
                className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
              />
              {/* Scrim for legibility */}
              <div className="from-overlay absolute inset-0 bg-linear-to-t to-transparent" />
              {/* Label */}
              <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
                <h3 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h3>
                <span className="text-primary-foreground/85 text-xs tracking-widest uppercase">
                  {d.tagline}
                </span>
                <span className="text-primary-foreground/70 text-xs">
                  {d.tourCount} {t.toursLabel}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* View all */}
        <div className="mt-10 flex justify-center">
          <a href="#destinations" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Destinations;
