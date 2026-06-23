import type { DestinationSummary } from '@tourism/core';
import type { TourCardData } from '../components/tours/tour-card';

/**
 * Web view-model for a destination: the eventual `@tourism/core` `DestinationSummary`
 * plus editorial extras not in the Prisma schema yet (`tagline`, cover `image`, `intro`,
 * `gallery`) and a summary `tours` list. `span` drives the home bento emphasis.
 *
 * Placeholder fixtures shaped like the future DTOs — temporary Unsplash imagery for design
 * review (IDs are reused across tiles on purpose; swap for `MediaAsset` data later, P3 #6).
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

// Known-good photo IDs reused across placeholder tiles.
const P = {
  halong: 'photo-1528127269322-539801943592',
  terraces: 'photo-1573790387438-4da905039392',
  hoian: 'photo-1583417319070-4a69db38a482',
  temple: 'photo-1555921015-5532091f6026',
  river: 'photo-1528181304800-259b08848526',
  city: 'photo-1602002418816-5c0aeef426aa',
} as const;

// One-line listing summaries, keyed by tour slug (review-only copy; from the API later).
const TOUR_SUMMARIES: Record<string, string> = {
  'ha-long-bay-2d1n': 'Cruise the limestone karst of Hạ Long Bay with a night aboard a boutique junk.',
  'ha-long-lan-ha-3d2n': 'A slower cruise into the quieter Lan Hạ Bay — kayaks, caves and hidden lagoons.',
  'sa-pa-trek-2d1n': 'Trek between rice terraces and Hmong villages, with a homestay night in the hills.',
  'ninh-binh-day-trip': 'Row through the cave-pierced karst of Tam Cốc and climb to the Múa Cave view.',
  'ha-giang-loop-3d': 'Ride the legendary Hà Giang Loop past the Mã Pí Lèng pass and frontier villages.',
  'hoi-an-old-town-1d': 'Wander the lantern-lit old town, then float a lantern down the river at dusk.',
  'hoi-an-my-son-2d1n': 'Pair Hội An’s old town with the red-brick Chăm towers of the Mỹ Sơn sanctuary.',
  'hue-imperial-1d': 'Explore the walled citadel and royal tombs of the Nguyễn emperors in Huế.',
  'da-nang-ba-na-1d': 'Ride the cable car to the Golden Bridge and the Bà Nà hills above Đà Nẵng.',
  'phong-nha-paradise-1d': 'Boat into the river caves and trek to the vast chambers of Paradise Cave.',
  'hcmc-cu-chi-1d': 'Crawl the Củ Chi tunnels and trace Sài Gòn’s history through its colonial centre.',
  'mekong-cai-rang-1d': 'Drift through the Cái Răng floating market at dawn and the orchards beyond.',
  'mekong-homestay-2d1n': 'Slow down to the rhythm of the delta with a night in a riverside homestay.',
  'phu-quoc-islands-1d': 'Hop the An Thới islands by boat, snorkel the reefs, and end on a quiet beach.',
  'da-lat-highlands-1d': 'Escape to the pine-clad hills, waterfalls and coffee farms of Đà Lạt.',
};

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
  summary: TOUR_SUMMARIES[slug],
  ...extras,
});

/**
 * All destinations, ordered so the first of each region reads as the region's "feature"
 * (the overview mosaic renders index 0 as the labelled feature tile).
 */
