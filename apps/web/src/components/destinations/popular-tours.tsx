import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourTile } from '../tours/tour-tile';
import type { TourCardData } from '../tours/tour-card';

/**
 * Overview "Most popular journeys" — a curated shelf of image-background poster tiles (capped by the
 * caller, currently 8) with a "View all tours" link to the full listing. Each tour's photo fills the
 * tile with overlaid title, place, rating and price; the headline badge sits as a frosted chip.
 */
export function PopularTours({ tours }: { tours: TourCardData[] }) {
  const t = messages.destinationsPage;

  return (
    <section className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.popularHeading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">
            {t.popularSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {tours.map((tour) => (
            <TourTile key={tour.slug} tour={tour} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/tours"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            {t.popularViewAll}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default PopularTours;
