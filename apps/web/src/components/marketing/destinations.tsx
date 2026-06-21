import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { destinations } from '../../lib/destinations.fixtures';
import { DestinationTile } from '../destinations/destination-tile';

/**
 * Home teaser: a Lily-style bento grid of destination tiles. Reads the shared fixtures and renders
 * the extracted `DestinationTile` (bento emphasis via each tile's `span`). The fuller, region-grouped
 * version lives at `/destinations`.
 */
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
            <DestinationTile key={d.slug} destination={d} />
          ))}
        </div>

        {/* View all */}
        <div className="mt-10 flex justify-center">
          <Link href="/destinations" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
            {t.viewAll}
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Destinations;
