import type { TourCardData } from '../components/tours/tour-card';
import {
  parseMealsLine,
  parseTransportLine,
  pickRelated,
} from './tour-detail-derive';

function card(slug: string): TourCardData {
  return {
    slug,
    title: slug,
    destination: 'Hanoi',
    durationDays: 1,
    basePrice: 50,
    currency: 'USD',
    rating: 5,
    reviewCount: 1,
    badges: [],
  };
}

describe('parseMealsLine', () => {
  it('extracts the meal-count line from included', () => {
    const included = [
      '4 breakfasts, 3 lunches, 2 dinners',
      'Private car & cruise transfers',
    ];
    expect(parseMealsLine(included)).toBe('4 breakfasts, 3 lunches, 2 dinners');
  });

  it('matches a singular count', () => {
    expect(parseMealsLine(['1 breakfast on the cruise'])).toBe(
      '1 breakfast on the cruise',
    );
  });

  it('does not match prose meals without a count (e.g. "Buffet lunch")', () => {
    expect(
      parseMealsLine(['Buffet lunch', 'English-speaking guide']),
    ).toBeUndefined();
  });

  it('returns undefined when no meal line is present', () => {
    expect(parseMealsLine(['Local guide', 'Entrance fees'])).toBeUndefined();
  });
});

describe('parseTransportLine', () => {
  it('finds a transport line', () => {
    expect(
      parseTransportLine(['English guide', 'Private car & cruise transfers']),
    ).toBe('Private car & cruise transfers');
  });

  it('returns undefined when none match', () => {
    expect(parseTransportLine(['Local guide', 'Lunch'])).toBeUndefined();
  });
});

describe('pickRelated', () => {
  it('excludes the current tour and caps at four', () => {
    const cards = ['a', 'b', 'c', 'd', 'e', 'f'].map(card);
    const out = pickRelated(cards, 'a');
    expect(out.map((c) => c.slug)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('returns fewer than the cap when the pool is small', () => {
    const cards = ['a', 'b'].map(card);
    expect(pickRelated(cards, 'a').map((c) => c.slug)).toEqual(['b']);
  });
});
