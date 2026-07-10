import { messages } from '@tourism/i18n';
import { Compass, MapPin, Star, type LucideIcon } from 'lucide-react';

import type { TrustStat } from '../../lib/trust-band';

// Map each stat to a lucide icon by its i18n label (the same source buildTrustStats reads).
const ICON_BY_LABEL: Record<string, LucideIcon> = {
  [messages.trustBand.stats.tours]: Compass,
  [messages.trustBand.stats.destinations]: MapPin,
  [messages.trustBand.stats.rating]: Star,
};

/** Live stats — an emerald icon in a soft disc, a big serif number, and a muted label. */
export function StatCluster({ stats }: { stats: TrustStat[] }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-8 sm:gap-x-16">
      {stats.map((s) => {
        const Icon = ICON_BY_LABEL[s.label];
        return (
          <div key={s.label} className="flex flex-col items-center text-center">
            {Icon ? (
              <span className="bg-primary/10 text-primary mb-3 inline-flex size-11 items-center justify-center rounded-full">
                <Icon className="size-5" aria-hidden />
              </span>
            ) : null}
            <div className="font-heading text-primary text-3xl font-semibold tabular-nums sm:text-4xl">
              {s.value}
            </div>
            <div className="text-muted-foreground mt-1.5 text-sm tracking-wide">
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatCluster;
