import type { components } from '@tourism/core';
import { formatDepartureDate, toTourDetailVm } from './tour-detail';

type TourDetailDto = components['schemas']['TourDetailDto'];

const dto = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  summary: 'Two days among the karsts.',
  durationDays: 2,
  maxGroupSize: 16,
  basePrice: '450.00',
  compareAtPrice: '520.00',
  currency: 'USD',
  difficulty: 'easy',
  isPublished: true,
  isFeatured: true,
  highlights: ['Sunset kayaking'],
  suitableFor: ['FAMILY'],
  badges: ['POPULAR'],
  averageRating: 4.9,
  reviewsCount: 214,
  nextDepartureDate: '2026-08-15',
  nextDepartureSeatsLeft: 6,
  itinerary: [{ dayNumber: 1, title: 'Embark', description: 'Board at noon.' }],
  included: ['All meals'],
  excluded: ['Drinks'],
  faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
  policies: [{ kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' }],
  destinations: [{ isPrimary: true, destination: { slug: 'ha-long', name: 'Ha Long' } }],
  media: [
    { publicId: 'h', url: 'https://img.test/hero.jpg', type: 'IMAGE', role: 'hero' },
    { publicId: 'g', url: 'https://img.test/g1.jpg', type: 'IMAGE', role: 'gallery' },
  ],
} as unknown as TourDetailDto;

test('maps the full detail VM', () => {
  const vm = toTourDetailVm(dto);
  expect(vm).toMatchObject({
    id: 'uuid-1',
    slug: 'ha-long-cruise',
    destination: 'Ha Long',
    maxGroupSize: 16,
    difficulty: 'easy',
    basePrice: 450,
    compareAtPrice: 520,
    rating: 4.9,
    reviewCount: 214,
    nextDepartureDate: '15 Aug 2026',
    nextDepartureSeatsLeft: 6,
    overview: 'Two days among the karsts.',
    gallery: ['https://img.test/hero.jpg', 'https://img.test/g1.jpg'],
    highlights: ['Sunset kayaking'],
    itinerary: [{ day: 1, title: 'Embark', body: 'Board at noon.' }],
    included: ['All meals'],
    excluded: ['Drinks'],
    faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
    policies: [{ kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' }],
  });
});

test('nulls map to undefined / empty', () => {
  const vm = toTourDetailVm({
    ...dto,
    summary: null,
    difficulty: null,
    compareAtPrice: null,
    nextDepartureDate: null,
    nextDepartureSeatsLeft: null,
  } as unknown as TourDetailDto);
  expect(vm.overview).toBe('');
  expect(vm.difficulty).toBeUndefined();
  expect(vm.compareAtPrice).toBeUndefined();
  expect(vm.nextDepartureDate).toBeUndefined();
  expect(vm.nextDepartureSeatsLeft).toBeUndefined();
});

test('formatDepartureDate is graceful on garbage', () => {
  expect(formatDepartureDate('2026-08-15')).toBe('15 Aug 2026');
  expect(formatDepartureDate('not-a-date')).toBe('not-a-date');
});
