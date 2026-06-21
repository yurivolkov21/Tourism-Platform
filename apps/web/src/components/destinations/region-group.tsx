import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { DestinationTile } from './destination-tile';

/** One region section on the overview: heading + a uniform grid of destination tiles. */
export function RegionGroup({ region, items }: { region: string; items: DestinationTileVM[] }) {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-8 text-2xl font-semibold text-balance md:text-3xl">
          {messages.destinationsPage.regionHeading(region)}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:auto-rows-[14rem] lg:grid-cols-4">
          {items.map((d) => (
            <DestinationTile key={d.slug} destination={d} className="" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionGroup;
