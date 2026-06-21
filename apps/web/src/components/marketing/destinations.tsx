import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Placeholder fixtures shaped like the Destination model (slug/name/region) + a short editorial
// tagline and a derived tour count. Swap for @tourism/core data later.
type DestinationTile = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  tourCount: number;
};

const destinations: DestinationTile[] = [
  { slug: 'ha-long-bay', name: 'Hạ Long Bay', region: 'Northern Vietnam', tagline: 'Emerald waters, limestone giants', tourCount: 8 },
  { slug: 'sa-pa', name: 'Sa Pa', region: 'Northern Vietnam', tagline: 'Misty peaks & hill-tribe trails', tourCount: 6 },
  { slug: 'hoi-an', name: 'Hội An', region: 'Central Vietnam', tagline: 'Lantern-lit riverside heritage', tourCount: 12 },
  { slug: 'hue', name: 'Huế', region: 'Central Vietnam', tagline: 'Imperial citadel & royal tombs', tourCount: 9 },
  { slug: 'mekong-delta', name: 'Mekong Delta', region: 'Southern Vietnam', tagline: 'Floating markets & river life', tourCount: 7 },
  { slug: 'ho-chi-minh-city', name: 'Hồ Chí Minh City', region: 'Southern Vietnam', tagline: 'Energy, history & street food', tourCount: 10 },
];

const regionOrder = ['Northern Vietnam', 'Central Vietnam', 'Southern Vietnam'];

export function Destinations() {
  const t = messages.destinations;

  return (
    <section id="destinations" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
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

        {/* Region-grouped editorial tiles */}
        <div className="space-y-12 lg:space-y-16">
          {regionOrder.map((region) => (
            <div key={region}>
              <h3 className="mb-5 text-xl font-semibold sm:text-2xl">{region}</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                {destinations
                  .filter((d) => d.region === region)
                  .map((d) => (
                    <a
                      key={d.slug}
                      href={`#destination-${d.slug}`}
                      className="group relative block aspect-16/10 overflow-hidden rounded-lg sm:aspect-3/2"
                    >
                      {/* Cover placeholder (no image field in schema yet) */}
                      <div className="from-primary via-primary/80 to-rating absolute inset-0 bg-linear-to-br transition-transform duration-500 ease-out-expo group-hover:scale-105" />
                      {/* Scrim for legibility */}
                      <div className="from-overlay absolute inset-0 bg-linear-to-t to-transparent" />
                      {/* Label */}
                      <div className="text-primary-foreground absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
                        <h4 className="font-heading text-2xl leading-tight font-semibold">{d.name}</h4>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Destinations;
