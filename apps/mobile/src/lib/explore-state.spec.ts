import type { TourCardVm } from './tours';
import {
  applyExploreState,
  defaultExploreState,
  hasActiveFilters,
  initialExploreState,
  toggleBucket,
} from './explore-state';

const tour = (over: Partial<TourCardVm>): TourCardVm => ({
  id: 'x',
  slug: 'x',
  title: 'X',
  destination: 'Hanoi',
  durationDays: 2,
  basePrice: 150,
  currency: 'USD',
  rating: 4.0,
  reviewCount: 10,
  badges: [],
  ...over,
});

const tours: TourCardVm[] = [
  tour({ slug: 'a', title: 'Ha Long Bay Cruise', destination: 'Ha Long', durationDays: 3, basePrice: 450, rating: 4.9, reviewCount: 200 }),
  tour({ slug: 'b', title: 'Hanoi Street Food', destination: 'Hà Nội', durationDays: 1, basePrice: 49, rating: 4.7, reviewCount: 320 }),
  tour({ slug: 'c', title: 'Sapa Trek', destination: 'Sapa', durationDays: 4, basePrice: 220, rating: 4.8, reviewCount: 90 }),
];

test('default state returns all tours sorted by popularity (reviewCount desc)', () => {
  expect(applyExploreState(tours, defaultExploreState).map((t) => t.slug)).toEqual(['b', 'a', 'c']);
});

test('query narrows accent-insensitively', () => {
  const state = { ...defaultExploreState, query: 'ha noi' };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['b']);
});

test('destination + duration + price facets AND together', () => {
  const state = {
    ...defaultExploreState,
    destination: 'Ha Long',
    durations: ['2-3' as const],
    prices: ['300+' as const],
  };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['a']);
});

test('sort price-asc orders by basePrice', () => {
  const state = { ...defaultExploreState, sort: 'price-asc' as const };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['b', 'c', 'a']);
});

test('toggleBucket adds then removes', () => {
  expect(toggleBucket(['1'], '2-3')).toEqual(['1', '2-3']);
  expect(toggleBucket(['1', '2-3'], '1')).toEqual(['2-3']);
});

test('initialExploreState presets the destination from route params', () => {
  expect(initialExploreState({ destination: 'Ha Long' })).toEqual({
    ...defaultExploreState,
    destination: 'Ha Long',
  });
  expect(initialExploreState({})).toEqual(defaultExploreState);
  expect(initialExploreState({ destination: ['A', 'B'] })).toEqual(defaultExploreState);
});

test('hasActiveFilters is false for default, true for any facet', () => {
  expect(hasActiveFilters(defaultExploreState)).toBe(false);
  expect(hasActiveFilters({ ...defaultExploreState, query: 'x' })).toBe(true);
  expect(hasActiveFilters({ ...defaultExploreState, destination: 'Hanoi' })).toBe(true);
  expect(hasActiveFilters({ ...defaultExploreState, durations: ['1'] })).toBe(true);
});
