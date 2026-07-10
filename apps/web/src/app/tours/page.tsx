import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { ContentHero } from '../../components/content/content-hero';
import { ToursListing } from '../../components/tours/tours-listing';
import type { TourCardData } from '../../components/tours/tour-card';
import { fetchTourCards } from '../../lib/api/tours';

export const metadata: Metadata = {
  title: 'All tours — Tourism Platform',
  description:
    'Browse every journey we run across Vietnam — filter by destination, length and price to find the trip that fits you.',
};

// ISR: rebuild at most every 5 min — serves real catalog data without hitting the (free, sleepy) API
// on every request. If the API is unreachable, fall back to an empty list (the listing shows its
// empty state) rather than failing the page.
export const revalidate = 300;

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const t = messages.toursPage;
  const { category, q } = await searchParams;

  let tours: TourCardData[] = [];
  try {
    tours = await fetchTourCards();
  } catch {
    tours = [];
  }

  return (
    <main>
      <ContentHero
        breadcrumb={t.breadcrumb}
        title={t.title}
        subtitle={t.subtitle}
      />
      <ToursListing
        tours={tours}
        initialCategory={category ?? null}
        initialQuery={q ?? ''}
      />
    </main>
  );
}
