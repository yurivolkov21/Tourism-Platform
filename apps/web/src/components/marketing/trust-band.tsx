import { messages } from '@tourism/i18n';
import type { TrustStat } from '../../lib/trust-band';
import { PaymentMarquee } from './payment-marquee';
import { StatCluster } from './stat-cluster';

/**
 * Light trust panel: a soft emerald-washed card on the cream page — eyebrow ·
 * live stats (iconed) · hairline · monochrome payment marquee · security caption.
 */
export function TrustBand({ stats }: { stats: TrustStat[] }) {
  if (stats.length === 0) return null;
  const t = messages.trustBand;
  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="border-primary/10 from-primary/5 to-card rounded-3xl border bg-linear-to-b p-8 shadow-sm sm:p-10">
          <p className="text-primary mb-8 text-center text-xs font-semibold tracking-[0.2em] uppercase">
            {t.eyebrow}
          </p>
          <StatCluster stats={stats} />
          <div className="border-border/60 mt-8 border-t pt-6">
            <PaymentMarquee />
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrustBand;
