import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { DestinationTileVM } from '../../lib/destinations.fixtures';
import { slugify } from '../../lib/slug';
import { DestinationTile } from './destination-tile';

/**
 * One region section on the overview (Lily mosaic): centred heading + intro, then a full-bleed
 * mosaic whose first destination is the labelled feature tile and the rest are photo tiles.
 * The mosaic spans the full viewport width (edge-to-edge, no inset) with the four tiles filling
 * one row on desktop; mobile stacks the feature above a row of thumbnails.
 */
// Expanding-panels behaviour (desktop, motion-safe): equal flex basis at rest; hovering/focusing a
// tile grows it while the siblings keep grow:1 and visually narrow. Mobile stacks (no accordion).
const TILE_ACCORDION =
  'sm:flex-1 sm:basis-0 motion-safe:sm:transition-[flex-grow] motion-safe:sm:duration-700 motion-safe:sm:ease-in-out motion-safe:sm:hover:grow-[2.5] motion-safe:sm:focus-within:grow-[2.5]';

export function RegionGroup({ region, items }: { region: string; items: DestinationTileVM[] }) {
  const t = messages.destinationsPage;
  const [feature, ...rest] = items;
  if (!feature) return null;

  const regionId = slugify(region);

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
        <Link
          href={`/destinations/${regionId}`}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {t.viewMore}
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {/* Full-bleed expanding-panels mosaic: equal widths at rest; hover/focus widens a tile as the
          others narrow. Desktop only (motion-safe); mobile stacks edge-to-edge. */}
      <div className="flex flex-col gap-px border-y border-border bg-border sm:h-100 sm:flex-row">
        <DestinationTile destination={feature} variant="feature" className={TILE_ACCORDION} />
        {rest.map((d) => (
          <DestinationTile key={d.slug} destination={d} variant="photo" className={TILE_ACCORDION} />
        ))}
      </div>
    </section>
  );
}

export default RegionGroup;
