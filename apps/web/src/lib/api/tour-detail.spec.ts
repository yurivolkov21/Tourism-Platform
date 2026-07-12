import type { components } from '@tourism/core';

import { toTourDetail } from './tour-detail';

type TourDetailDto = components['schemas']['TourDetailDto'];

/** Minimal valid TourDetailDto fixture; overridable per test. */
function makeDto(overrides: Partial<TourDetailDto> = {}): TourDetailDto {
  return {
    id: 'tour-1',
    slug: 'hoi-an-walking-tour',
    title: 'Hoi An Ancient Town Walking Tour',
    summary: null,
    durationDays: 1,
    maxGroupSize: 20,
    basePrice: '49.50',
    compareAtPrice: null,
    currency: 'USD',
    difficulty: null,
    isPublished: true,
    isFeatured: false,
    highlights: [],
    suitableFor: [],
    badges: [],
    averageRating: 0,
    reviewsCount: 0,
    nextDepartureDate: null,
    nextDepartureSeatsLeft: null,
    category: { slug: 'day-tours', name: 'Day Tours' },
    destinations: [
      {
        isPrimary: true,
        destination: { slug: 'hoi-an', name: 'Hoi An' },
      },
    ],
    media: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    included: [],
    excluded: [],
    meetingPoint: null,
    itinerary: [],
    faqs: [],
    policies: [],
    ...overrides,
  };
}

describe('toTourDetail', () => {
  it('maps suitableFor through to the detail view-model', () => {
    const vm = toTourDetail(
      makeDto({ suitableFor: ['SOLO', 'BUSINESS'] }),
      [],
      [],
    );
    expect(vm.suitableFor).toEqual(['SOLO', 'BUSINESS']);
  });

  it('defaults suitableFor to [] when absent', () => {
    const vm = toTourDetail(
      makeDto({
        suitableFor: undefined as unknown as TourDetailDto['suitableFor'],
      }),
      [],
      [],
    );
    expect(vm.suitableFor).toEqual([]);
  });

  it('drops unknown traveller types a newer API might send', () => {
    const vm = toTourDetail(
      makeDto({
        suitableFor: [
          'SOLO',
          'GLAMPING',
        ] as unknown as TourDetailDto['suitableFor'],
      }),
      [],
      [],
    );
    expect(vm.suitableFor).toEqual(['SOLO']);
  });
});
