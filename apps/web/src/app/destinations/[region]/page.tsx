import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { RegionHero } from '../../../components/destinations/region-hero';
import { RegionIntro } from '../../../components/destinations/region-intro';
import { RegionHighlights } from '../../../components/destinations/region-highlights';
import { RegionSignature } from '../../../components/destinations/region-signature';
import { RegionSignatureAdventure } from '../../../components/destinations/region-signature-adventure';
import { RegionSignatureTimeline } from '../../../components/destinations/region-signature-timeline';
import { RegionSignatureDelta } from '../../../components/destinations/region-signature-delta';
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

  // Photo gallery — shadcn-style alternating "1 big + 2×2 cluster" (10 images: single·grid·grid·single).
  const g = data.gallery;
  const cluster = (from: number): GallerySection => ({
    type: 'grid',
    images: g.slice(from, from + 4).map((src) => ({ src, alt: data.name })),
  });
  const gallerySections: GallerySection[] = [
    { images: [{ src: g[0], alt: data.name }] },
    cluster(1),
    cluster(5),
    { images: [{ src: g[9], alt: data.name }] },
  ];

  const isAdventure = theme.signature === 'adventure';

  const highlightsNode = meta ? (
    <RegionHighlights
      heading={t.highlightsHeading(data.name)}
      items={meta.highlights}
      accentSoft={theme.accentSoft}
    />
  ) : null;

  const signatureNode = !meta ? null : isAdventure && meta.signature.stats ? (
    <RegionSignatureAdventure
      eyebrow={meta.signature.eyebrow}
      heading={meta.signature.heading}
      body={meta.signature.body}
      stats={meta.signature.stats}
      image={pool[4] ?? pool[0] ?? data.image}
      accentText={theme.accentText}
    />
  ) : theme.signature === 'heritage' && meta.signature.timeline ? (
    <RegionSignatureTimeline
      eyebrow={meta.signature.eyebrow}
      heading={meta.signature.heading}
      body={meta.signature.body}
      timeline={meta.signature.timeline}
    />
  ) : theme.signature === 'delta' && meta.signature.postcards ? (
    <RegionSignatureDelta
      eyebrow={meta.signature.eyebrow}
      heading={meta.signature.heading}
      body={meta.signature.body}
      postcards={meta.signature.postcards}
      images={[g[0], g[3], g[8]]}
    />
  ) : (
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
  );

  return (
    <main>
      <RegionHero
        name={data.name}
        image={data.image}
        tagline={meta?.tagline ?? ''}
        heightClass={theme.heroHeight}
        scrimClass={theme.heroScrim}
      />
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
      {/* Adventure regions lead with the bold signature; others surface highlights first. */}
      {isAdventure ? (
        <>
          {signatureNode}
          {highlightsNode}
        </>
      ) : (
        <>
          {highlightsNode}
          {signatureNode}
        </>
      )}
      <RegionTours destinations={data.destinations} tours={data.tours} chipOn={theme.chipOn} />
      <Gallery
        sections={gallerySections}
        heading={t.galleryHeading(data.name)}
        subtitle={t.gallerySubtitle}
      />
      <ValueProps accentClass={theme.accentSoft} image={pool[3] ?? pool[0] ?? data.image} />
      <EnquiryCta heading={messages.enquiryCta.regionHeading(data.name)} prefillDestination={data.name} />
    </main>
  );
}
