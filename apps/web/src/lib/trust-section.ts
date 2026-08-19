import type { TrustStat, TrustStats } from './trust-band';

/**
 * Row selection for the "Trusted by travellers worldwide" section
 * (spec: docs/06-specs/2026-07-17-home-trust-real-data-design.md).
 * Honesty rule: a row renders ONLY from real data — no fabricated numbers. The
 * support row is a static pledge (copy, not a metric), so it always renders and
 * the section never comes up empty.
 */

export interface TrustSectionLabels {
  rating: string;
  itineraries: string;
  supportValue: string;
  supportLabel: string;
}

export function buildTrustSectionStats(
  stats: TrustStats,
  labels: TrustSectionLabels,
): TrustStat[] {
  const rows: TrustStat[] = [];
  if (stats.averageRating !== null) {
    rows.push({
      value: `${stats.averageRating.toFixed(1)}/5`,
      label: labels.rating,
    });
  }
  if (stats.tours > 0) {
    rows.push({ value: String(stats.tours), label: labels.itineraries });
  }
  rows.push({ value: labels.supportValue, label: labels.supportLabel });
  return rows;
}

// Static map — Tailwind only sees class names written out in full.
const GRID_CLASSES: Record<number, string> = {
  1: 'grid grid-cols-1 gap-8',
  2: 'grid grid-cols-2 gap-8 lg:grid-cols-2',
  3: 'grid grid-cols-2 gap-8 lg:grid-cols-3',
  4: 'grid grid-cols-2 gap-8 lg:grid-cols-4',
};

/** Balanced grid classes for 1–4 stat rows (out-of-range counts clamp). */
export function trustGridClass(count: number): string {
  return GRID_CLASSES[Math.min(4, Math.max(1, count))];
}
