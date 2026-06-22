import type { Metadata } from 'next';

import { groupByRegion } from '@tourism/core';

import { DestinationsHero } from '../../components/destinations/destinations-hero';
import { RegionGroup } from '../../components/destinations/region-group';
import { BestTime } from '../../components/destinations/best-time';
import { PopularTours } from '../../components/destinations/popular-tours';
import { TravelTips } from '../../components/destinations/travel-tips';
import { Testimonials } from '../../components/marketing/testimonials';
import { Faq } from '../../components/marketing/faq';
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
      <BestTime />
      <PopularTours tours={popularTours} />
      <Testimonials />
      <TravelTips />
      <Faq />
      <EnquiryCta />
    </main>
  );
}
