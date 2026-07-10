import { messages } from '@tourism/i18n';
import type { TrustStat } from '../../lib/trust-band';
import { PaymentMarquee } from './payment-marquee';
import { StatCluster } from './stat-cluster';

/** Dark trust band: eyebrow · live stats · hairline · monochrome payment marquee · security caption. */
export function TrustBand({ stats }: { stats: TrustStat[] }) {
  if (stats.length === 0) return null;
  const t = messages.trustBand;
  return (
    <section className="dark bg-background text-foreground py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="text-primary mb-9 text-center text-xs font-semibold tracking-[0.22em] uppercase">
          {t.eyebrow}
        </p>
        <StatCluster stats={stats} />
        <div className="border-border/70 mt-12 border-t pt-10">
          <PaymentMarquee />
        </div>
      </div>
    </section>
  );
}

export default TrustBand;
