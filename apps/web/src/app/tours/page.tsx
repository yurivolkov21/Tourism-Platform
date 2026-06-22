import type { Metadata } from 'next';

import { messages } from '@tourism/i18n';

import { ContentHero } from '../../components/content/content-hero';
import { ToursListing } from '../../components/tours/tours-listing';
import { allTours } from '../../lib/tours';

export const metadata: Metadata = {
  title: 'All tours — Tourism Platform',
  description:
    'Browse every journey we run across Vietnam — filter by destination, length, travel style and theme to find the trip that fits you.',
};

export default function ToursPage() {
  const t = messages.toursPage;

  return (
    <main>
      <ContentHero breadcrumb={t.breadcrumb} title={t.title} subtitle={t.subtitle} />
      <ToursListing tours={allTours()} />
    </main>
  );
}
