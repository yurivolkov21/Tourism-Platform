import { messages } from '@tourism/i18n';
import type { TrustStat } from '../../lib/trust-band';
import { PaymentRow } from './payment-row';
import { StatCluster } from './stat-cluster';

/**
 * Editorial inline trust band: content sits directly on the page between two
 * hairlines — eyebrow + one-line serif heading on the left, live count-up stats
 * with hairline dividers on the right — with the static payment row + security
 * caption tucked below.
 */
export function TrustBand({ stats }: { stats: TrustStat[] }) {
  if (stats.length === 0) return null;
  const t = messages.trustBand;
  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-border/60 grid gap-8 border-y py-10 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div className="space-y-3 text-center lg:text-left">
            <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              {t.eyebrow}
            </p>
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
              {t.heading}
            </h2>
          </div>
          <StatCluster stats={stats} />
        </div>
        <div className="mt-8">
          <PaymentRow />
        </div>
      </div>
    </section>
  );
}

export default TrustBand;
