import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { DestinationTile } from './destination-tile';

/**
 * One region section on the overview (Lily mosaic): centred heading + intro, then a full-bleed
 * mosaic whose first destination is the labelled feature tile and the rest are photo tiles.
 * The mosaic spans the full viewport width (edge-to-edge, no inset) with the four tiles filling
 * one row on desktop; mobile stacks the feature above a row of thumbnails.
 */
export function RegionGroup({ region, items }: { region: string; items: DestinationTileVM[] }) {
  const t = messages.destinationsPage;
  const [feature, ...rest] = items;
  if (!feature) return null;

  const regionId = region.toLowerCase().replace(/\s+/g, '-');

  return (
    <section id={regionId} className="scroll-mt-24 py-12 sm:py-16">
      {/* Centred heading + intro (constrained) */}
      <div className="mx-auto mb-8 max-w-2xl space-y-3 px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold text-balance md:text-3xl">
          {t.regionHeading(region)}
        </h2>
        {t.regionIntro[region] ? (
          <p className="text-muted-foreground text-pretty">{t.regionIntro[region]}</p>
        ) : null}
      </div>

      {/* Full-bleed mosaic: feature tile + supporting photo tiles, edge-to-edge */}
      <div className="grid auto-rows-[12rem] grid-cols-3 gap-px border-y border-border bg-border sm:auto-rows-[25rem] sm:grid-cols-4">
        <DestinationTile
          destination={feature}
          variant="feature"
          className="col-span-3 row-span-2 sm:col-span-1 sm:row-span-1"
        />
        {rest.map((d) => (
          <DestinationTile key={d.slug} destination={d} variant="photo" className="col-span-1" />
        ))}
      </div>
    </section>
  );
}

export default RegionGroup;
