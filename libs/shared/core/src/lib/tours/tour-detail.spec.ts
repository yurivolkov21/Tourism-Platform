import type { TourCardData } from './tour-card.js';
import {
  buildAccommodation,
  deriveHeroBadge,
  parseMealsLine,
  parseTransportLine,
  pickRelated,
  toTourDetail,
} from './tour-detail.js';

const cards: TourCardData[] = [
  {
    slug: 'a',
    title: 'A',
    destination: 'Hanoi',
    durationDays: 5,
    basePrice: 100,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 1,
    badges: [],
  },
  {
    slug: 'b',
    title: 'B',
    destination: 'Da Nang',
    durationDays: 3,
    basePrice: 200,
    currency: 'USD',
    rating: 4,
    reviewCount: 0,
    badges: [],
  },
];

describe('parseMealsLine', () => {
  it('finds a meals summary line', () => {
    const included = ['4 breakfasts, 3 lunches, 2 dinners', 'Guide'];
    expect(parseMealsLine(included)).toBe('4 breakfasts, 3 lunches, 2 dinners');
  });

  it('returns undefined when no meals line', () => {
    expect(parseMealsLine(['Local guide', 'Entrance fees'])).toBeUndefined();
  });
});

describe('parseTransportLine', () => {
  it('finds transport line', () => {
    expect(parseTransportLine(['Private car transfers', 'Guide'])).toBe(
      'Private car transfers',
    );
  });

  it('returns undefined when absent', () => {
    expect(parseTransportLine(['Guide only'])).toBeUndefined();
  });
});

describe('buildAccommodation', () => {
  it('returns day tour label for 1 day', () => {
    expect(buildAccommodation(1)).toBe('Day tour — no overnight stay');
  });

  it('returns hotel nights for multi-day', () => {
    expect(buildAccommodation(5)).toBe('Hotel · 4 nights');
  });
});

describe('deriveHeroBadge', () => {
  it('prefers BEST_VALUE then POPULAR', () => {
    expect(deriveHeroBadge(['POPULAR', 'BEST_VALUE'])).toBe('BEST_VALUE');
    expect(deriveHeroBadge(['NEW', 'POPULAR'])).toBe('POPULAR');
  });
});

describe('pickRelated', () => {
  it('excludes current slug and caps results', () => {
    expect(pickRelated(cards, 'a').map((c) => c.slug)).toEqual(['b']);
    expect(pickRelated(cards, 'a', 1)).toHaveLength(1);
  });
});

describe('toTourDetail', () => {
  it('maps optional derived fields from included and duration', () => {
    const detail = toTourDetail(
      {
        id: '1',
        slug: 'north-vietnam',
        title: 'North Vietnam',
        summary: 'Classic loop',
        durationDays: 5,
        basePrice: '487',
        compareAtPrice: '550',
        currency: 'USD',
        averageRating: 4.7,
        reviewsCount: 3,
        badges: ['BEST_VALUE'],
        destinations: [
          { isPrimary: true, destination: { slug: 'hanoi', name: 'Hanoi' } },
        ],
        media: [{ url: 'https://example.com/hero.jpg', role: 'hero', type: 'IMAGE', publicId: 'x', sortOrder: 0 }],
        included: ['4 breakfasts, 3 lunches, 2 dinners', 'Private car transfers'],
        excluded: ['Flights'],
        itinerary: [{ dayNumber: 1, title: 'Arrival', description: 'Pickup' }],
        faqs: [],
        policies: [],
      } as never,
      [],
    );

    expect(detail.meals).toBe('4 breakfasts, 3 lunches, 2 dinners');
    expect(detail.transport).toBe('Private car transfers');
    expect(detail.accommodation).toBe('Hotel · 4 nights');
    expect(detail.badge).toBe('BEST_VALUE');
    expect(detail.notIncluded).toEqual(['Flights']);
  });
});
