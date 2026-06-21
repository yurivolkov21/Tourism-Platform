import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { DestinationTile } from './destination-tile';

/**
 * One region section on the overview (Lily mosaic): centred heading + intro, then a bordered
 * mosaic whose first destination is the labelled feature tile and the rest are photo tiles.
 * Mobile stacks the feature above a row of thumbnails; desktop is a single 4-up row.
 */
export function RegionGroup({ region, items }: { region: string; items: DestinationTileVM[] }) {
  const t = messages.destinationsPage;
  const [feature, ...rest] = items;
  if (!feature) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Centred heading + intro */}
        <div className="mx-auto mb-8 max-w-2xl space-y-3 text-center">
          <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
            {t.regionHeading(region)}
          </h2>
          {t.regionIntro[region] ? (
            <p className="text-muted-foreground text-pretty">{t.regionIntro[region]}</p>
          ) : null}
        </div>

        {/* Bordered mosaic: feature tile + supporting photo tiles */}
        <div className="ring-border/70 shadow-card grid auto-rows-[9rem] grid-cols-3 gap-px overflow-hidden rounded-2xl bg-border ring-1 sm:auto-rows-[15rem] sm:grid-cols-4">
          <DestinationTile
            destination={feature}
            variant="feature"
            className="col-span-3 row-span-2 sm:col-span-1 sm:row-span-1"
          />
          {rest.map((d) => (
            <DestinationTile key={d.slug} destination={d} variant="photo" className="col-span-1" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default RegionGroup;
