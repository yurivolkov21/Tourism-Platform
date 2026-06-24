import type { Metadata } from 'next';

import { groupByRegion } from '@tourism/core';
import { messages } from '@tourism/i18n';

import { DestinationsHero } from '../../components/destinations/destinations-hero';
import { RegionGroup } from '../../components/destinations/region-group';
import { BestTime } from '../../components/destinations/best-time';
import { PopularTours } from '../../components/destinations/popular-tours';
import { TravelTips } from '../../components/destinations/travel-tips';
import { Gallery, type GallerySection } from '../../components/marketing/gallery';
import { Testimonials } from '../../components/marketing/testimonials';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { fetchDestinationTiles } from '../../lib/api/destinations';
import { fetchTourCards } from '../../lib/api/tours';

// Placeholder frames for the editorial gallery (data-ready; maps to MediaAsset later).
const galleryFrames: GallerySection[] = [
  {
    images: [
      { alt: 'Hạ Long Bay limestone karsts at dawn' },
      { alt: 'Lantern-lit streets of Hội An' },
      { alt: 'Terraced rice fields in Sa Pa' },
      { alt: 'A Mekong Delta floating market' },
      { alt: 'The Imperial Citadel in Huế' },
    ],
  },
];

export const metadata: Metadata = {
  title: 'Vietnam destinations',
  description: 'Explore Vietnam by destination — from the misty north to the Mekong south.',
};

// ISR: serve real destinations/tours without per-request API hits; fall back to empty on API error.
export const revalidate = 300;

export default async function DestinationsPage() {
  const [tiles, popular] = await Promise.all([
    fetchDestinationTiles().catch(() => []),
    fetchTourCards({ featured: true }).catch(() => []),
  ]);
  const groups = groupByRegion(tiles);

  return (
    <main>
      <DestinationsHero />
      {groups.map((group) => (
        <RegionGroup key={group.region} region={group.region} items={group.items} />
      ))}
      <BestTime />
      <PopularTours tours={popular} />
      <Gallery variant="editorial" sections={galleryFrames} />
      <Testimonials />
      <TravelTips />
      <EnquiryCta heading={messages.enquiryCta.headings.destinations} />
    </main>
  );
}
