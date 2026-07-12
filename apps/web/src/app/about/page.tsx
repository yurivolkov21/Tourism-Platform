import type { Metadata } from 'next';

import { AboutHero } from '../../components/about/about-hero';
import { Story } from '../../components/about/story';
import { ByTheNumbers } from '../../components/about/by-the-numbers';
import { Team } from '../../components/about/team';
import { TrustBand } from '../../components/marketing/trust-band';
import { EnquiryCta } from '../../components/marketing/enquiry-cta';
import { fetchAboutMetrics } from '../../lib/api/about';
import { formatAboutMetricValues } from '../../lib/about-metrics';
import { fetchTrustStats } from '../../lib/api/trust-stats';
import { buildTrustStats } from '../../lib/trust-band';
import { messages } from '@tourism/i18n';

export const metadata: Metadata = {
  title: messages.pageMeta.about.title,
  description: messages.pageMeta.about.description,
};

// ISR: serve real catalog metrics without per-request API hits; fall back to zeros on error.
export const revalidate = 300;

export default async function AboutPage() {
  const metrics = await fetchAboutMetrics();
  const metricValues = formatAboutMetricValues(metrics);
  const trustStats = await fetchTrustStats().catch(() => ({
    tours: 0,
    destinations: 0,
    reviewCount: 0,
    averageRating: null,
  }));

  return (
    <main>
      <AboutHero />
      <Story />
      <ByTheNumbers values={metricValues} />
      <Team />
      <TrustBand
        stats={buildTrustStats(trustStats, messages.trustBand.stats)}
      />
      <EnquiryCta heading={messages.enquiryCta.headings.about} />
    </main>
  );
}
