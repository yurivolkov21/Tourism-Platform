import type { DestinationSummary } from '@tourism/core';
import type { TourCardData } from '../components/tours/tour-card';

/**
 * Web view-model for a destination: the eventual `@tourism/core` `DestinationSummary`
 * plus editorial extras that are not in the Prisma schema yet (`tagline`, cover `image`,
 * `intro`, `gallery`) and a summary `tours` list. `span` drives the home bento emphasis.
 *
 * Placeholder fixtures shaped like the future DTOs — temporary Unsplash imagery for design
 * review; swap for `MediaAsset`/`@tourism/core` data later (P3 #6).
 */
export type DestinationTileVM = DestinationSummary & {
  tagline: string;
  image: string;
  intro: string;
  gallery: string[];
  tours: TourCardData[];
  span?: string;
};

// Temporary Unsplash imagery (review only).
const img = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=70&auto=format&fit=crop`;

const tour = (
  slug: string,
  title: string,
  destination: string,
  durationDays: number,
  basePrice: number,
  rating: number,
  reviewCount: number,
  image: string,
  extras: Partial<TourCardData> = {},
): TourCardData => ({
  slug,
  title,
  destination,
  durationDays,
  basePrice,
  currency: 'USD',
  rating,
  reviewCount,
  badges: [],
  image,
  ...extras,
});

export const destinations: DestinationTileVM[] = [
  {
    slug: 'ha-long-bay',
    name: 'Hạ Long Bay',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'A UNESCO seascape of limestone karsts rising from emerald water.',
    tourCount: 8,
    tagline: 'Emerald waters, limestone giants',
    image: img('photo-1528127269322-539801943592'),
    intro:
      'Glide past thousands of karst islands on an overnight junk, kayak into hidden lagoons, and wake to mist over the bay. Our Hạ Long journeys pair the headline cruise with the quieter corners most itineraries miss.',
    gallery: [img('photo-1573790387438-4da905039392'), img('photo-1555921015-5532091f6026')],
    span: 'lg:col-span-2 lg:row-span-2',
    tours: [
      tour('ha-long-bay-2d1n', 'Hạ Long Bay Cruise — 2 Days 1 Night', 'Hạ Long Bay', 2, 320, 4.8, 124, img('photo-1528127269322-539801943592'), { compareAtPrice: 390, badges: ['BEST_VALUE'] }),
      tour('ha-long-lan-ha-3d2n', 'Hạ Long & Lan Hạ Bay — 3 Days 2 Nights', 'Hạ Long Bay', 3, 540, 4.9, 86, img('photo-1573790387438-4da905039392'), { badges: ['EXCLUSIVE'] }),
    ],
  },
  {
    slug: 'sa-pa',
    name: 'Sa Pa',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'Terraced highlands and hill-tribe trails in the far northwest.',
    tourCount: 6,
    tagline: 'Misty peaks & hill-tribe trails',
    image: img('photo-1573790387438-4da905039392'),
    intro:
      'Trek between rice terraces and Hmong and Dao villages, then ride the cable car to the roof of Indochina. Sa Pa rewards travellers who slow down for the mountain mornings.',
    gallery: [img('photo-1528127269322-539801943592'), img('photo-1583417319070-4a69db38a482')],
    tours: [
      tour('sa-pa-trek-2d1n', 'Sa Pa Valley Trek — 2 Days 1 Night', 'Sa Pa', 2, 210, 4.7, 64, img('photo-1573790387438-4da905039392'), { badges: ['POPULAR'] }),
    ],
  },
  {
    slug: 'hoi-an',
    name: 'Hội An',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'A lantern-lit trading port and UNESCO old town on the Thu Bồn river.',
    tourCount: 12,
    tagline: 'Lantern-lit riverside heritage',
    image: img('photo-1583417319070-4a69db38a482'),
    intro:
      'Wander a car-free old town of tailor shops and tea houses, cycle to the rice paddies, and float a lantern down the river at dusk. Hội An is the unhurried heart of central Vietnam.',
    gallery: [img('photo-1555921015-5532091f6026'), img('photo-1528181304800-259b08848526')],
    span: 'lg:col-span-2',
    tours: [
      tour('hoi-an-old-town-1d', 'Hội An Old Town & Lanterns — Day Tour', 'Hội An', 1, 95, 4.9, 210, img('photo-1583417319070-4a69db38a482'), { badges: ['POPULAR'] }),
      tour('hoi-an-my-son-2d1n', 'Hội An & Mỹ Sơn Sanctuary — 2 Days 1 Night', 'Hội An', 2, 260, 4.8, 98, img('photo-1555921015-5532091f6026')),
    ],
  },
  {
    slug: 'hue',
    name: 'Huế',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'The former imperial capital, its citadel and royal tombs on the Perfume river.',
    tourCount: 9,
    tagline: 'Imperial citadel & royal tombs',
    image: img('photo-1555921015-5532091f6026'),
    intro:
      'Step inside the walled citadel of the Nguyễn emperors, cruise the Perfume river to riverside tombs, and taste the refined imperial cuisine Huế is famous for.',
    gallery: [img('photo-1583417319070-4a69db38a482'), img('photo-1602002418816-5c0aeef426aa')],
    tours: [
      tour('hue-imperial-1d', 'Huế Imperial City & Tombs — Day Tour', 'Huế', 1, 110, 4.7, 73, img('photo-1555921015-5532091f6026')),
    ],
  },
  {
    slug: 'mekong-delta',
    name: 'Mekong Delta',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'A maze of rivers, floating markets, and orchards in the deep south.',
    tourCount: 7,
    tagline: 'Floating markets & river life',
    image: img('photo-1528181304800-259b08848526'),
    intro:
      'Drift through floating markets at dawn, sample tropical fruit straight from the orchard, and stay overnight in a riverside homestead. The delta runs at the pace of the water.',
    gallery: [img('photo-1602002418816-5c0aeef426aa'), img('photo-1528127269322-539801943592')],
    span: 'lg:col-span-2',
    tours: [
      tour('mekong-cai-rang-1d', 'Cái Răng Floating Market — Day Tour', 'Mekong Delta', 1, 85, 4.6, 142, img('photo-1528181304800-259b08848526'), { badges: ['BEST_VALUE'] }),
      tour('mekong-homestay-2d1n', 'Mekong Homestay — 2 Days 1 Night', 'Mekong Delta', 2, 180, 4.8, 67, img('photo-1602002418816-5c0aeef426aa')),
    ],
  },
  {
    slug: 'ho-chi-minh-city',
    name: 'Hồ Chí Minh City',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'The energetic southern metropolis of history, markets, and street food.',
    tourCount: 10,
    tagline: 'Energy, history & street food',
    image: img('photo-1602002418816-5c0aeef426aa'),
    intro:
      'Trace the city from the Củ Chi tunnels to the colonial centre, then eat your way through its night markets. Sài Gòn never quite slows down — and that is the point.',
    gallery: [img('photo-1528181304800-259b08848526'), img('photo-1583417319070-4a69db38a482')],
    span: 'lg:col-span-2',
    tours: [
      tour('hcmc-cu-chi-1d', 'Củ Chi Tunnels & City — Day Tour', 'Hồ Chí Minh City', 1, 75, 4.7, 188, img('photo-1602002418816-5c0aeef426aa'), { badges: ['POPULAR'] }),
    ],
  },
];

/** Cross-region traveller favourites for the overview "Most popular journeys" strip. */
export const popularTours: TourCardData[] = [
  tour('ha-long-bay-2d1n', 'Hạ Long Bay Cruise — 2 Days 1 Night', 'Hạ Long Bay', 2, 320, 4.8, 124, img('photo-1528127269322-539801943592'), { compareAtPrice: 390, badges: ['BEST_VALUE'] }),
  tour('hoi-an-old-town-1d', 'Hội An Old Town & Lanterns — Day Tour', 'Hội An', 1, 95, 4.9, 210, img('photo-1583417319070-4a69db38a482'), { badges: ['POPULAR'] }),
  tour('sa-pa-trek-2d1n', 'Sa Pa Valley Trek — 2 Days 1 Night', 'Sa Pa', 2, 210, 4.7, 64, img('photo-1573790387438-4da905039392')),
  tour('mekong-homestay-2d1n', 'Mekong Homestay — 2 Days 1 Night', 'Mekong Delta', 2, 180, 4.8, 67, img('photo-1602002418816-5c0aeef426aa'), { badges: ['EXCLUSIVE'] }),
];
