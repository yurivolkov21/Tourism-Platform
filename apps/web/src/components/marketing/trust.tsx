import Image from 'next/image';

import { messages } from '@tourism/i18n';

import { getSiteMedia } from '../../lib/api/site-media';
import { siteImage } from '../../lib/site-media';
import type { TrustStats } from '../../lib/trust-band';
import {
  buildTrustSectionStats,
  trustGridClass,
} from '../../lib/trust-section';
import { MetricValue } from './metric-value';

// Built-in default — overridable via the `home-trust` Appearance slot.
const DEFAULT_TRUST_IMAGE =
  'https://images.unsplash.com/photo-1767768996421-9784fde0f946?w=1920&q=70&auto=format&fit=crop';

/**
 * Full-bleed photo trust banner (Lily-style). The stat values are REAL — the
 * home page passes its live `fetchTrustStats()` aggregate (review average +
 * published-tour count) and rows with no honest data are hidden
 * (`buildTrustSectionStats`); only the 24/7-support pledge is static copy.
 */
export async function Trust({ stats }: { stats: TrustStats }) {
  const t = messages.trust;
  const trustImage = siteImage(
    await getSiteMedia(),
    'home-trust',
    DEFAULT_TRUST_IMAGE,
  );
  const rows = buildTrustSectionStats(stats, t.labels);

  return (
    <section className="relative isolate overflow-hidden py-20 sm:py-24 lg:py-28">
      <Image
        src={trustImage}
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="bg-overlay/70 absolute inset-0 -z-10" />

      <div className="text-on-media mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-balance md:text-4xl">
          {t.heading}
        </h2>
        <p className="text-on-media/80 mx-auto mt-4 max-w-2xl text-lg text-pretty">
          {t.subtitle}
        </p>

        <dl className={`mt-12 ${trustGridClass(rows.length)}`}>
          {rows.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="font-heading text-4xl font-bold sm:text-5xl">
                <MetricValue value={s.value} />
              </dt>
              <dd className="text-on-media/75 mt-2 text-sm">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default Trust;
