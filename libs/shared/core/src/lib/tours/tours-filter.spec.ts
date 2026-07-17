import {
  durationBucket,
  priceBucket,
  RATING_BUCKET_MINIMUM,
  filterTours,
  sortTours,
  searchTours,
  normalizeText,
  type FilterableTour,
  type SearchableTour,
} from './tours-filter.js';

type Row = FilterableTour & { slug: string };

const tours: Row[] = [
  {
    slug: 'a',
    destination: 'Hạ Long Bay',
    durationDays: 2,
    basePrice: 320,
    rating: 4.8,
    reviewCount: 124,
    category: 'cruises',
    travelStyles: ['couples', 'luxury'],
    themes: ['cruise', 'nature'],
  },
  {
    slug: 'b',
    destination: 'Sa Pa',
    durationDays: 2,
    basePrice: 210,
    rating: 4.7,
    reviewCount: 64,
    category: 'trekking',
    travelStyles: ['adventure', 'group'],
    themes: ['trekking', 'nature', 'cultural'],
  },
  {
    slug: 'c',
    destination: 'Hội An',
    durationDays: 1,
    basePrice: 95,
    rating: 4.9,
    reviewCount: 210,
    category: 'cultural',
    travelStyles: ['family', 'couples'],
    themes: ['cultural', 'culinary'],
  },
  {
    slug: 'd',
    destination: 'Hà Giang',
    durationDays: 3,
    basePrice: 295,
    rating: 4.9,
    reviewCount: 71,
    category: 'trekking',
    travelStyles: ['adventure', 'group'],
    themes: ['trekking', 'nature', 'cultural'],
  },
  {
    slug: 'e',
    destination: 'Phú Quốc',
    durationDays: 5,
    basePrice: 450,
    rating: 4.6,
    reviewCount: 30,
    category: 'beach',
    travelStyles: ['couples', 'luxury'],
    themes: ['beach'],
  },
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

describe('priceBucket', () => {
  it('buckets price into <100 / 100-300 / 300+', () => {
    expect(priceBucket(75)).toBe('<100');
    expect(priceBucket(99)).toBe('<100');
    expect(priceBucket(100)).toBe('100-300');
    expect(priceBucket(300)).toBe('100-300');
    expect(priceBucket(301)).toBe('300+');
    expect(priceBucket(540)).toBe('300+');
  });
});

describe('filterTours', () => {
  it('returns all tours when no filter is given (passthrough)', () => {
    expect(filterTours(tours)).toHaveLength(5);
    expect(filterTours(tours, {})).toHaveLength(5);
  });

  it('filters by a single destination', () => {
    expect(slugs(filterTours(tours, { destinations: ['Sa Pa'] }))).toEqual([
      'b',
    ]);
  });

  it('treats multiple values within a facet as OR', () => {
    expect(
      slugs(filterTours(tours, { destinations: ['Sa Pa', 'Hội An'] })),
    ).toEqual(['b', 'c']);
  });

  it('filters by category slug (OR within the facet)', () => {
    expect(slugs(filterTours(tours, { categories: ['trekking'] }))).toEqual([
      'b',
      'd',
    ]);
    expect(
      slugs(filterTours(tours, { categories: ['cruises', 'beach'] })),
    ).toEqual(['a', 'e']);
  });

  it('excludes tours with no category when a category filter is active', () => {
    const rows: Row[] = [
      {
        slug: 'x',
        destination: 'X',
        durationDays: 1,
        basePrice: 50,
        rating: 4,
        reviewCount: 1,
      },
    ];
    expect(slugs(filterTours(rows, { categories: ['cruises'] }))).toEqual([]);
  });

  it('filters by duration bucket', () => {
    expect(slugs(filterTours(tours, { durations: ['1'] }))).toEqual(['c']);
    expect(slugs(filterTours(tours, { durations: ['4+'] }))).toEqual(['e']);
  });

  it('filters by travel style (any match)', () => {
    expect(slugs(filterTours(tours, { styles: ['adventure'] }))).toEqual([
      'b',
      'd',
    ]);
  });

  it('filters by theme (any match)', () => {
    expect(slugs(filterTours(tours, { themes: ['beach'] }))).toEqual(['e']);
    expect(slugs(filterTours(tours, { themes: ['cultural'] }))).toEqual([
      'b',
      'c',
      'd',
    ]);
  });

  it('filters by price bucket (any match)', () => {
    expect(slugs(filterTours(tours, { prices: ['<100'] }))).toEqual(['c']);
    expect(slugs(filterTours(tours, { prices: ['100-300'] }))).toEqual([
      'b',
      'd',
    ]);
    expect(slugs(filterTours(tours, { prices: ['300+'] }))).toEqual(['a', 'e']);
    expect(slugs(filterTours(tours, { prices: ['<100', '300+'] }))).toEqual([
      'a',
      'c',
      'e',
    ]);
  });

  it('combines facets with AND', () => {
    expect(
      slugs(
        filterTours(tours, { styles: ['adventure'], destinations: ['Sa Pa'] }),
      ),
    ).toEqual(['b']);
    expect(
      slugs(filterTours(tours, { prices: ['100-300'], styles: ['adventure'] })),
    ).toEqual(['b', 'd']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterTours(tours, { destinations: ['Mars'] })).toEqual([]);
  });

  it('preserves input order', () => {
    expect(slugs(filterTours(tours, { themes: ['cultural'] }))).toEqual([
      'b',
      'c',
      'd',
    ]);
  });

  describe('ratings facet', () => {
    const rated: Row[] = [
      {
        slug: 'hi',
        destination: 'A',
        durationDays: 1,
        basePrice: 50,
        rating: 4.8,
        reviewCount: 10,
      },
      {
        slug: 'mid',
        destination: 'B',
        durationDays: 1,
        basePrice: 50,
        rating: 4.2,
        reviewCount: 10,
      },
      {
        slug: 'exact4',
        destination: 'C',
        durationDays: 1,
        basePrice: 50,
        rating: 4.0,
        reviewCount: 10,
      },
      {
        slug: 'low',
        destination: 'D',
        durationDays: 1,
        basePrice: 50,
        rating: 3.6,
        reviewCount: 10,
      },
      {
        slug: 'poor',
        destination: 'E',
        durationDays: 1,
        basePrice: 50,
        rating: 2.9,
        reviewCount: 10,
      },
    ];

    it('exposes the minimum rating for each bucket', () => {
      expect(RATING_BUCKET_MINIMUM['4.5+']).toBe(4.5);
      expect(RATING_BUCKET_MINIMUM['4+']).toBe(4);
      expect(RATING_BUCKET_MINIMUM['3.5+']).toBe(3.5);
    });

    it('keeps only tours rated at or above the selected threshold', () => {
      expect(slugs(filterTours(rated, { ratings: ['4.5+'] }))).toEqual(['hi']);
      expect(slugs(filterTours(rated, { ratings: ['3.5+'] }))).toEqual([
        'hi',
        'mid',
        'exact4',
        'low',
      ]);
    });

    it('includes tours exactly on the threshold boundary', () => {
      expect(slugs(filterTours(rated, { ratings: ['4+'] }))).toEqual([
        'hi',
        'mid',
        'exact4',
      ]);
    });

    it('treats multiple buckets as OR (lowest threshold wins)', () => {
      expect(slugs(filterTours(rated, { ratings: ['4.5+', '3.5+'] }))).toEqual([
        'hi',
        'mid',
        'exact4',
        'low',
      ]);
    });

    it('imposes no constraint when empty', () => {
      expect(filterTours(rated, { ratings: [] })).toHaveLength(5);
    });

    it('combines with other facets with AND', () => {
      expect(
        slugs(filterTours(rated, { ratings: ['4+'], destinations: ['B'] })),
      ).toEqual(['mid']);
    });
  });
});

describe('normalizeText', () => {
  it('lowercases, trims and strips Vietnamese diacritics', () => {
    expect(normalizeText('  Hà Nội ')).toBe('ha noi');
    expect(normalizeText('Hội An')).toBe('hoi an');
    expect(normalizeText('SA PA')).toBe('sa pa');
  });

  it('folds the Vietnamese đ/Đ (which has no NFD decomposition) to d', () => {
    expect(normalizeText('Đà Nẵng')).toBe('da nang');
  });
});

describe('searchTours', () => {
  type SRow = SearchableTour & { slug: string };
  const rows: SRow[] = [
    {
      slug: 'a',
      title: 'Hạ Long Bay Overnight Cruise',
      destination: 'Hạ Long Bay',
      categoryName: 'Cruises',
    },
    {
      slug: 'b',
      title: 'Sa Pa Hill-Tribe Trek',
      destination: 'Sa Pa',
      categoryName: 'Trekking',
    },
    {
      slug: 'c',
      title: 'Old Quarter Walk',
      destination: 'Hà Nội',
      categoryName: 'Cultural',
    },
    {
      slug: 'd',
      title: 'Central Coast Beach Escape',
      destination: 'Đà Nẵng',
      categoryName: 'Beach',
    },
  ];
  const srch = (q: string) => searchTours(rows, q).map((r) => r.slug);

  it('returns all tours (a copy) for an empty or whitespace query', () => {
    expect(searchTours(rows, '')).toHaveLength(4);
    expect(searchTours(rows, '   ')).toHaveLength(4);
    expect(searchTours(rows, '')).not.toBe(rows);
  });

  it('matches the destination, case- and diacritic-insensitively', () => {
    expect(srch('sa pa')).toEqual(['b']);
    expect(srch('HA NOI')).toEqual(['c']);
    expect(srch('da nang')).toEqual(['d']);
  });

  it('matches the tour title', () => {
    expect(srch('overnight')).toEqual(['a']);
  });

  it('matches the category name', () => {
    expect(srch('trekking')).toEqual(['b']);
  });

  it('returns empty when nothing matches', () => {
    expect(searchTours(rows, 'antarctica')).toEqual([]);
  });

  it('preserves input order and does not mutate the input', () => {
    const before = rows.map((r) => r.slug);
    searchTours(rows, 'a');
    expect(rows.map((r) => r.slug)).toEqual(before);
  });
});

describe('sortTours', () => {
  it('sorts by price ascending / descending', () => {
    expect(slugs(sortTours(tours, 'price-asc'))).toEqual([
      'c',
      'b',
      'd',
      'a',
      'e',
    ]);
    expect(slugs(sortTours(tours, 'price-desc'))).toEqual([
      'e',
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('sorts by rating (reviewCount as tiebreak)', () => {
    expect(slugs(sortTours(tours, 'rating'))).toEqual([
      'c',
      'd',
      'a',
      'b',
      'e',
    ]);
  });

  it('sorts by popularity (reviewCount)', () => {
    expect(slugs(sortTours(tours, 'popular'))).toEqual([
      'c',
      'a',
      'd',
      'b',
      'e',
    ]);
  });

  it('does not mutate the input array', () => {
    const before = slugs(tours);
    sortTours(tours, 'price-desc');
    expect(slugs(tours)).toEqual(before);
  });
});