export const destinations: DestinationTileVM[] = [
  // ── Northern Vietnam ──────────────────────────────────────────────────────
  {
    slug: 'ha-long-bay',
    name: 'Hạ Long Bay',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'A UNESCO seascape of limestone karsts rising from emerald water.',
    tourCount: 8,
    tagline: 'Emerald waters, limestone giants',
    image: img(P.halong),
    intro:
      'Glide past thousands of karst islands on an overnight junk, kayak into hidden lagoons, and wake to mist over the bay. Our Hạ Long journeys pair the headline cruise with the quieter corners most itineraries miss.',
    gallery: [img(P.terraces), img(P.temple)],
    span: 'lg:col-span-2 lg:row-span-2',
    tours: [
      tour('ha-long-bay-2d1n', 'Hạ Long Bay Cruise — 2 Days 1 Night', 'Hạ Long Bay', 2, 320, 4.8, 124, img(P.halong), { compareAtPrice: 390, badges: ['BEST_VALUE'], travelStyles: ['couples', 'luxury'], themes: ['cruise', 'nature'] }),
      tour('ha-long-lan-ha-3d2n', 'Hạ Long & Lan Hạ Bay — 3 Days 2 Nights', 'Hạ Long Bay', 3, 540, 4.9, 86, img(P.terraces), { badges: ['EXCLUSIVE'], travelStyles: ['couples', 'luxury', 'private'], themes: ['cruise', 'nature'] }),
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
    image: img(P.terraces),
    intro:
      'Trek between rice terraces and Hmong and Dao villages, then ride the cable car to the roof of Indochina. Sa Pa rewards travellers who slow down for the mountain mornings.',
    gallery: [img(P.halong), img(P.hoian)],
    span: 'lg:col-span-2',
    tours: [
      tour('sa-pa-trek-2d1n', 'Sa Pa Valley Trek — 2 Days 1 Night', 'Sa Pa', 2, 210, 4.7, 64, img(P.terraces), { badges: ['POPULAR'], travelStyles: ['adventure', 'group'], themes: ['trekking', 'nature', 'cultural'] }),
    ],
  },
  {
    slug: 'ninh-binh',
    name: 'Ninh Bình',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'Inland karsts, river caves, and rice fields — the “Hạ Long on land”.',
    tourCount: 5,
    tagline: 'Rivers winding through karst',
    image: img(P.river),
    intro:
      'Row a sampan through the cave-pierced karsts of Tam Cốc, cycle past temples and paddies, and climb to the Múa Cave viewpoint for the valley laid out below.',
    gallery: [img(P.river), img(P.terraces)],
    tours: [
      tour('ninh-binh-day-trip', 'Ninh Bình Day Trip — Tam Cốc & Múa Cave', 'Ninh Bình', 1, 90, 4.7, 158, img(P.river), { badges: ['POPULAR'], travelStyles: ['family', 'group'], themes: ['nature', 'cultural'] }),
    ],
  },
  {
    slug: 'ha-giang',
    name: 'Hà Giang',
    country: 'Vietnam',
    region: 'Northern Vietnam',
    description: 'Vietnam’s wild northern frontier of switchback passes and stone plateaus.',
    tourCount: 4,
    tagline: 'The legendary loop',
    image: img(P.terraces),
    intro:
      'Ride the Hà Giang Loop past the Mã Pí Lèng pass and the Đồng Văn karst plateau, staying with ethnic-minority families along one of Asia’s great road journeys.',
    gallery: [img(P.terraces), img(P.halong)],
    tours: [
      tour('ha-giang-loop-3d', 'Hà Giang Loop — 3 Day Adventure', 'Hà Giang', 3, 295, 4.9, 71, img(P.terraces), { badges: ['EXCLUSIVE'], travelStyles: ['adventure', 'group'], themes: ['trekking', 'nature', 'cultural'] }),
    ],
  },
  // ── Central Vietnam ───────────────────────────────────────────────────────
  {
    slug: 'hoi-an',
    name: 'Hội An',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'A lantern-lit trading port and UNESCO old town on the Thu Bồn river.',
    tourCount: 12,
    tagline: 'Lantern-lit riverside heritage',
    image: img(P.hoian),
    intro:
      'Wander a car-free old town of tailor shops and tea houses, cycle to the rice paddies, and float a lantern down the river at dusk. Hội An is the unhurried heart of central Vietnam.',
    gallery: [img(P.temple), img(P.river)],
    tours: [
      tour('hoi-an-old-town-1d', 'Hội An Old Town & Lanterns — Day Tour', 'Hội An', 1, 95, 4.9, 210, img(P.hoian), { badges: ['POPULAR'], travelStyles: ['family', 'couples'], themes: ['cultural', 'culinary'] }),
      tour('hoi-an-my-son-2d1n', 'Hội An & Mỹ Sơn Sanctuary — 2 Days 1 Night', 'Hội An', 2, 260, 4.8, 98, img(P.temple), { travelStyles: ['couples', 'group'], themes: ['cultural'] }),
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
    image: img(P.temple),
    intro:
      'Step inside the walled citadel of the Nguyễn emperors, cruise the Perfume river to riverside tombs, and taste the refined imperial cuisine Huế is famous for.',
    gallery: [img(P.hoian), img(P.city)],
    tours: [
      tour('hue-imperial-1d', 'Huế Imperial City & Tombs — Day Tour', 'Huế', 1, 110, 4.7, 73, img(P.temple), { travelStyles: ['family', 'group'], themes: ['cultural'] }),
    ],
  },
  {
    slug: 'da-nang',
    name: 'Đà Nẵng',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'A beach city of golden sands, the Marble Mountains, and the Bà Nà hills.',
    tourCount: 7,
    tagline: 'Coastline & golden bridge',
    image: img(P.city),
    intro:
      'Base yourself on My Khe beach, ride the cable car to the Golden Bridge in the Bà Nà hills, and explore the caves and shrines of the Marble Mountains.',
    gallery: [img(P.city), img(P.hoian)],
    tours: [
      tour('da-nang-ba-na-1d', 'Đà Nẵng & Bà Nà Hills — Day Tour', 'Đà Nẵng', 1, 120, 4.6, 132, img(P.city), { badges: ['POPULAR'], travelStyles: ['family', 'couples'], themes: ['beach', 'nature'] }),
    ],
  },
  {
    slug: 'phong-nha',
    name: 'Phong Nha',
    country: 'Vietnam',
    region: 'Central Vietnam',
    description: 'A national park hiding some of the largest caves on earth.',
    tourCount: 4,
    tagline: 'Into the great caves',
    image: img(P.halong),
    intro:
      'Boat into the river caves of Phong Nha and trek through jungle to the cathedral-sized chambers of Paradise Cave — a different, subterranean Vietnam.',
    gallery: [img(P.halong), img(P.terraces)],
    tours: [
      tour('phong-nha-paradise-1d', 'Phong Nha & Paradise Cave — Day Tour', 'Phong Nha', 1, 135, 4.8, 54, img(P.halong), { travelStyles: ['adventure', 'group'], themes: ['nature', 'trekking'] }),
    ],
  },
  // ── Southern Vietnam ──────────────────────────────────────────────────────
  {
    slug: 'ho-chi-minh-city',
    name: 'Hồ Chí Minh City',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'The energetic southern metropolis of history, markets, and street food.',
    tourCount: 10,
    tagline: 'Energy, history & street food',
    image: img(P.city),
    intro:
      'Trace the city from the Củ Chi tunnels to the colonial centre, then eat your way through its night markets. Sài Gòn never quite slows down — and that is the point.',
    gallery: [img(P.river), img(P.hoian)],
    span: 'lg:col-span-2',
    tours: [
      tour('hcmc-cu-chi-1d', 'Củ Chi Tunnels & City — Day Tour', 'Hồ Chí Minh City', 1, 75, 4.7, 188, img(P.city), { badges: ['POPULAR'], travelStyles: ['group', 'family'], themes: ['cultural'] }),
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
    image: img(P.river),
    intro:
      'Drift through floating markets at dawn, sample tropical fruit straight from the orchard, and stay overnight in a riverside homestead. The delta runs at the pace of the water.',
    gallery: [img(P.city), img(P.halong)],
    span: 'lg:col-span-2',
    tours: [
      tour('mekong-cai-rang-1d', 'Cái Răng Floating Market — Day Tour', 'Mekong Delta', 1, 85, 4.6, 142, img(P.river), { badges: ['BEST_VALUE'], travelStyles: ['family', 'group'], themes: ['cultural', 'culinary', 'nature'] }),
      tour('mekong-homestay-2d1n', 'Mekong Homestay — 2 Days 1 Night', 'Mekong Delta', 2, 180, 4.8, 67, img(P.city), { travelStyles: ['family', 'couples'], themes: ['cultural', 'nature'] }),
    ],
  },
  {
    slug: 'phu-quoc',
    name: 'Phú Quốc',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'Vietnam’s largest island — white-sand beaches and clear southern seas.',
    tourCount: 5,
    tagline: 'Island beaches & sunsets',
    image: img(P.hoian),
    intro:
      'Slow down on the island’s long beaches, snorkel the An Thới archipelago, and end the day with a sunset over the Gulf of Thailand.',
    gallery: [img(P.hoian), img(P.river)],
    tours: [
      tour('phu-quoc-islands-1d', 'Phú Quốc Island Hopping — Day Tour', 'Phú Quốc', 1, 99, 4.7, 96, img(P.hoian), { badges: ['POPULAR'], travelStyles: ['couples', 'family', 'luxury'], themes: ['beach', 'nature'] }),
    ],
  },
  {
    slug: 'da-lat',
    name: 'Đà Lạt',
    country: 'Vietnam',
    region: 'Southern Vietnam',
    description: 'A cool-climate highland retreat of pine forests, lakes, and flower farms.',
    tourCount: 4,
    tagline: 'Highland pines & flowers',
    image: img(P.terraces),
    intro:
      'Escape the heat in the pine-clad hills of Đà Lạt — waterfalls, coffee farms, and flower gardens in Vietnam’s temperate highland town.',
    gallery: [img(P.terraces), img(P.temple)],
    tours: [
      tour('da-lat-highlands-1d', 'Đà Lạt Highlands & Waterfalls — Day Tour', 'Đà Lạt', 1, 80, 4.6, 61, img(P.terraces), { travelStyles: ['couples', 'family'], themes: ['nature'] }),
    ],
  },
];

/** Slugs featured in the home bento teaser (the original curated six). */
const HOME_SLUGS = new Set([
  'ha-long-bay',
  'sa-pa',
  'hoi-an',
  'hue',
  'mekong-delta',
  'ho-chi-minh-city',
]);

/** Curated subset for the home teaser bento (keeps the home section at six tiles). */
export const homeDestinations: DestinationTileVM[] = destinations.filter((d) =>
  HOME_SLUGS.has(d.slug),
);

/** Cross-region traveller favourites for the overview "Most popular journeys" strip. */
export const popularTours: TourCardData[] = [
  tour('ha-long-bay-2d1n', 'Hạ Long Bay Cruise — 2 Days 1 Night', 'Hạ Long Bay', 2, 320, 4.8, 124, img(P.halong), { compareAtPrice: 390, badges: ['BEST_VALUE'] }),
  tour('hoi-an-old-town-1d', 'Hội An Old Town & Lanterns — Day Tour', 'Hội An', 1, 95, 4.9, 210, img(P.hoian), { badges: ['POPULAR'] }),
  tour('ninh-binh-day-trip', 'Ninh Bình Day Trip — Tam Cốc & Múa Cave', 'Ninh Bình', 1, 90, 4.7, 158, img(P.river)),
  tour('mekong-homestay-2d1n', 'Mekong Homestay — 2 Days 1 Night', 'Mekong Delta', 2, 180, 4.8, 67, img(P.city), { badges: ['EXCLUSIVE'] }),
];
