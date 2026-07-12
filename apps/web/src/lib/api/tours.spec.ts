import type { components } from '@tourism/core';

import { toTourCard } from './tours';

type TourSummaryDto = components['schemas']['TourSummaryDto'];

/** Minimal valid TourSummaryDto fixture; overridable per test. */
function makeDto(overrides: Partial<TourSummaryDto> = {}): TourSummaryDto {
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
    ...overrides,
  };
}

describe('toTourCard', () => {
  it('maps suitableFor through to the card view-model', () => {
    const card = toTourCard(makeDto({ suitableFor: ['FAMILY', 'COUPLE'] }));
    expect(card.suitableFor).toEqual(['FAMILY', 'COUPLE']);
  });

  it('defaults suitableFor to [] when absent', () => {
    const card = toTourCard(
      makeDto({
        suitableFor: undefined as unknown as TourSummaryDto['suitableFor'],
      }),
    );
    expect(card.suitableFor).toEqual([]);
  });

  it('drops unknown traveller types a newer API might send (no "undefined" labels)', () => {
    const card = toTourCard(
      makeDto({
        suitableFor: [
          'FAMILY',
          'GLAMPING',
        ] as unknown as TourSummaryDto['suitableFor'],
      }),
    );
    expect(card.suitableFor).toEqual(['FAMILY']);
  });
});
