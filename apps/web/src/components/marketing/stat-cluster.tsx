import type { TrustStat } from '../../lib/trust-band';

import { MetricValue } from './metric-value';

/** Live stats as an editorial inline row — hairline dividers, a big serif count-up
 * number (MetricValue handles the "4.6★" suffix), and a muted label. */
export function StatCluster({ stats }: { stats: TrustStat[] }) {
  return (
    <div className="divide-border/60 flex items-start justify-center divide-x lg:justify-end">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col px-5 text-center first:pl-0 last:pr-0 sm:px-9"
        >
          <div className="font-heading text-primary text-3xl font-semibold tabular-nums sm:text-4xl">
            <MetricValue value={s.value} />
          </div>
          <div className="text-muted-foreground mt-1.5 text-sm tracking-wide">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatCluster;
