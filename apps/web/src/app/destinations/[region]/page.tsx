import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { RegionHero } from '../../../components/destinations/region-hero';
import { RegionIntro } from '../../../components/destinations/region-intro';
import { RegionTours } from '../../../components/destinations/region-tours';
import { ValueProps } from '../../../components/destinations/value-props';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { getRegion, regionSlugs } from '../../../lib/regions';

export function generateStaticParams() {
  return regionSlugs().map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const data = getRegion(region);
  if (!data) return { title: 'Region not found' };
  return { title: `${data.name} tours` };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const data = getRegion(region);
  if (!data) notFound();

  const meta = messages.regionPage.regions[data.name];

  return (
    <main>
      <RegionHero name={data.name} image={data.image} tagline={meta?.tagline ?? ''} />
      <RegionIntro
        name={data.name}
        intro={meta?.intro ?? ''}
        images={data.images}
        itinerariesHref="#itineraries"
      />
      <RegionTours destinations={data.destinations} tours={data.tours} />
      <ValueProps />
      <EnquiryCta />
    </main>
  );
}
