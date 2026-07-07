import type { components } from '@tourism/core';
import { toSavedTourVm } from './wishlist';

type WishlistItemDto = components['schemas']['WishlistItemDto'];

const dto = {
  tourId: 'uuid-1',
  tour: {
    slug: 'ha-long-cruise',
    title: 'Ha Long Bay Cruise',
    basePrice: '450.00',
    currency: 'USD',
    media: [
      { publicId: 'g', url: 'https://img.test/g.jpg', type: 'IMAGE', role: 'gallery' },
      { publicId: 'h', url: 'https://img.test/h.jpg', type: 'IMAGE', role: 'hero' },
    ],
  },
} as unknown as WishlistItemDto;

test('maps the saved tour VM with the hero image', () => {
  expect(toSavedTourVm(dto)).toEqual({
    tourId: 'uuid-1',
    slug: 'ha-long-cruise',
    title: 'Ha Long Bay Cruise',
    image: 'https://img.test/h.jpg',
    basePrice: 450,
    currency: 'USD',
  });
});

test('falls back to the first media, then undefined', () => {
  const noHero = {
    ...dto,
    tour: { ...dto.tour, media: [dto.tour.media[0]] },
  } as unknown as WishlistItemDto;
  expect(toSavedTourVm(noHero).image).toBe('https://img.test/g.jpg');
  const noMedia = { ...dto, tour: { ...dto.tour, media: [] } } as unknown as WishlistItemDto;
  expect(toSavedTourVm(noMedia).image).toBeUndefined();
});
