import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Placeholder fixtures shaped like the Destination model (slug/name/region) + a derived tour count.
type DestinationTile = { slug: string; name: string; region: string; tourCount: number };

const destinations: DestinationTile[] = [
  { slug: 'ha-long-bay', name: 'Hạ Long Bay', region: 'Northeast', tourCount: 8 },
  { slug: 'hoi-an', name: 'Hội An', region: 'Central Coast', tourCount: 12 },
  { slug: 'sa-pa', name: 'Sa Pa', region: 'Northwest', tourCount: 6 },
  { slug: 'hue', name: 'Huế', region: 'Central', tourCount: 9 },
  { slug: 'mekong-delta', name: 'Mekong Delta', region: 'South', tourCount: 7 },
  { slug: 'phong-nha', name: 'Phong Nha', region: 'North Central', tourCount: 5 },
];

export function Destinations() {
  const t = messages.destinations;

  return (
    <section id="destinations" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>
          <a
            href="#destinations"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'shrink-0 max-sm:hidden')}
          >
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>

        {/* Editorial tile grid — first tile spans wide on large screens (bento touch) */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d, index) => (
            <a
              key={d.slug}
              href={`#destination-${d.slug}`}
              className={cn(
                'group relative block aspect-[3/4] overflow-hidden rounded-lg',
                index === 0 && 'sm:col-span-2 sm:aspect-[16/10] lg:aspect-auto',
              )}
            >
              {/* Cover placeholder (no image field in schema yet) */}
              <div className="from-primary via-primary/80 to-rating absolute inset-0 bg-linear-to-br transition-transform duration-500 ease-out-expo group-hover:scale-105" />
              {/* Scrim for legibility */}
              <div className="from-overlay absolute inset-0 bg-gradient-to-t to-transparent" />
              {/* Label */}
              <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-5">
                <span className="text-primary-foreground/80 text-xs tracking-widest uppercase">
                  {d.region}
                </span>
                <h3 className="font-heading text-2xl font-semibold">{d.name}</h3>
                <span className="text-primary-foreground/80 text-sm">
                  {d.tourCount} {t.toursLabel}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Destinations;
