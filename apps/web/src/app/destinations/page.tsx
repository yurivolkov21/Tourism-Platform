import type { Metadata } from 'next';

import { groupByRegion } from '@tourism/core';

import { DestinationsHero } from '../../components/destinations/destinations-hero';
import { RegionGroup } from '../../components/destinations/region-group';
import { PopularTours } from '../../components/destinations/popular-tours';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { destinations, popularTours } from '../../lib/destinations.fixtures';

export const metadata: Metadata = {
  title: 'Vietnam destinations',
  description: 'Explore Vietnam by destination — from the misty north to the Mekong south.',
};

export default function DestinationsPage() {
  const groups = groupByRegion(destinations);

  return (
    <main>
      <DestinationsHero />
      {groups.map((group) => (
        <RegionGroup key={group.region} region={group.region} items={group.items} />
      ))}
      <PopularTours tours={popularTours} />
      <EnquiryCta />
    </main>
  );
}
