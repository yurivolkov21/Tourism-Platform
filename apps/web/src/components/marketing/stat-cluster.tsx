import type { TrustStat } from '../../lib/trust-band';

/** Free-floating stat units (no dividers) — big serif numbers + muted labels. */
export function StatCluster({ stats }: { stats: TrustStat[] }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-14 gap-y-6">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="font-heading text-foreground text-3xl font-semibold tabular-nums">
            {s.value}
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
