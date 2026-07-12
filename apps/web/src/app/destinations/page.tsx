import type { Metadata } from 'next';

import { groupByRegion } from '@tourism/core';
import { messages } from '@tourism/i18n';

import { DestinationsHero } from '../../components/destinations/destinations-hero';
import { RegionGroup } from '../../components/destinations/region-group';
import { BestTime } from '../../components/destinations/best-time';
import { PopularTours } from '../../components/destinations/popular-tours';
import { TravelTips } from '../../components/destinations/travel-tips';
import {
  Gallery,
  type GallerySection,
} from '../../components/marketing/gallery';
import { Testimonials } from '../../components/marketing/testimonials';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { fetchDestinationTiles } from '../../lib/api/destinations';
import { fetchTourCards } from '../../lib/api/tours';
import { fetchFeaturedReviews } from '../../lib/api/reviews';
import { pickFeaturedDestinations } from '../../lib/featured-destinations';
import { deriveOverviewGallery } from '../../lib/region-imagery';
import { LoadErrorState } from '../../components/feedback/load-error-state';
import { settle } from '../../lib/resilience';

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
  description:
    'Explore Vietnam by destination — from the misty north to the Mekong south.',
};

// ISR: serve real destinations/tours without per-request API hits; fall back to empty on API error.
export const revalidate = 300;

export default async function DestinationsPage() {
  const [tilesRes, popular, featured] = await Promise.all([
    settle(fetchDestinationTiles()),
    fetchTourCards({ featured: true }).catch(() => []),
    fetchFeaturedReviews(),
  ]);
  const tiles = tilesRes.data ?? [];
  const groups = groupByRegion(tiles);
  const editorialSections = deriveOverviewGallery(tiles, galleryFrames);
  // Map featured reviews → testimonial items; the component falls back to the i18n fixture when empty.
  const testimonials = featured.map((r) => ({
    name: r.authorName,
    trip: r.tripLabel,
    location: r.authorLocation,
    content: r.body,
  }));

  return (
    <main>
      <DestinationsHero />
      {!tilesRes.ok ? (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadErrorState />
          </div>
        </section>
      ) : null}
      {groups.map((group) => (
        <RegionGroup
          key={group.region}
          region={group.region}
          items={pickFeaturedDestinations(group.items, group.region)}
        />
      ))}
      <BestTime />
      {/* Curated teaser — cap the featured shelf at 8; the full set lives on /tours. */}
      <PopularTours tours={popular.slice(0, 8)} />
      <Gallery variant="editorial" sections={editorialSections} />
      <Testimonials items={testimonials} />
      <TravelTips />
      <EnquiryCta heading={messages.enquiryCta.headings.destinations} />
    </main>
  );
}
