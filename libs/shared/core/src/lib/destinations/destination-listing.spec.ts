import {
  applyTourCounts,
  filterDestinations,
  searchDestinations,
  sortDestinations,
  tallyToursByDestination,
  type DestinationCardData,
} from './destination-listing.js';

const destinations: DestinationCardData[] = [
  {
    slug: 'ha-long-bay',
    name: 'Hạ Long Bay',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'Limestone karsts',
    tourCount: 5,
    image: 'https://example.com/halong.jpg',
  },
  {
    slug: 'hoi-an',
    name: 'Hội An',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'Ancient town',
    tourCount: 8,
    image: 'https://example.com/hoian.jpg',
  },
  {
    slug: 'phu-quoc',
    name: 'Phú Quốc',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'Island beaches',
    tourCount: 3,
    image: 'https://example.com/phuquoc.jpg',
  },
  {
    slug: 'mystery',
    name: 'Mystery Spot',
    country: 'Vietnam',
    region: null,
    description: null,
    tourCount: 0,
    image: 'https://example.com/mystery.jpg',
  },
];

describe('filterDestinations', () => {
  it('returns all when no region filter', () => {
    expect(filterDestinations(destinations)).toHaveLength(4);
  });

  it('filters by region (OR within facet)', () => {
    const result = filterDestinations(destinations, {
      regions: ['Northern Vietnam', 'Central Vietnam'],
    });
    expect(result.map((d) => d.slug)).toEqual(['ha-long-bay', 'hoi-an']);
  });

  it('maps null region to Other bucket', () => {
    expect(filterDestinations(destinations, { regions: ['Other'] }).map((d) => d.slug)).toEqual([
      'mystery',
    ]);
  });
});

describe('searchDestinations', () => {
  it('matches name accent-insensitively', () => {
    expect(searchDestinations(destinations, 'hoi an').map((d) => d.slug)).toEqual(['hoi-an']);
  });

  it('returns copy when query empty', () => {
    expect(searchDestinations(destinations, '  ')).toHaveLength(4);
  });
});

describe('sortDestinations', () => {
  it('sorts by tour count descending', () => {
    expect(sortDestinations(destinations, 'tours-desc').map((d) => d.slug)).toEqual([
      'hoi-an',
      'ha-long-bay',
      'phu-quoc',
      'mystery',
    ]);
  });

  it('sorts by name ascending', () => {
    expect(sortDestinations(destinations, 'name-asc')[0]?.slug).toBe('ha-long-bay');
  });
});

describe('tallyToursByDestination', () => {
  it('counts M:N tour links per slug', () => {
    const counts = tallyToursByDestination([
      {
        destinations: [
          { destination: { slug: 'hoi-an' } },
          { destination: { slug: 'ha-long-bay' } },
        ],
      },
      { destinations: [{ destination: { slug: 'hoi-an' } }] },
    ]);
    expect(counts).toEqual({ 'hoi-an': 2, 'ha-long-bay': 1 });
  });
});

describe('applyTourCounts', () => {
  it('merges counts onto tiles', () => {
    const next = applyTourCounts(destinations, { 'hoi-an': 12 });
    expect(next.find((d) => d.slug === 'hoi-an')?.tourCount).toBe(12);
  });
});
