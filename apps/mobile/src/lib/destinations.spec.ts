import type { components } from '@tourism/core';
import { toDestinationChipVm } from './destinations';

type DestinationDto = components['schemas']['DestinationDto'];

const base = {
  id: '1',
  slug: 'ha-long',
  name: 'Ha Long',
  country: 'Vietnam',
  region: 'Northern Vietnam',
  description: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  toursCount: 3,
  media: [
    { publicId: 'g', url: 'https://img.test/gallery.jpg', type: 'IMAGE', role: 'gallery' },
    { publicId: 'h', url: 'https://img.test/hero.jpg', type: 'IMAGE', role: 'hero' },
  ],
} as unknown as DestinationDto;

test('prefers the hero image', () => {
  expect(toDestinationChipVm(base)).toEqual({
    slug: 'ha-long',
    name: 'Ha Long',
    image: 'https://img.test/hero.jpg',
  });
});

test('falls back to the first media, then undefined', () => {
  const noHero = { ...base, media: [base.media[0]] };
  expect(toDestinationChipVm(noHero).image).toBe('https://img.test/gallery.jpg');
  expect(toDestinationChipVm({ ...base, media: [] }).image).toBeUndefined();
});
