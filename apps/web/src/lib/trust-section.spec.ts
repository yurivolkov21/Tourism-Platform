import { buildTrustSectionStats, trustGridClass } from './trust-section';

const labels = {
  rating: 'Average tour rating',
  itineraries: 'Curated itineraries',
  supportValue: '24/7',
  supportLabel: 'On-trip support',
};

const full = {
  tours: 12,
  destinations: 8,
  reviewCount: 5,
  averageRating: 4.75,
};

describe('buildTrustSectionStats', () => {
  it('builds rating · itineraries · support rows from real data, in order', () => {
    expect(buildTrustSectionStats(full, labels)).toEqual([
      { value: '4.8/5', label: 'Average tour rating' },
      { value: '12', label: 'Curated itineraries' },
      { value: '24/7', label: 'On-trip support' },
    ]);
  });

  it('hides the rating row when there are no reviews yet', () => {
    const rows = buildTrustSectionStats(
      { ...full, averageRating: null },
      labels,
    );
    expect(rows.map((r) => r.label)).toEqual([
      'Curated itineraries',
      'On-trip support',
    ]);
  });

  it('hides the itineraries row when no tours are published', () => {
    const rows = buildTrustSectionStats({ ...full, tours: 0 }, labels);
    expect(rows.map((r) => r.label)).toEqual([
      'Average tour rating',
      'On-trip support',
    ]);
  });

  it('falls back to the support pledge alone when nothing is live', () => {
    expect(
      buildTrustSectionStats(
        { tours: 0, destinations: 0, reviewCount: 0, averageRating: null },
        labels,
      ),
    ).toEqual([{ value: '24/7', label: 'On-trip support' }]);
  });

  it('formats the rating to one decimal place', () => {
    const rows = buildTrustSectionStats({ ...full, averageRating: 5 }, labels);
    expect(rows[0].value).toBe('5.0/5');
  });
});

describe('trustGridClass', () => {
  it('maps 1–4 rows to balanced grid classes', () => {
    expect(trustGridClass(1)).toContain('grid-cols-1');
    expect(trustGridClass(2)).toContain('lg:grid-cols-2');
    expect(trustGridClass(3)).toContain('lg:grid-cols-3');
    expect(trustGridClass(4)).toContain('lg:grid-cols-4');
  });

  it('clamps out-of-range counts to the nearest bound', () => {
    expect(trustGridClass(0)).toBe(trustGridClass(1));
    expect(trustGridClass(9)).toBe(trustGridClass(4));
  });
});
