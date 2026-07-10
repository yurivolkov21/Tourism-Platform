export type TrustStats = {
  tours: number;
  destinations: number;
  reviewCount: number;
  averageRating: number | null;
};

export type TrustStat = { value: string; label: string };

/**
 * Shapes the live counts into display rows for the trust band. Zero counts and a
 * null rating are dropped so a cold or empty API never renders "0 tours" / no star.
 */
export function buildTrustStats(
  stats: TrustStats,
  labels: { tours: string; destinations: string; rating: string },
): TrustStat[] {
  const rows: TrustStat[] = [];
  if (stats.tours > 0)
    rows.push({ value: String(stats.tours), label: labels.tours });
  if (stats.destinations > 0)
    rows.push({
      value: String(stats.destinations),
      label: labels.destinations,
    });
  if (stats.averageRating !== null)
    rows.push({
      value: `${stats.averageRating.toFixed(1)}★`,
      label: labels.rating,
    });
  return rows;
}
