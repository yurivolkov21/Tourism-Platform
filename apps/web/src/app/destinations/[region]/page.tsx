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

  // Region photo gallery — each unique image used once (no repeats), in alternating single/cluster bands.
  const gallerySections: GallerySection[] = [];
  let gi = 0;
  const push = (n: number, grid: boolean) => {
    const slice = pool.slice(gi, gi + n);
    if (slice.length === 0) return;
    gallerySections.push({
      type: grid ? 'grid' : undefined,
      images: slice.map((src) => ({ src, alt: data.name })),
    });
    gi += n;
  };
  push(1, false);
  push(4, true);
  push(1, false);
  push(4, true);

  return (
    <main>
      <RegionHero name={data.name} image={data.image} tagline={meta?.tagline ?? ''} />
      <RegionIntro
        name={data.name}
        intro={meta?.intro ?? ''}
        intro2={meta?.intro2 ?? ''}
        tags={meta?.tags ?? []}
        images={data.images.slice(1)}
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
          image={pool[4] ?? pool[0] ?? data.image}
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
