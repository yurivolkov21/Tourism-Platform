import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { SectionHeading } from '../section-heading';
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
        <SectionHeading
          title={t.popularHeading}
          subtitle={t.popularSubtitle}
          className="mb-10 sm:mb-14"
        />

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
