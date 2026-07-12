import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { ContentHero } from '../../components/content/content-hero';
import { ToursListing } from '../../components/tours/tours-listing';
import { LoadErrorState } from '../../components/feedback/load-error-state';
import { fetchTourCards } from '../../lib/api/tours';
import { settle } from '../../lib/resilience';

export const metadata: Metadata = {
  title: 'All tours — Tourism Platform',
  description:
    'Browse every journey we run across Vietnam — filter by destination, length and price to find the trip that fits you.',
};

// ISR: rebuild at most every 5 min — serves real catalog data without hitting the (free, sleepy) API
// on every request. On an API error we now distinguish failure from a real empty catalogue and show a
// branded "couldn't load" state (with retry) instead of the "no tours match" empty state (which lies).
export const revalidate = 300;

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const t = messages.toursPage;
  const { category, q } = await searchParams;

  const res = await settle(fetchTourCards());

  return (
    <main>
      <ContentHero
        breadcrumb={t.breadcrumb}
        title={t.title}
        subtitle={t.subtitle}
      />
      {res.ok ? (
        <ToursListing
          tours={res.data}
          initialCategory={category ?? null}
          initialQuery={q ?? ''}
        />
      ) : (
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadErrorState title={t.loadError.title} body={t.loadError.body} />
          </div>
        </section>
      )}
    </main>
  );
}
