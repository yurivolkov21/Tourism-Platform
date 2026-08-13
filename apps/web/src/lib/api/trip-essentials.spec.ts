import type { components } from '@tourism/core';

import { toTripEssentials } from './trip-essentials';

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

describe('toTripEssentials', () => {
  it('picks the hero-role media item for the image', () => {
    const trip = toTripEssentials(
      makeDto({
        media: [
          {
            publicId: 'gallery-1',
            url: 'https://example.com/gallery.jpg',
            type: 'IMAGE',
            role: 'gallery',
            alt: 'Gallery shot',
          },
          {
            publicId: 'hero-1',
            url: 'https://example.com/hero.jpg',
            type: 'IMAGE',
            role: 'hero',
            alt: 'Hero shot',
          },
        ],
      }),
    );
    expect(trip.image).toBe('https://example.com/hero.jpg');
    expect(trip.imageAlt).toBe('Hero shot');
  });

  it('falls back to the first media item when there is no hero role', () => {
    const trip = toTripEssentials(
      makeDto({
        media: [
          {
            publicId: 'gallery-1',
            url: 'https://example.com/gallery.jpg',
            type: 'IMAGE',
            role: 'gallery',
            alt: 'Gallery shot',
          },
        ],
      }),
    );
    expect(trip.image).toBe('https://example.com/gallery.jpg');
  });

  it('leaves image undefined when there is no media at all', () => {
    const trip = toTripEssentials(makeDto({ media: [] }));
    expect(trip.image).toBeUndefined();
    expect(trip.imageAlt).toBeUndefined();
  });

  it('defaults highlights/included/excluded to [] when absent', () => {
    const trip = toTripEssentials(
      makeDto({
        highlights: undefined as unknown as string[],
        included: undefined as unknown as string[],
        excluded: undefined as unknown as string[],
      }),
    );
    expect(trip.highlights).toEqual([]);
    expect(trip.included).toEqual([]);
    expect(trip.excluded).toEqual([]);
  });

  it('passes highlights/included/excluded through when present', () => {
    const trip = toTripEssentials(
      makeDto({
        highlights: ['Lantern-lit old town'],
        included: ['Local guide', 'Lunch'],
        excluded: ['Tips'],
      }),
    );
    expect(trip.highlights).toEqual(['Lantern-lit old town']);
    expect(trip.included).toEqual(['Local guide', 'Lunch']);
    expect(trip.excluded).toEqual(['Tips']);
  });

  it('passes meetingPoint through, including null', () => {
    expect(
      toTripEssentials(makeDto({ meetingPoint: 'Meet at 78 Le Loi street' }))
        .meetingPoint,
    ).toBe('Meet at 78 Le Loi street');
    expect(toTripEssentials(makeDto({ meetingPoint: null })).meetingPoint).toBe(
      null,
    );
  });
});
