import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getBySlug } from '@tourism/core';

import { DestinationHero } from '../../../components/destinations/destination-hero';
import { DestinationIntro } from '../../../components/destinations/destination-intro';
import { DestinationTours } from '../../../components/destinations/destination-tours';
import { ValueProps } from '../../../components/destinations/value-props';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { destinations } from '../../../lib/destinations.fixtures';

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = getBySlug(destinations, slug);
  if (!destination) return { title: 'Destination not found' };
  return { title: `${destination.name} tours`, description: destination.description ?? undefined };
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getBySlug(destinations, slug);
  if (!destination) notFound();

  return (
    <main>
      <DestinationHero destination={destination} />
      <DestinationIntro destination={destination} />
      <DestinationTours name={destination.name} tours={destination.tours} />
      <ValueProps />
      <EnquiryCta />
    </main>
  );
}
