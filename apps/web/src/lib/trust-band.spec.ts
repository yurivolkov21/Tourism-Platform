import { buildTrustStats } from './trust-band';

const labels = {
  tours: 'Curated tours',
  destinations: 'Destinations',
  rating: 'Average rating',
};

describe('buildTrustStats', () => {
  it('formats tours + destinations as plain counts and rating with a star', () => {
    const rows = buildTrustStats(
      { tours: 23, destinations: 16, reviewCount: 26, averageRating: 4.4 },
      labels,
    );
    expect(rows).toEqual([
      { value: '23', label: 'Curated tours' },
      { value: '16', label: 'Destinations' },
      { value: '4.4★', label: 'Average rating' },
    ]);
  });

  it('keeps one decimal place on whole-number ratings', () => {
    const rows = buildTrustStats(
      { tours: 10, destinations: 5, reviewCount: 4, averageRating: 5 },
      labels,
    );
    expect(rows[2]).toEqual({ value: '5.0★', label: 'Average rating' });
  });

  it('omits the rating row when there are no reviews (averageRating null)', () => {
    const rows = buildTrustStats(
      { tours: 10, destinations: 5, reviewCount: 0, averageRating: null },
      labels,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.label)).toEqual(['Curated tours', 'Destinations']);
  });

  it('omits count rows that are zero (so a cold/empty API never shows "0 tours")', () => {
    const rows = buildTrustStats(
      { tours: 0, destinations: 0, reviewCount: 0, averageRating: null },
      labels,
    );
    expect(rows).toEqual([]);
  });
});
