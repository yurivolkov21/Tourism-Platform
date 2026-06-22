'use client';

import { useState } from 'react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourTile } from '../tours/tour-tile';
import type { TourCardData } from '../tours/tour-card';

const CHIP = 'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors';
const CHIP_ON = 'border-primary bg-primary text-primary-foreground';
const CHIP_OFF =
  'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30';

/** Region tours: a destination tab bar filtering an image-poster tour grid. */
export function RegionTours({
  destinations,
  tours,
  initialDestination,
}: {
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
  initialDestination?: string;
}) {
  const t = messages.regionPage;
  const initialName = destinations.find((d) => d.slug === initialDestination)?.name ?? 'all';
  const [active, setActive] = useState<string>(initialName);

  const filtered = active === 'all' ? tours : tours.filter((tr) => tr.destination === active);

  return (
    <section className="bg-muted/40 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-6 text-2xl font-semibold text-balance md:text-3xl">
          {t.toursHeading}
        </h2>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive('all')}
            className={cn(CHIP, active === 'all' ? CHIP_ON : CHIP_OFF)}
          >
            {t.allTab}
          </button>
          {destinations.map((d) => (
            <button
              type="button"
              key={d.slug}
              onClick={() => setActive(d.name)}
              className={cn(CHIP, active === d.name ? CHIP_ON : CHIP_OFF)}
            >
              {d.name}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {filtered.map((tour) => (
              <TourTile key={tour.slug} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-pretty">{t.noTours}</p>
        )}
      </div>
    </section>
  );
}

export default RegionTours;
