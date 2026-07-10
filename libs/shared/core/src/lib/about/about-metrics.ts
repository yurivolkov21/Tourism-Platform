export interface RatedTour {
  rating: number;
  reviewCount: number;
}

export interface RegionItem {
  region: string | null;
}

export interface AboutMetrics {
  tours: number;
  destinations: number;
  regions: number;
  rating: number;
}

export function computeAboutMetrics(
  tours: readonly RatedTour[],
  destinations: readonly RegionItem[],
): AboutMetrics {
  const totalReviews = tours.reduce((sum, t) => sum + t.reviewCount, 0);
  const rating =
    totalReviews > 0
      ? Math.round(
          (tours.reduce((sum, t) => sum + t.rating * t.reviewCount, 0) /
            totalReviews) *
            10,
        ) / 10
      : 0;
  const regions = new Set(
    destinations.map((d) => d.region).filter((r): r is string => Boolean(r)),
  ).size;
  return {
    tours: tours.length,
    destinations: destinations.length,
    regions,
    rating,
  };
}

export function formatAboutMetricValues(
  m: AboutMetrics,
): [string, string, string, string] {
  return [
    String(m.tours),
    String(m.destinations),
    String(m.regions),
    m.rating > 0 ? `${m.rating}★` : '—',
  ];
}
