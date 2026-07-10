import { computeAboutMetrics, formatAboutMetricValues } from './about-metrics';

const tours = [
  { rating: 5, reviewCount: 2 },
  { rating: 4, reviewCount: 3 },
  { rating: 0, reviewCount: 0 },
];
const destinations = [
  { region: 'Northern Vietnam' },
  { region: 'Northern Vietnam' },
  { region: 'Central Vietnam' },
  { region: 'Southern Vietnam' },
  { region: null },
];

describe('computeAboutMetrics', () => {
  it('counts tours and destinations', () => {
    const m = computeAboutMetrics(tours, destinations);
    expect(m.tours).toBe(3);
    expect(m.destinations).toBe(5);
  });

  it('counts distinct non-null regions', () => {
    expect(computeAboutMetrics(tours, destinations).regions).toBe(3);
  });

  it('weights the rating by review count (1-dp)', () => {
    // (5*2 + 4*3) / (2+3) = 22/5 = 4.4
    expect(computeAboutMetrics(tours, destinations).rating).toBe(4.4);
  });

  it('returns rating 0 when there are no reviews', () => {
    expect(
      computeAboutMetrics([{ rating: 0, reviewCount: 0 }], []).rating,
    ).toBe(0);
  });
});

describe('formatAboutMetricValues', () => {
  it('formats counts and a starred rating', () => {
    expect(
      formatAboutMetricValues({
        tours: 15,
        destinations: 13,
        regions: 3,
        rating: 4.7,
      }),
    ).toEqual(['15', '13', '3', '4.7★']);
  });

  it('shows a dash when there is no rating', () => {
    expect(
      formatAboutMetricValues({
        tours: 1,
        destinations: 1,
        regions: 1,
        rating: 0,
      })[3],
    ).toBe('—');
  });
});
