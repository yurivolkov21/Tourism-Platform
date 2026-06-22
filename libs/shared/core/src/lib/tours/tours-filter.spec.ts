import {
  durationBucket,
  filterTours,
  sortTours,
  type FilterableTour,
} from './tours-filter.js';

type Row = FilterableTour & { slug: string };

const tours: Row[] = [
  { slug: 'a', destination: 'Hạ Long Bay', durationDays: 2, basePrice: 320, rating: 4.8, reviewCount: 124, travelStyles: ['couples', 'luxury'], themes: ['cruise', 'nature'] },
  { slug: 'b', destination: 'Sa Pa', durationDays: 2, basePrice: 210, rating: 4.7, reviewCount: 64, travelStyles: ['adventure', 'group'], themes: ['trekking', 'nature', 'cultural'] },
  { slug: 'c', destination: 'Hội An', durationDays: 1, basePrice: 95, rating: 4.9, reviewCount: 210, travelStyles: ['family', 'couples'], themes: ['cultural', 'culinary'] },
  { slug: 'd', destination: 'Hà Giang', durationDays: 3, basePrice: 295, rating: 4.9, reviewCount: 71, travelStyles: ['adventure', 'group'], themes: ['trekking', 'nature', 'cultural'] },
  { slug: 'e', destination: 'Phú Quốc', durationDays: 5, basePrice: 450, rating: 4.6, reviewCount: 30, travelStyles: ['couples', 'luxury'], themes: ['beach'] },
];

const slugs = (rows: Row[]) => rows.map((r) => r.slug);

describe('durationBucket', () => {
  it('buckets days into 1 / 2-3 / 4+', () => {
    expect(durationBucket(1)).toBe('1');
    expect(durationBucket(2)).toBe('2-3');
    expect(durationBucket(3)).toBe('2-3');
    expect(durationBucket(4)).toBe('4+');
    expect(durationBucket(7)).toBe('4+');
  });
});

describe('filterTours', () => {
  it('returns all tours when no filter is given (passthrough)', () => {
    expect(filterTours(tours)).toHaveLength(5);
    expect(filterTours(tours, {})).toHaveLength(5);
  });

  it('filters by a single destination', () => {
    expect(slugs(filterTours(tours, { destinations: ['Sa Pa'] }))).toEqual(['b']);
  });

  it('treats multiple values within a facet as OR', () => {
    expect(slugs(filterTours(tours, { destinations: ['Sa Pa', 'Hội An'] }))).toEqual(['b', 'c']);
  });

  it('filters by duration bucket', () => {
    expect(slugs(filterTours(tours, { durations: ['1'] }))).toEqual(['c']);
    expect(slugs(filterTours(tours, { durations: ['4+'] }))).toEqual(['e']);
  });

  it('filters by travel style (any match)', () => {
    expect(slugs(filterTours(tours, { styles: ['adventure'] }))).toEqual(['b', 'd']);
  });

  it('filters by theme (any match)', () => {
    expect(slugs(filterTours(tours, { themes: ['beach'] }))).toEqual(['e']);
    expect(slugs(filterTours(tours, { themes: ['cultural'] }))).toEqual(['b', 'c', 'd']);
  });

  it('combines facets with AND', () => {
    expect(slugs(filterTours(tours, { styles: ['adventure'], destinations: ['Sa Pa'] }))).toEqual(['b']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterTours(tours, { destinations: ['Mars'] })).toEqual([]);
  });

  it('preserves input order', () => {
    expect(slugs(filterTours(tours, { themes: ['cultural'] }))).toEqual(['b', 'c', 'd']);
  });
});

describe('sortTours', () => {
  it('sorts by price ascending / descending', () => {
    expect(slugs(sortTours(tours, 'price-asc'))).toEqual(['c', 'b', 'd', 'a', 'e']);
    expect(slugs(sortTours(tours, 'price-desc'))).toEqual(['e', 'a', 'd', 'b', 'c']);
  });

  it('sorts by rating (reviewCount as tiebreak)', () => {
    expect(slugs(sortTours(tours, 'rating'))).toEqual(['c', 'd', 'a', 'b', 'e']);
  });

  it('sorts by popularity (reviewCount)', () => {
    expect(slugs(sortTours(tours, 'popular'))).toEqual(['c', 'a', 'd', 'b', 'e']);
  });

  it('does not mutate the input array', () => {
    const before = slugs(tours);
    sortTours(tours, 'price-desc');
    expect(slugs(tours)).toEqual(before);
  });
});
