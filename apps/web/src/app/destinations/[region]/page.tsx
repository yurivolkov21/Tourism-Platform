import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { RegionHero } from '../../../components/destinations/region-hero';
import { RegionIntro } from '../../../components/destinations/region-intro';
import { RegionHighlights } from '../../../components/destinations/region-highlights';
import { RegionSignature } from '../../../components/destinations/region-signature';
import { RegionTours } from '../../../components/destinations/region-tours';
import { ValueProps } from '../../../components/destinations/value-props';
import { Gallery, type GallerySection } from '../../../components/marketing/gallery';
import { EnquiryCta } from '../../../components/marketing/enquiry-cta';
import { getRegion, regionSlugs } from '../../../lib/regions';
import { getRegionTheme } from '../../../lib/region-theme';

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

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const data = getRegion(region);
  if (!data) notFound();

  const t = messages.regionPage;
  const meta = t.regions[data.name];
  const theme = getRegionTheme(region);
  const pool = data.images;

  // Region photo gallery built from the destination image pool (Tile fills gaps with placeholders).
  const at = (i: number) => ({ src: pool[i % Math.max(pool.length, 1)], alt: data.name });
  const gallerySections: GallerySection[] = [
    { images: [at(0)] },
    { type: 'grid', images: [at(1), at(2), at(3), at(4)] },
    { type: 'grid', images: [at(5), at(6), at(7), at(8)] },
    { images: [at(9)] },
  ];

  return (
    <main>
      <RegionHero name={data.name} image={data.image} tagline={meta?.tagline ?? ''} />
      <RegionIntro
        name={data.name}
        intro={meta?.intro ?? ''}
        intro2={meta?.intro2 ?? ''}
        tags={meta?.tags ?? []}
        images={data.images}
        itinerariesHref="#itineraries"
        accentBg={theme.accentBg}
        accentBtnText={theme.accentBtnText}
      />
      {meta ? (
        <RegionHighlights
          heading={t.highlightsHeading(data.name)}
          items={meta.highlights}
          accentSoft={theme.accentSoft}
        />
      ) : null}
      {meta ? (
        <RegionSignature
          variant={theme.signature}
          eyebrow={meta.signature.eyebrow}
          heading={meta.signature.heading}
          body={meta.signature.body}
          points={meta.signature.points}
          image={pool[2] ?? data.image}
          accentText={theme.accentText}
          accentBg={theme.accentBg}
        />
      ) : null}
      <RegionTours destinations={data.destinations} tours={data.tours} chipOn={theme.chipOn} />
      <Gallery
        sections={gallerySections}
        heading={t.galleryHeading(data.name)}
        subtitle={t.gallerySubtitle}
      />
      <ValueProps accentClass={theme.accentSoft} />
      <EnquiryCta />
    </main>
  );
}
