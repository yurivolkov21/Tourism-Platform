/**
 * Database seed — populates Supabase Postgres with a rich, realistic Vietnam
 * catalog + test accounts for local dev, the e2e suite, and demo screenshots.
 *
 * Catalog is modelled on real tours from Lily's Travel Agency
 * (lilystravelagency.com) — TEXT only (titles, itineraries, inclusions,
 * cancellation policy). Imagery stays as neutral Unsplash placeholders (Lily's
 * photos are copyrighted); the API passes absolute http(s) `publicId`s through
 * unchanged (see `lib/cloudinary-url.ts`). Admin-uploaded Cloudinary media
 * replaces these in prod.
 *
 * OUR-schema specifics (P1.8a):
 *  - EN-only (ADR-0005): single `name`/`title`/`summary` columns (no `*_vi`).
 *  - TourCategory is a LOOKUP TABLE (D-P1.5), seeded first, referenced by id.
 *  - Tour↔Destination is M:N (ADR-0002) via `TourDestination` (`isPrimary`).
 *  - Gateways are Stripe + PayPal (ADR-0006).
 *  - `region` MUST be one of `@tourism/core` REGION_ORDER's Title-Case strings
 *    ('Northern Vietnam' | 'Central Vietnam' | 'Southern Vietnam') — the web
 *    overview groups destinations by that exact value, and `slugify(region)`
 *    drives the per-region page slug.
 *  - Seeds USERS (customer + admin) + a SELF-SIGNED PAID booking on
 *    `hoi-an-walking-tour` so the review flow + e2e run without a live payment.
 *  - Seeds a pool of reviewer users + APPROVED reviews (each backed by its own
 *    PAID booking, since `Review.bookingId` is a unique FK) so wired tour cards
 *    show real `averageRating` / `reviewsCount`.
 *
 * Idempotency: upsert by `slug` (categories/destinations/tours) and `email`
 * (users); a tour's M:N links / itinerary / FAQs / policies are reset+recreated;
 * departures are reset+recreated only for tours WITHOUT bookings (FK is Restrict);
 * the PAID booking + each review booking are created once (skipped if their
 * `code` already exists) and review bookings DO NOT claim seats.
 *
 * Run:  pnpm nx run @tourism/api:seed   (or: cd apps/api && pnpm prisma db seed)
 * Targets DIRECT_URL (Supabase direct 5432), matching the migration engine.
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingStatus,
  DepartureStatus,
  MediaOwnerType,
  MediaType,
  PaymentProvider,
  PolicyKind,
  PostStatus,
  PrismaClient,
  TourBadge,
  TravellerType,
  UserRole,
} from '@prisma/client';

// Neutral Unsplash placeholders (Lily's own photos are copyrighted). Absolute
// URLs flow through the API unchanged (lib/cloudinary-url.ts). Reused across
// rows on purpose — swap for admin-uploaded Cloudinary media in prod.
const img = (id: string): string =>
  `https://images.unsplash.com/${id}?w=1600&q=72&auto=format&fit=crop`;

const PHOTO = {
  halong: 'photo-1528127269322-539801943592',
  terraces: 'photo-1573790387438-4da905039392',
  hoian: 'photo-1583417319070-4a69db38a482',
  temple: 'photo-1555921015-5532091f6026',
  river: 'photo-1528181304800-259b08848526',
  city: 'photo-1602002418816-5c0aeef426aa',
  mountains: 'photo-1559592413-7cec4d0cae2b',
  beach: 'photo-1540998145333-e2eef1a9822d',
  street: 'photo-1518181835702-6eef8b4b2113',
  rice: 'photo-1465056836041-7f43ac27dcb5',
  forest: 'photo-1473625247510-8ceb1760943f',
  lantern: 'photo-1476514525535-07fb3b4ae5f1',
  cave: 'photo-1518509562904-e7ef99cdcc86',
  market: 'photo-1504457047772-27faf1c00561',
  food: 'photo-1535139262971-c51845709a48',
  boat: 'photo-1528909514045-2fa4ac7a08ba',
  island: 'photo-1593693397690-362cb9666fc2',
} as const;

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error(
    '[seed] missing DIRECT_URL (preferred) or DATABASE_URL in environment',
  );
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ────────────────────────────────────────────────────────────────────────────
// Categories
// ────────────────────────────────────────────────────────────────────────────

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  order: number;
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'day', name: 'Day Tours', description: 'Single-day experiences and excursions', order: 1 },
  { slug: 'package', name: 'Multi-day Packages', description: 'Multi-day journeys with overnight stays', order: 2 },
  { slug: 'cruise', name: 'Cruises', description: 'Overnight bay and river cruises', order: 3 },
  { slug: 'trekking', name: 'Trekking & Adventure', description: 'Mountain treks and active adventures', order: 4 },
  { slug: 'honeymoon', name: 'Honeymoon', description: 'Romantic getaways for couples', order: 5 },
];

// ────────────────────────────────────────────────────────────────────────────
// Destinations — region MUST match @tourism/core REGION_ORDER (Title Case).
// ────────────────────────────────────────────────────────────────────────────

interface DestinationSeed {
  slug: string;
  name: string;
  region: 'Northern Vietnam' | 'Central Vietnam' | 'Southern Vietnam';
  photo: string;
  description: string;
}

const DESTINATIONS: DestinationSeed[] = [
  // ── Northern Vietnam ──
  { slug: 'hanoi', name: 'Hanoi', region: 'Northern Vietnam', photo: PHOTO.street, description: 'A thousand-year-old capital where French colonial boulevards meet motorbike-filled Old Quarter alleys, lakeside temples, and legendary street food.' },
  { slug: 'ha-long-bay', name: 'Ha Long Bay', region: 'Northern Vietnam', photo: PHOTO.halong, description: 'A UNESCO seascape of thousands of limestone karsts rising from emerald water — best explored by overnight cruise, kayak, and hidden lagoon.' },
  { slug: 'ninh-binh', name: 'Ninh Binh', region: 'Northern Vietnam', photo: PHOTO.river, description: 'The "Halong Bay on land": bamboo boats threading cave-pierced karst at Tam Coc and Trang An, the ancient capital of Hoa Lu, and the Mua Cave viewpoint.' },
  { slug: 'sa-pa', name: 'Sa Pa', region: 'Northern Vietnam', photo: PHOTO.terraces, description: 'Misty mountain town overlooking emerald rice terraces, home to Hmong, Dao and Tay villages and Fansipan, Indochina’s highest peak.' },
  { slug: 'ha-giang', name: 'Ha Giang', region: 'Northern Vietnam', photo: PHOTO.mountains, description: 'Vietnam’s wild northern frontier — the legendary Ha Giang Loop winds past the Ma Pi Leng pass, limestone plateaus, and remote ethnic-minority hamlets.' },
  // ── Central Vietnam ──
  { slug: 'da-nang', name: 'Da Nang', region: 'Central Vietnam', photo: PHOTO.city, description: 'A breezy coastal city of long beaches and river bridges, gateway to the Marble Mountains and the Golden Bridge at Ba Na Hills.' },
  { slug: 'hoi-an', name: 'Hoi An', region: 'Central Vietnam', photo: PHOTO.hoian, description: 'UNESCO-listed Ancient Town glowing with silk lanterns, riverside cafes, centuries-old merchant houses, tailors, and a famous cooking scene.' },
  { slug: 'hue', name: 'Hue', region: 'Central Vietnam', photo: PHOTO.temple, description: 'The imperial capital of the Nguyen dynasty: a walled Citadel, royal tombs along the Perfume River, and the Thien Mu Pagoda.' },
  { slug: 'phong-nha', name: 'Phong Nha', region: 'Central Vietnam', photo: PHOTO.cave, description: 'A UNESCO karst national park hiding some of the world’s grandest caves — river-boat grottoes, Paradise Cave, and jungle kayaking.' },
  // ── Southern Vietnam ──
  { slug: 'ho-chi-minh-city', name: 'Ho Chi Minh City', region: 'Southern Vietnam', photo: PHOTO.city, description: 'The energetic south’s commercial heart (Saigon): colonial landmarks, war history, rooftop bars, and the Cu Chi tunnel network on its doorstep.' },
  { slug: 'mekong-delta', name: 'Mekong Delta', region: 'Southern Vietnam', photo: PHOTO.boat, description: 'A watery maze of rivers, orchards and floating markets where life moves by sampan — best seen at dawn on the Cai Rang market.' },
  { slug: 'phu-quoc', name: 'Phu Quoc', region: 'Southern Vietnam', photo: PHOTO.beach, description: 'Vietnam’s largest island: white-sand beaches, pepper farms, an island cable car, and the clearest snorkelling waters in the An Thoi archipelago.' },
  { slug: 'mui-ne', name: 'Mui Ne', region: 'Southern Vietnam', photo: PHOTO.island, description: 'A laid-back fishing-village resort town famous for its red and white sand dunes, kite-surfing, and the Fairy Stream.' },
];

// ────────────────────────────────────────────────────────────────────────────
// Tours — modelled on real Lily catalogue (text only).
// ────────────────────────────────────────────────────────────────────────────

interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
}
interface FaqSeed {
  question: string;
  answer: string;
}
interface PolicySeed {
  kind: PolicyKind;
  title: string;
  body: string;
}

interface TourSeed {
  slug: string;
  /** First entry is the primary destination (shown on the card). */
  destinationSlugs: string[];
  categorySlug: string;
  title: string;
  summary: string;
  durationDays: number;
  maxGroupSize: number;
  basePrice: number;
  compareAtPrice?: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  isPublished: boolean;
  isFeatured: boolean;
  photo: string;
  gallery: [string, string];
  suitableFor: TravellerType[];
  badges: TourBadge[];
  highlights: string[];
  included: string[];
  excluded: string[];
  meetingPoint: string;
  itinerary?: ItineraryDay[];
  faqs?: FaqSeed[];
  policies?: PolicySeed[];
}

/** Standard cancellation policy text Lily publishes on its multi-day packages. */
const CANCELLATION_POLICY: PolicySeed = {
  kind: PolicyKind.CANCELLATION,
  title: 'Cancellation policy',
  body:
    'A 30% deposit is required to confirm your booking; the balance is due on the tour start date. Cancellations 15+ days before departure forfeit the 50% of the deposit; 7–15 days before forfeit 75%; within 7 days forfeit 100%. Date changes are subject to availability.',
};
const DEPOSIT_POLICY: PolicySeed = {
  kind: PolicyKind.BOOKING,
  title: 'Deposit & payment',
  body:
    'Secure your seats with a 30% deposit by card (Stripe) or PayPal. You will receive a confirmation email with your booking code and a full day-by-day plan. The remaining balance can be settled before the tour begins.',
};

const TOURS: TourSeed[] = [
  // ── Day tours ───────────────────────────────────────────────────────────
  {
    slug: 'hoi-an-walking-tour',
    destinationSlugs: ['hoi-an'],
    categorySlug: 'day',
    title: 'Hoi An Ancient Town Walking Tour',
    summary:
      'A guided half-day stroll through the lantern-lit UNESCO old town, ending with a paper lantern floated down the Thu Bon river at dusk.',
    durationDays: 1,
    maxGroupSize: 12,
    basePrice: 39,
    compareAtPrice: 49,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.hoian,
    gallery: [PHOTO.lantern, PHOTO.street],
    suitableFor: [TravellerType.COUPLE, TravellerType.FAMILY, TravellerType.SOLO],
    badges: [TourBadge.POPULAR],
    highlights: [
      'Wander the 200-year-old merchant houses and the Japanese Covered Bridge',
      'Watch silk lanterns light up the old town at dusk',
      'Float your own paper lantern on the Thu Bon river',
      'Taste Hoi An specialities: cao lau and white rose dumplings',
    ],
    included: ['Local English-speaking guide', 'Heritage-site entrance tickets', 'Paper lantern', 'Bottled water'],
    excluded: ['Lunch', 'Personal expenses', 'Tips'],
    meetingPoint: 'Hoi An tourist information centre, 78 Le Loi street',
    faqs: [
      { question: 'What should I wear?', answer: 'Comfortable walking shoes and light clothing. The old town is pedestrian-only, so expect plenty of gentle walking on flat streets.' },
      { question: 'Is this tour suitable for children?', answer: 'Yes — the pace is relaxed and the lantern release is a favourite with kids. Strollers are manageable on most streets.' },
    ],
  },
  {
    slug: 'ba-na-hills-day',
    destinationSlugs: ['da-nang'],
    categorySlug: 'day',
    title: 'Ba Na Hills & Golden Bridge Day Trip',
    summary:
      'Ride the record-breaking cable car to the Golden Bridge, the French Village and Fantasy Park, high in the cool hills above Da Nang.',
    durationDays: 1,
    maxGroupSize: 18,
    basePrice: 79,
    compareAtPrice: 95,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.mountains,
    gallery: [PHOTO.temple, PHOTO.city],
    suitableFor: [TravellerType.FAMILY, TravellerType.COUPLE, TravellerType.FRIENDS],
    badges: [TourBadge.POPULAR, TourBadge.BEST_VALUE],
    highlights: [
      'The iconic Golden Bridge, held aloft by two giant stone hands',
      'A record-breaking cable car ride into the "green lung" of Central Vietnam',
      'Le Jardin, the Debay Wine Cellar and the Linh Ung pagoda',
      'Indoor Fantasy Park games and a buffet lunch with mountain views',
    ],
    included: ['Hotel pickup & drop-off in Da Nang', 'Cable car tickets', 'Fantasy Park entrance', 'Buffet lunch', 'English-speaking guide', 'Insurance'],
    excluded: ['Drinks during meals', 'Wax museum & wine tasting', 'Personal expenses'],
    meetingPoint: 'Hotel pickup in Da Nang (7:00–8:00 AM)',
    faqs: [
      { question: 'How cold is it at the top?', answer: 'Ba Na Hills sits at ~1,487 m and is markedly cooler than the coast — bring a light jacket even in summer.' },
    ],
  },
  {
    slug: 'hue-imperial-day',
    destinationSlugs: ['hue'],
    categorySlug: 'day',
    title: 'Hue Imperial City Full-Day Tour',
    summary:
      'Explore the walled Citadel, the royal tombs of the Nguyen emperors and the Thien Mu Pagoda, with a relaxed dragon-boat ride on the Perfume River.',
    durationDays: 1,
    maxGroupSize: 16,
    basePrice: 55,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.temple,
    gallery: [PHOTO.river, PHOTO.street],
    suitableFor: [TravellerType.COUPLE, TravellerType.SOLO, TravellerType.FAMILY],
    badges: [],
    highlights: [
      'The Imperial Citadel and the Forbidden Purple City',
      'Royal tombs of Tu Duc and Khai Dinh',
      'A dragon-boat ride to the seven-tiered Thien Mu Pagoda',
    ],
    included: ['English-speaking guide', 'Monument entrance fees', 'Dragon-boat ride', 'Lunch', 'Bottled water'],
    excluded: ['Drinks', 'Personal expenses', 'Tips'],
    meetingPoint: 'Hotel pickup in central Hue',
  },
  {
    slug: 'ninh-binh-day',
    destinationSlugs: ['ninh-binh'],
    categorySlug: 'day',
    title: 'Ninh Binh: Hoa Lu, Tam Coc & Mua Cave',
    summary:
      'A full day in the "Halong Bay on land": the ancient capital of Hoa Lu, a bamboo-boat ride through the Tam Coc caves, and the 500-step climb to Mua Cave.',
    durationDays: 1,
    maxGroupSize: 20,
    basePrice: 49,
    compareAtPrice: 59,
    difficulty: 'moderate',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.river,
    gallery: [PHOTO.rice, PHOTO.mountains],
    suitableFor: [TravellerType.FRIENDS, TravellerType.COUPLE, TravellerType.SOLO],
    badges: [TourBadge.BEST_VALUE],
    highlights: [
      'The 10th-century temples of the Hoa Lu ancient capital',
      'A 1.5-hour bamboo boat ride through the Tam Coc limestone caves',
      'The 500-step climb to the Mua Cave panorama over the rice valley',
      'Cycling through quiet rice-field villages',
    ],
    included: ['Round-trip transfer from Hanoi', 'English-speaking guide', 'Bamboo boat ride', 'Buffet lunch', 'Bicycle hire', 'Entrance fees'],
    excluded: ['Drinks', 'Boat-rower tips', 'Personal expenses'],
    meetingPoint: 'Hanoi Old Quarter hotel pickup',
  },
  {
    slug: 'cu-chi-tunnels-half-day',
    destinationSlugs: ['ho-chi-minh-city'],
    categorySlug: 'day',
    title: 'Cu Chi Tunnels Half-Day Tour',
    summary:
      'Crawl a section of the legendary Cu Chi tunnel network and learn how an underground city sustained life during the war, just outside Saigon.',
    durationDays: 1,
    maxGroupSize: 20,
    basePrice: 29,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.forest,
    gallery: [PHOTO.city, PHOTO.street],
    suitableFor: [TravellerType.SOLO, TravellerType.FRIENDS, TravellerType.FAMILY],
    badges: [],
    highlights: [
      'Explore and crawl through a widened section of the tunnels',
      'See the ingenious trap, kitchen and ventilation systems',
      'A guide who brings the history vividly to life',
    ],
    included: ['Round-trip transfer from Ho Chi Minh City', 'English-speaking guide', 'Tunnel entrance fee', 'Bottled water'],
    excluded: ['Lunch', 'Shooting range', 'Tips'],
    meetingPoint: 'District 1 hotel pickup, Ho Chi Minh City',
  },
  {
    slug: 'mekong-delta-day',
    destinationSlugs: ['mekong-delta'],
    categorySlug: 'day',
    title: 'Mekong Delta & Cai Rang Floating Market',
    summary:
      'Drift through the Cai Rang floating market at dawn, then slip into the narrow orchard channels by sampan for a taste of life on the river.',
    durationDays: 1,
    maxGroupSize: 16,
    basePrice: 45,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.boat,
    gallery: [PHOTO.market, PHOTO.river],
    suitableFor: [TravellerType.FAMILY, TravellerType.COUPLE, TravellerType.SOLO],
    badges: [],
    highlights: [
      'The bustling Cai Rang floating market at first light',
      'A sampan ride into the quieter orchard channels the big tours miss',
      'Tropical fruit, a rice-noodle workshop and a riverside lunch',
    ],
    included: ['Transfer from Ho Chi Minh City', 'English-speaking guide', 'Boat trips', 'Lunch', 'Seasonal fruit tasting'],
    excluded: ['Drinks', 'Personal expenses', 'Tips'],
    meetingPoint: 'District 1 hotel pickup, Ho Chi Minh City (early start)',
  },
  {
    slug: 'phu-quoc-4-islands',
    destinationSlugs: ['phu-quoc'],
    categorySlug: 'day',
    title: 'Phu Quoc 4-Islands Snorkelling Cruise',
    summary:
      'A full-day speedboat hop around the An Thoi archipelago with two snorkel stops over coral reefs and a fresh seafood lunch on board.',
    durationDays: 1,
    maxGroupSize: 18,
    basePrice: 52,
    compareAtPrice: 65,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.island,
    gallery: [PHOTO.beach, PHOTO.halong],
    suitableFor: [TravellerType.FRIENDS, TravellerType.COUPLE, TravellerType.FAMILY],
    badges: [TourBadge.POPULAR],
    highlights: [
      'Snorkel two coral reefs in the clearest water in Vietnam',
      'Island-hop the An Thoi archipelago by speedboat',
      'A fresh seafood BBQ lunch on the water',
      'Optional ride on the world’s longest sea-crossing cable car',
    ],
    included: ['Speedboat cruise', 'Snorkel gear', 'Seafood lunch', 'English-speaking guide', 'Insurance'],
    excluded: ['Cable car ticket', 'Drinks', 'Fishing gear hire'],
    meetingPoint: 'An Thoi harbour, Phu Quoc',
  },
  {
    slug: 'phong-nha-paradise-cave-day',
    destinationSlugs: ['phong-nha'],
    categorySlug: 'day',
    title: 'Phong Nha & Paradise Cave Full-Day',
    summary:
      'Boat into the river-cut Phong Nha grotto, then walk the vast illuminated chambers of Paradise Cave, one of the longest dry caves in Asia.',
    durationDays: 1,
    maxGroupSize: 16,
    basePrice: 62,
    difficulty: 'moderate',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.cave,
    gallery: [PHOTO.forest, PHOTO.river],
    suitableFor: [TravellerType.FRIENDS, TravellerType.SOLO, TravellerType.COUPLE],
    badges: [],
    highlights: [
      'A river-boat ride into the Phong Nha cave system',
      'The cathedral-scale chambers of Paradise Cave',
      'Lush limestone-karst scenery of a UNESCO national park',
    ],
    included: ['Transfer from Dong Hoi / Phong Nha town', 'English-speaking guide', 'Boat ride', 'Cave entrance fees', 'Lunch'],
    excluded: ['Drinks', 'Personal expenses', 'Tips'],
    meetingPoint: 'Phong Nha town centre / Dong Hoi hotel pickup',
  },
  {
    slug: 'hanoi-street-food-walk',
    destinationSlugs: ['hanoi'],
    categorySlug: 'day',
    title: 'Hanoi Old Quarter Street Food Walk',
    summary:
      'Graze your way through the Old Quarter with a local foodie guide — pho, bun cha, banh mi and egg coffee across eight hand-picked stops.',
    durationDays: 1,
    maxGroupSize: 10,
    basePrice: 35,
    difficulty: 'easy',
    // Draft on purpose so public-catalogue filters can be tested — MUST NOT
    // appear in GET /tours but MUST appear in /admin/tours.
    isPublished: false,
    isFeatured: false,
    photo: PHOTO.food,
    gallery: [PHOTO.street, PHOTO.market],
    suitableFor: [TravellerType.SOLO, TravellerType.FRIENDS, TravellerType.COUPLE],
    badges: [TourBadge.NEW],
    highlights: [
      'Eight tastings across the maze of the Old Quarter',
      'Hanoi classics: pho, bun cha, nem and banh mi',
      'Finish with the city’s famous egg coffee',
    ],
    included: ['All food tastings', 'Egg coffee', 'Local foodie guide', 'Bottled water'],
    excluded: ['Alcoholic drinks', 'Tips'],
    meetingPoint: 'Hang Be market entrance, Hanoi Old Quarter',
  },

  // ── Cruises ───────────────────────────────────────────────────────────────
  {
    slug: 'halong-bay-2d1n',
    destinationSlugs: ['ha-long-bay', 'hanoi'],
    categorySlug: 'cruise',
    title: 'Ha Long Bay Luxury Cruise 2D1N',
    summary:
      'An overnight cruise among the karsts of Ha Long Bay — kayaking, a cave visit, a sunset party and a night aboard a boutique junk.',
    durationDays: 2,
    maxGroupSize: 24,
    basePrice: 175,
    compareAtPrice: 210,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.halong,
    gallery: [PHOTO.boat, PHOTO.beach],
    suitableFor: [TravellerType.COUPLE, TravellerType.FAMILY, TravellerType.FRIENDS],
    badges: [TourBadge.POPULAR],
    highlights: [
      'A night aboard a boutique junk among the limestone karsts',
      'Kayaking and swimming from Titov Island',
      'The vast Sung Sot ("Surprise") cave',
      'A sunset party, cooking demo and squid fishing',
    ],
    included: ['Round-trip transfer from Hanoi', 'One night aboard the cruise', 'All meals on board (1B, 2L, 1D)', 'Kayak & cave entrance', 'English-speaking guide'],
    excluded: ['Drinks', 'Tips', 'Travel insurance'],
    meetingPoint: 'Hanoi Old Quarter hotel pickup',
    itinerary: [
      { dayNumber: 1, title: 'Hanoi → Ha Long Bay & sunset cruise', description: 'Morning transfer from Hanoi to the wharf and board your cruise. Sail out among the karsts over lunch, visit a pearl farm, then stop at Titov Island for swimming and a short hike to the viewpoint. Back on board, enjoy a sunset party, a cooking demonstration and evening squid fishing.' },
      { dayNumber: 2, title: 'Tai Chi, Sung Sot cave & return', description: 'Begin with an optional sunrise Tai Chi class and breakfast as the bay wakes up. Explore the cathedral-like Sung Sot cave, then enjoy brunch on board as the cruise returns to the wharf. Afternoon transfer back to Hanoi.' },
    ],
    faqs: [
      { question: 'Do I need to be a strong swimmer to kayak?', answer: 'No — kayaking is optional and done in calm, sheltered water with life jackets provided. You can also swim straight from the boat or relax on deck.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },
  {
    slug: 'halong-lan-ha-3d2n',
    destinationSlugs: ['ha-long-bay', 'hanoi'],
    categorySlug: 'cruise',
    title: 'Ha Long & Lan Ha Bay Cruise 3D2N',
    summary:
      'A slower, more exclusive three-day cruise into the quieter Lan Ha Bay — hidden lagoons, kayaks and caves away from the crowds.',
    durationDays: 3,
    maxGroupSize: 20,
    basePrice: 320,
    compareAtPrice: 380,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.boat,
    gallery: [PHOTO.halong, PHOTO.island],
    suitableFor: [TravellerType.COUPLE, TravellerType.FRIENDS],
    badges: [TourBadge.EXCLUSIVE],
    highlights: [
      'Two nights aboard a boutique junk in the quieter Lan Ha Bay',
      'Kayaking into hidden lagoons and karst archways',
      'Cat Ba island, beaches and a floating fishing village',
      'A relaxed, uncrowded pace away from the main bay',
    ],
    included: ['Round-trip transfer from Hanoi', 'Two nights aboard the cruise', 'All meals on board', 'Kayaks & activities', 'English-speaking guide'],
    excluded: ['Drinks', 'Tips', 'Travel insurance'],
    meetingPoint: 'Hanoi Old Quarter hotel pickup',
    itinerary: [
      { dayNumber: 1, title: 'Hanoi → Lan Ha Bay', description: 'Transfer to the harbour and board your cruise. Sail into Lan Ha Bay, kayak among quiet karsts and swim from a secluded beach before a welcome dinner on deck.' },
      { dayNumber: 2, title: 'Lagoons, caves & Cat Ba', description: 'A full day exploring hidden lagoons, a sea cave and a floating fishing village by tender and kayak, with time on a Cat Ba beach and a sunset over the water.' },
      { dayNumber: 3, title: 'Sunrise & return to Hanoi', description: 'Sunrise Tai Chi and a leisurely brunch as the cruise winds back through the karsts, followed by the transfer back to Hanoi.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },

  // ── Trekking & adventure ────────────────────────────────────────────────
  {
    slug: 'sa-pa-trek-3d2n',
    destinationSlugs: ['sa-pa'],
    categorySlug: 'trekking',
    title: 'Sa Pa 3-Day Trek with Local Families',
    summary:
      'A moderate three-day trek between rice terraces and ethnic-minority villages, with two homestay nights cooking and living alongside local families.',
    durationDays: 3,
    maxGroupSize: 12,
    basePrice: 149,
    compareAtPrice: 179,
    difficulty: 'moderate',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.terraces,
    gallery: [PHOTO.rice, PHOTO.forest],
    suitableFor: [TravellerType.FRIENDS, TravellerType.SOLO, TravellerType.COUPLE],
    badges: [TourBadge.BEST_VALUE],
    highlights: [
      'Trek 13–16 km a day through terraced valleys and bamboo forest',
      'Meet Hmong, Red Dao and Tay communities along the way',
      'Two nights in family homestays, cooking with your hosts',
      'Waterfalls, rattan bridges and untouched rice fields',
    ],
    included: ['Transfers to/from Sa Pa', 'Local trekking guide', 'All meals during the trek', 'Two homestay nights', 'Water & local rice wine'],
    excluded: ['Additional drinks', 'Personal trekking gear', 'Tips'],
    meetingPoint: 'Sa Pa town centre (bus arrival point)',
    itinerary: [
      { dayNumber: 1, title: 'Sa Pa → Sa Seng & first homestay', description: 'Meet your local guide for breakfast, then trek through Sa Seng village past fields and a waterfall. Continue with hillside walks and an afternoon swim, arriving at the homestay to cook and dine with your host family.' },
      { dayNumber: 2, title: 'Trek to Ban Ho village', description: 'Trek through bamboo forest to the Giang Ta Chai waterfall and a rattan bridge, visiting Red Dao and Black Hmong villages, then descend to the Tay village of Ban Ho amid rice paddies for a second homestay night.' },
      { dayNumber: 3, title: 'Nam Toong remote fields & return', description: 'A morning trek to Nam Toong to explore remote rice fields, returning to Ban Ho for lunch, then a final walk to the road for the transfer back to Sa Pa.' },
    ],
    faqs: [
      { question: 'How fit do I need to be?', answer: 'A reasonable level of fitness helps — you cover 13–16 km a day on uneven hill paths. The pace is steady rather than fast, with regular stops.' },
      { question: 'What are the homestays like?', answer: 'Simple, clean and warm-hearted: shared mattresses with mosquito nets, a family dinner and basic bathrooms. They are the highlight of the trek for most travellers.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },
  {
    slug: 'ha-giang-loop-3d2n',
    destinationSlugs: ['ha-giang'],
    categorySlug: 'trekking',
    title: 'Ha Giang Loop Motorbike Adventure 3D2N',
    summary:
      'Ride (or be ridden) around Vietnam’s most spectacular frontier road — the Ma Pi Leng pass, limestone plateaus and remote villages over three days.',
    durationDays: 3,
    maxGroupSize: 10,
    basePrice: 165,
    difficulty: 'challenging',
    isPublished: true,
    isFeatured: false,
    photo: PHOTO.mountains,
    gallery: [PHOTO.terraces, PHOTO.forest],
    suitableFor: [TravellerType.FRIENDS, TravellerType.SOLO],
    badges: [TourBadge.NEW],
    highlights: [
      'The legendary Ma Pi Leng pass above the Nho Que river',
      'The Dong Van karst plateau geopark',
      'Frontier markets and ethnic-minority villages',
      'Ride your own bike or relax on the back of an "easy rider"',
    ],
    included: ['Motorbike or easy-rider driver', 'Fuel', 'Local guide', 'Two nights in homestays/guesthouses', 'All meals on the loop'],
    excluded: ['Personal travel insurance', 'Drinks', 'Tips'],
    meetingPoint: 'Ha Giang city tour office',
    itinerary: [
      { dayNumber: 1, title: 'Ha Giang → Yen Minh', description: 'Set off north through the Quan Ba "Heaven’s Gate" pass and the Twin Mountains, winding up onto the karst plateau to Yen Minh for the night.' },
      { dayNumber: 2, title: 'Dong Van & the Ma Pi Leng pass', description: 'Visit the Lung Cu flag tower near the Chinese border and the Hmong King’s palace, then ride the breathtaking Ma Pi Leng pass high above the Nho Que river.' },
      { dayNumber: 3, title: 'Du Gia → Ha Giang', description: 'A final scenic stretch through Du Gia’s waterfalls and villages before looping back to Ha Giang city.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },

  // ── Multi-day packages ────────────────────────────────────────────────────
  {
    slug: 'north-vietnam-5d4n',
    destinationSlugs: ['hanoi', 'ha-long-bay', 'ninh-binh'],
    categorySlug: 'package',
    title: '5-Day North Vietnam: Hanoi, Ha Long & Ninh Binh',
    summary:
      'The classic northern loop in five days — a Hanoi Vespa tour, an overnight Ha Long Bay cruise, and the karst scenery of Ninh Binh.',
    durationDays: 5,
    maxGroupSize: 16,
    basePrice: 487,
    compareAtPrice: 550,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.halong,
    gallery: [PHOTO.street, PHOTO.river],
    suitableFor: [TravellerType.COUPLE, TravellerType.FAMILY, TravellerType.FRIENDS],
    badges: [TourBadge.BEST_VALUE, TourBadge.POPULAR],
    highlights: [
      'A 4.5-hour Vespa tour of Hanoi’s Old Quarter and colonial sights',
      'An overnight luxury cruise in Ha Long Bay with kayaking',
      'A bamboo boat ride through the Tam Coc caves at Ninh Binh',
      'The 500-step climb to the Mua Cave panorama',
    ],
    included: ['4 breakfasts, 3 lunches, 2 dinners', 'Private car & cruise transfers', '3 hotel nights + 1 cruise night', 'All activities & entrance fees', 'English-speaking guides', 'Airport transfers', '24/7 hotline support'],
    excluded: ['International & domestic airfare', 'Travel insurance', 'Drinks beyond water', 'Personal expenses & tips'],
    meetingPoint: 'Noi Bai International Airport / Hanoi hotel',
    itinerary: [
      { dayNumber: 1, title: 'Hanoi arrival & Vespa tour', description: 'Airport transfer and hotel check-in, then a 4.5-hour Vespa tour of the Old Quarter, French colonial sights, Long Bien Bridge and local villages, finishing with a traditional egg coffee.' },
      { dayNumber: 2, title: 'Ha Long Bay cruise (day 1)', description: 'Transfer to the wharf and board a luxury cruise. Visit a pearl farm and Titov Island for swimming and hiking, then enjoy a sunset party, a cooking demonstration and squid fishing.' },
      { dayNumber: 3, title: 'Ha Long Bay cruise (day 2)', description: 'Sunrise Tai Chi and breakfast, the Sung Sot cave and brunch on board, then the return cruise and transfer back to Hanoi.' },
      { dayNumber: 4, title: 'Ninh Binh day tour', description: 'Explore the Hoa Lu ancient capital, a buffet lunch of local specialities, a 1.5-hour bamboo boat ride through the Tam Coc caves, village cycling and the 500-step climb to the Mua Cave viewpoint.' },
      { dayNumber: 5, title: 'Departure', description: 'Hotel breakfast followed by the airport transfer and departure.' },
    ],
    faqs: [
      { question: 'Is airfare included?', answer: 'No — international and domestic flights are excluded, but we can book them for you at discounted rates. Airport transfers in Vietnam are included.' },
      { question: 'Can the itinerary be customised?', answer: 'Yes. This is a popular template; we routinely adjust hotels, pace and extra nights to suit couples, families or small groups.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },
  {
    slug: 'vietnam-romantic-10d',
    destinationSlugs: ['hanoi', 'ha-long-bay', 'ninh-binh', 'da-nang', 'hue', 'hoi-an'],
    categorySlug: 'honeymoon',
    title: '10-Day Vietnam Romantic Getaway',
    summary:
      'A ten-day north-to-centre honeymoon: Hanoi food, a Ha Long Bay cruise, Ninh Binh karsts, Ba Na Hills, imperial Hue and lantern-lit Hoi An.',
    durationDays: 10,
    maxGroupSize: 12,
    basePrice: 724,
    compareAtPrice: 818,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    photo: PHOTO.lantern,
    gallery: [PHOTO.hoian, PHOTO.halong],
    suitableFor: [TravellerType.COUPLE],
    badges: [TourBadge.EXCLUSIVE],
    highlights: [
      'A Hanoi Old Quarter street-food walk',
      'An overnight Ha Long Bay cruise with kayaking',
      'UNESCO sites: Trang An, Hoi An Ancient Town and My Son',
      'The Golden Bridge at Ba Na Hills and imperial Hue',
      'A Hoi An cooking class and basket-boat ride',
    ],
    included: ['9 breakfasts, 6 lunches, 2 dinners', 'Private car, cruise & internal transfers', '9 nights (hotel + cruise)', 'All entrance fees, guided tours & cooking class', 'English-speaking guides', 'Airport transfers', '24/7 support'],
    excluded: ['International airfare', 'Travel insurance', 'Drinks beyond water', 'Personal expenses & tips'],
    meetingPoint: 'Noi Bai International Airport / Hanoi hotel',
    itinerary: [
      { dayNumber: 1, title: 'Hanoi arrival & food tour', description: 'Airport transfer and a walking street-food tour through the Old Quarter at dusk.' },
      { dayNumber: 2, title: 'Ha Long Bay cruise (day 1)', description: 'Board a cruise for a pearl farm, Titov Island kayaking, a sunset party and squid fishing.' },
      { dayNumber: 3, title: 'Ha Long Bay cruise (day 2)', description: 'Sunrise Tai Chi, the Sung Sot cave and brunch, then the return to Hanoi.' },
      { dayNumber: 4, title: 'Ninh Binh day tour', description: 'The Hoa Lu ancient capital, the Trang An UNESCO landscape and the Mua Cave climb.' },
      { dayNumber: 5, title: 'Hanoi → Da Nang', description: 'A domestic flight south to the coast and check-in at Da Nang.' },
      { dayNumber: 6, title: 'Ba Na Hills & Golden Bridge', description: 'Cable cars to the Golden Bridge, the French Village, Fantasy Park and panoramic mountain views.' },
      { dayNumber: 7, title: 'Hue imperial city', description: 'The Imperial Citadel, royal tombs and the Thien Mu Pagoda along the Perfume River.' },
      { dayNumber: 8, title: 'My Son & Hoi An', description: 'The red-brick Cham towers of My Son, then check-in to lantern-lit Hoi An.' },
      { dayNumber: 9, title: 'Hoi An cooking & basket boats', description: 'A market visit, a hands-on cooking class and a coconut-village basket-boat ride.' },
      { dayNumber: 10, title: 'Departure', description: 'Morning at leisure, then the airport transfer.' },
    ],
    faqs: [
      { question: 'Are the hotels couple-friendly?', answer: 'Yes — we book double rooms and can arrange honeymoon touches (room decoration, a private candlelit dinner) on request.' },
    ],
    policies: [DEPOSIT_POLICY, CANCELLATION_POLICY],
  },
];

// Which seeded tour gets the self-signed PAID booking (must be published).
const PAID_TOUR_SLUG = 'hoi-an-walking-tour';
const PAID_BOOKING_CODE = 'BK-SEEDPAID';

// ────────────────────────────────────────────────────────────────────────────
// Reviewers + approved reviews (each backed by its own PAID booking).
// ────────────────────────────────────────────────────────────────────────────

interface ReviewerSeed {
  email: string;
  fullName: string;
  supabaseId: string;
  nationality: string;
}

const REVIEWERS: ReviewerSeed[] = [
  { email: 'emma.thompson@example.com', fullName: 'Emma Thompson', supabaseId: '33333333-3333-3333-3333-000000000001', nationality: 'United Kingdom' },
  { email: 'james.miller@example.com', fullName: 'James Miller', supabaseId: '33333333-3333-3333-3333-000000000002', nationality: 'United States' },
  { email: 'sophie.dubois@example.com', fullName: 'Sophie Dubois', supabaseId: '33333333-3333-3333-3333-000000000003', nationality: 'France' },
  { email: 'lukas.müller@example.com', fullName: 'Lukas Müller', supabaseId: '33333333-3333-3333-3333-000000000004', nationality: 'Germany' },
  { email: 'olivia.nguyen@example.com', fullName: 'Olivia Nguyen', supabaseId: '33333333-3333-3333-3333-000000000005', nationality: 'Australia' },
  { email: 'marco.rossi@example.com', fullName: 'Marco Rossi', supabaseId: '33333333-3333-3333-3333-000000000006', nationality: 'Italy' },
  { email: 'hana.tanaka@example.com', fullName: 'Hana Tanaka', supabaseId: '33333333-3333-3333-3333-000000000007', nationality: 'Japan' },
  { email: 'noah.anderson@example.com', fullName: 'Noah Anderson', supabaseId: '33333333-3333-3333-3333-000000000008', nationality: 'Canada' },
];

interface ReviewSeed {
  reviewer: number; // index into REVIEWERS
  rating: number; // 1..5
  title: string;
  body: string;
}

/** APPROVED reviews keyed by tour slug — drives card averageRating/reviewsCount. */
const REVIEWS: Record<string, ReviewSeed[]> = {
  'hoi-an-walking-tour': [
    { reviewer: 0, rating: 5, title: 'Magical at dusk', body: 'Our guide knew every corner of the old town and timed it perfectly so we floated our lanterns just as the lights came on. A lovely, gentle evening.' },
    { reviewer: 2, rating: 5, title: 'A highlight of our trip', body: 'So much history packed into a few hours, and never rushed. The cao lau recommendation afterwards was spot on.' },
    { reviewer: 6, rating: 4, title: 'Beautiful but busy', body: 'The town gets crowded in the evening, but the guide found the quieter lanes. Floating the lantern was the kids’ favourite moment.' },
  ],
  'ba-na-hills-day': [
    { reviewer: 1, rating: 5, title: 'The Golden Bridge delivers', body: 'Yes it’s touristy, but standing on those giant hands in the clouds is genuinely jaw-dropping. Pickup was punctual and the cable car is incredible.' },
    { reviewer: 4, rating: 4, title: 'Great day out', body: 'Bring a jacket — it’s cold at the top! Buffet lunch was better than expected and there’s plenty for kids in Fantasy Park.' },
    { reviewer: 5, rating: 5, title: 'Worth the early start', body: 'We beat most of the crowds and had the bridge almost to ourselves for photos. Smooth organisation from start to finish.' },
  ],
  'phu-quoc-4-islands': [
    { reviewer: 4, rating: 5, title: 'Best snorkelling in Vietnam', body: 'Crystal-clear water and healthy coral at both stops. The seafood lunch on the boat was a feast. Crew were friendly and safety-conscious.' },
    { reviewer: 7, rating: 4, title: 'Lovely islands', body: 'A little busy at the first reef but the second stop was quieter and gorgeous. The cable-car add-on is worth it.' },
  ],
  'halong-bay-2d1n': [
    { reviewer: 3, rating: 5, title: 'Unforgettable overnight', body: 'Waking up among the karsts with the mist still on the water is something I’ll never forget. Cabin was comfortable and the food was excellent.' },
    { reviewer: 0, rating: 5, title: 'Exceeded expectations', body: 'Kayaking into the quiet coves and the sunset party on deck were highlights. A genuinely boutique feel, not a mass-market boat.' },
    { reviewer: 5, rating: 4, title: 'Beautiful, slightly rushed', body: 'The 2-day format is short — I’d book the 3-day next time — but everything was well run and the Sung Sot cave is astonishing.' },
  ],
  'sa-pa-trek-3d2n': [
    { reviewer: 2, rating: 5, title: 'The homestays made it', body: 'Cooking dinner with our host family and waking up over the rice terraces was the best part of three weeks in Vietnam. Our guide was warm and knowledgeable.' },
    { reviewer: 1, rating: 5, title: 'Tough but rewarding', body: 'The trails are real trekking, not a stroll, but the scenery and the village encounters are worth every step. Pack proper shoes.' },
    { reviewer: 7, rating: 4, title: 'Authentic and beautiful', body: 'A genuine look at mountain life away from the tourist track. Basic comforts at the homestays, but that’s the point.' },
  ],
  'north-vietnam-5d4n': [
    { reviewer: 1, rating: 5, title: 'Perfect first trip to the north', body: 'Hanoi, Ha Long and Ninh Binh in five days sounds rushed but it flowed beautifully. The Vespa tour was a brilliant start and the cruise was the highlight.' },
    { reviewer: 4, rating: 5, title: 'Brilliant value', body: 'Everything was taken care of — transfers, guides, entrance fees. We just turned up and enjoyed it. Fantastic value for what’s included.' },
    { reviewer: 6, rating: 4, title: 'Smooth and well-paced', body: 'Great mix of city, bay and countryside. Long-ish drive to Ninh Binh but the scenery makes up for it.' },
  ],
  'vietnam-romantic-10d': [
    { reviewer: 0, rating: 5, title: 'A dream honeymoon', body: 'Ten days that felt unhurried and special. The room touches in Hoi An were a lovely surprise and the cooking class was so much fun. Impeccably organised.' },
    { reviewer: 5, rating: 5, title: 'Everything we hoped for', body: 'From the Ha Long cruise to the lanterns of Hoi An, every day was a highlight. Our guides went out of their way for us.' },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** A date at 00:00:00 UTC, `daysAhead` from today (so dates stay upcoming). */
function dateOffset(daysAhead: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead),
  );
}

/** Three OPEN departures per tour (+30 / +75 / +150 days), seats ≈ 60% group. */
function buildDepartures(
  tourId: string,
  maxGroupSize: number,
  durationDays: number,
): Array<{
  tourId: string;
  startDate: Date;
  endDate: Date;
  seatsTotal: number;
  status: DepartureStatus;
}> {
  const seatsTotal = Math.max(5, Math.ceil(maxGroupSize * 0.6));
  const dayLength = Math.max(0, durationDays - 1);
  return [30, 75, 150].map((daysAhead) => ({
    tourId,
    startDate: dateOffset(daysAhead),
    endDate: dateOffset(daysAhead + dayLength),
    seatsTotal,
    status: DepartureStatus.OPEN,
  }));
}

/** A tour's hero + 2 gallery media rows (absolute Unsplash URLs). */
function buildTourMedia(ownerId: string, t: TourSeed) {
  return [
    { publicId: img(t.photo), type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId, role: 'hero' as const, format: 'jpg', sortOrder: 0 },
    { publicId: img(t.gallery[0]), type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId, role: 'gallery' as const, format: 'jpg', sortOrder: 1 },
    { publicId: img(t.gallery[1]), type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId, role: 'gallery' as const, format: 'jpg', sortOrder: 2 },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[seed] connecting to DB...');

  // 1. Categories — lookup table, upsert by slug.
  console.log(`[seed] upserting ${CATEGORIES.length} categories...`);
  const categoryIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.tourCategory.upsert({
      where: { slug: c.slug },
      create: { ...c, isActive: true },
      update: { name: c.name, description: c.description, order: c.order, isActive: true },
    });
    categoryIdBySlug.set(c.slug, row.id);
  }

  // 2. Destinations — upsert by slug (+ hero media).
  console.log(`[seed] upserting ${DESTINATIONS.length} destinations...`);
  const destinationIdBySlug = new Map<string, string>();
  for (const d of DESTINATIONS) {
    const row = await prisma.destination.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, name: d.name, country: 'Vietnam', region: d.region, description: d.description, isActive: true },
      update: { name: d.name, region: d.region, description: d.description, isActive: true },
    });
    destinationIdBySlug.set(d.slug, row.id);

    await prisma.mediaAsset.deleteMany({
      where: { ownerType: MediaOwnerType.DESTINATION, ownerId: row.id },
    });
    await prisma.mediaAsset.create({
      data: {
        publicId: img(d.photo),
        type: MediaType.IMAGE,
        ownerType: MediaOwnerType.DESTINATION,
        ownerId: row.id,
        role: 'hero',
        format: 'jpg',
        sortOrder: 0,
      },
    });
  }

  // 3. Tours — upsert by slug (+ M:N destinations, itinerary, FAQs, policies, media).
  console.log(`[seed] upserting ${TOURS.length} tours...`);
  const tourIdBySlug = new Map<string, string>();
  for (const t of TOURS) {
    const categoryId = categoryIdBySlug.get(t.categorySlug);
    if (!categoryId) {
      throw new Error(`[seed] tour "${t.slug}" → unknown category "${t.categorySlug}"`);
    }
    const destinationIds = t.destinationSlugs.map((slug) => {
      const id = destinationIdBySlug.get(slug);
      if (!id) throw new Error(`[seed] tour "${t.slug}" → unknown destination "${slug}"`);
      return id;
    });

    const data = {
      title: t.title,
      summary: t.summary,
      categoryId,
      durationDays: t.durationDays,
      maxGroupSize: t.maxGroupSize,
      basePrice: t.basePrice,
      compareAtPrice: t.compareAtPrice ?? null,
      currency: 'USD',
      difficulty: t.difficulty,
      isPublished: t.isPublished,
      isFeatured: t.isFeatured,
      suitableFor: t.suitableFor,
      badges: t.badges,
      highlights: t.highlights,
      included: t.included,
      excluded: t.excluded,
      meetingPoint: t.meetingPoint,
    };
    const row = await prisma.tour.upsert({
      where: { slug: t.slug },
      create: { ...data, slug: t.slug },
      update: data,
    });
    tourIdBySlug.set(t.slug, row.id);

    // M:N destinations (ADR-0002) — reset + recreate (first = primary).
    await prisma.tourDestination.deleteMany({ where: { tourId: row.id } });
    await prisma.tourDestination.createMany({
      data: destinationIds.map((destinationId, idx) => ({
        tourId: row.id,
        destinationId,
        isPrimary: idx === 0,
      })),
    });

    // Itinerary / FAQs / policies — reset + recreate (no dependent rows).
    await prisma.tourItineraryDay.deleteMany({ where: { tourId: row.id } });
    if (t.itinerary?.length) {
      await prisma.tourItineraryDay.createMany({
        data: t.itinerary.map((day) => ({ tourId: row.id, dayNumber: day.dayNumber, title: day.title, description: day.description })),
      });
    }
    await prisma.tourFaq.deleteMany({ where: { tourId: row.id } });
    if (t.faqs?.length) {
      await prisma.tourFaq.createMany({
        data: t.faqs.map((f, idx) => ({ tourId: row.id, question: f.question, answer: f.answer, order: idx })),
      });
    }
    await prisma.tourPolicy.deleteMany({ where: { tourId: row.id } });
    if (t.policies?.length) {
      await prisma.tourPolicy.createMany({
        data: t.policies.map((p, idx) => ({ tourId: row.id, kind: p.kind, title: p.title, body: p.body, order: idx })),
      });
    }

    // Media — 1 hero + 2 gallery (Unsplash). Idempotent: clear + recreate.
    await prisma.mediaAsset.deleteMany({
      where: { ownerType: MediaOwnerType.TOUR, ownerId: row.id },
    });
    await prisma.mediaAsset.createMany({ data: buildTourMedia(row.id, t) });
  }

  // 4. Departures — reset+recreate, but keep departures of tours with bookings
  //    (Booking FK is Restrict → wiping a referenced departure aborts the seed).
  const tourIds = Array.from(tourIdBySlug.values());
  const departures = TOURS.flatMap((t) => {
    const id = tourIdBySlug.get(t.slug);
    return id ? buildDepartures(id, t.maxGroupSize, t.durationDays) : [];
  });
  const tourIdsWithBookings = new Set(
    (
      await prisma.booking.findMany({
        where: { tourId: { in: tourIds } },
        select: { tourId: true },
        distinct: ['tourId'],
      })
    ).map((b) => b.tourId),
  );
  const resettableTourIds = tourIds.filter((id) => !tourIdsWithBookings.has(id));
  const resettableDepartures = departures.filter((d) => resettableTourIds.includes(d.tourId));
  console.log(
    `[seed] resetting departures for ${resettableTourIds.length}/${tourIds.length} tours ` +
      `(${tourIdsWithBookings.size} have live bookings); inserting ${resettableDepartures.length} rows...`,
  );
  await prisma.tourDeparture.deleteMany({ where: { tourId: { in: resettableTourIds } } });
  await prisma.tourDeparture.createMany({ data: resettableDepartures });

  // 5. Users — seed a CUSTOMER + an ADMIN (upsert by email; citext unique).
  const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'admin@tourism.test';
  const customer = await prisma.user.upsert({
    where: { email: 'customer@tourism.test' },
    create: {
      supabaseId: '11111111-1111-1111-1111-111111111111',
      email: 'customer@tourism.test',
      fullName: 'Seed Customer',
      phone: '+84900000001',
      role: UserRole.CUSTOMER,
    },
    update: { fullName: 'Seed Customer', role: UserRole.CUSTOMER },
  });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      supabaseId: '22222222-2222-2222-2222-222222222222',
      email: adminEmail,
      fullName: 'Seed Admin',
      role: UserRole.ADMIN,
    },
    update: { fullName: 'Seed Admin', role: UserRole.ADMIN },
  });
  console.log(`[seed] users: customer=${customer.email} admin=${admin.email}`);

  // 6. Self-signed PAID booking — write a PAID row directly (no gateway) +
  //    claim seats, so POST /reviews + e2e are runnable. Created once.
  const paidTourId = tourIdBySlug.get(PAID_TOUR_SLUG);
  if (!paidTourId) throw new Error(`[seed] PAID tour "${PAID_TOUR_SLUG}" missing`);
  const departure = await prisma.tourDeparture.findFirst({
    where: { tourId: paidTourId, status: DepartureStatus.OPEN },
    orderBy: { startDate: 'asc' },
    select: { id: true },
  });
  if (!departure) throw new Error(`[seed] no OPEN departure for "${PAID_TOUR_SLUG}"`);

  const numAdults = 2;
  const paidTour = TOURS.find((t) => t.slug === PAID_TOUR_SLUG);
  if (!paidTour) throw new Error(`[seed] PAID tour entry "${PAID_TOUR_SLUG}" missing`);
  const existing = await prisma.booking.findUnique({ where: { code: PAID_BOOKING_CODE } });
  if (!existing) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          code: PAID_BOOKING_CODE,
          userId: customer.id,
          tourId: paidTourId,
          departureId: departure.id,
          numAdults,
          numChildren: 0,
          totalAmount: paidTour.basePrice * numAdults,
          currency: 'USD',
          status: BookingStatus.PAID,
          contactName: 'Seed Customer',
          contactEmail: customer.email,
          contactPhone: '+84900000001',
          paymentProvider: PaymentProvider.STRIPE,
          providerSessionId: 'cs_seed_paid_1',
          providerPaymentId: 'pi_seed_paid_1',
          paidAt: new Date(),
        },
      });
      await tx.tourDeparture.update({
        where: { id: departure.id },
        data: { seatsBooked: { increment: numAdults } },
      });
    });
    console.log(`[seed] created PAID booking ${PAID_BOOKING_CODE} (${numAdults} seats)`);
  } else {
    console.log(`[seed] PAID booking ${PAID_BOOKING_CODE} already exists — skipped`);
  }

  // 6b. Reviewers + APPROVED reviews. Each review needs its own PAID booking
  //     (Review.bookingId is a unique FK). Review bookings are created once
  //     (by code) and DO NOT claim departure seats (kept off the availability
  //     count, separate from the self-signed PAID booking above).
  console.log(`[seed] upserting ${REVIEWERS.length} reviewer users...`);
  const reviewerIds: string[] = [];
  for (const r of REVIEWERS) {
    const u = await prisma.user.upsert({
      where: { email: r.email },
      create: { supabaseId: r.supabaseId, email: r.email, fullName: r.fullName, role: UserRole.CUSTOMER },
      update: { fullName: r.fullName },
    });
    reviewerIds.push(u.id);
  }

  let reviewSeq = 0;
  let reviewsCreated = 0;
  for (const [slug, list] of Object.entries(REVIEWS)) {
    const tourId = tourIdBySlug.get(slug);
    if (!tourId) throw new Error(`[seed] review tour "${slug}" missing`);
    const dep = await prisma.tourDeparture.findFirst({
      where: { tourId },
      orderBy: { startDate: 'asc' },
      select: { id: true },
    });
    if (!dep) throw new Error(`[seed] no departure for reviewed tour "${slug}"`);
    const basePrice = TOURS.find((t) => t.slug === slug)?.basePrice ?? 0;

    for (const rv of list) {
      reviewSeq += 1;
      const code = `BK-RV-${String(reviewSeq).padStart(3, '0')}`;
      const reviewerId = reviewerIds[rv.reviewer];
      const reviewer = REVIEWERS[rv.reviewer];

      let booking = await prisma.booking.findUnique({ where: { code } });
      if (!booking) {
        booking = await prisma.booking.create({
          data: {
            code,
            userId: reviewerId,
            tourId,
            departureId: dep.id,
            numAdults: 2,
            numChildren: 0,
            totalAmount: basePrice * 2,
            currency: 'USD',
            status: BookingStatus.PAID,
            contactName: reviewer.fullName,
            contactEmail: reviewer.email,
            paymentProvider: PaymentProvider.STRIPE,
            providerSessionId: `cs_seed_rv_${reviewSeq}`,
            providerPaymentId: `pi_seed_rv_${reviewSeq}`,
            paidAt: new Date(),
          },
        });
      }

      await prisma.review.upsert({
        where: { bookingId: booking.id },
        create: {
          tourId,
          userId: reviewerId,
          bookingId: booking.id,
          rating: rv.rating,
          title: rv.title,
          body: rv.body,
          isApproved: true,
        },
        update: { rating: rv.rating, title: rv.title, body: rv.body, isApproved: true },
      });
      reviewsCreated += 1;
    }
  }
  console.log(`[seed] reviews: ${reviewsCreated} approved across ${Object.keys(REVIEWS).length} tours`);

  // 6c. Editorial posts (P-Content) — a few PUBLISHED articles authored by the admin.
  const POSTS = [
    {
      slug: 'best-time-to-visit-vietnam',
      title: 'The best time to visit Vietnam, region by region',
      excerpt:
        'When the north is misty and the south is golden — how to time your trip for the weather you want.',
      content:
        '## North, Central & South\n\nVietnam spans many microclimates. The north has a real winter; the centre is best in spring; the south is warm year-round. Plan around the season you want, not a single "best" month.',
    },
    {
      slug: 'two-unhurried-days-in-hoi-an',
      title: 'Two unhurried days in Hội An',
      excerpt: 'Lanterns, tailors, and riverside mornings — a slow itinerary for the old town.',
      content:
        '## Day 1\n\nWander the old town before the crowds, then a tailor fitting and a lantern-lit dinner.\n\n## Day 2\n\nCycle to the rice paddies and the beach, returning for the night market.',
    },
    {
      slug: 'morning-at-the-mekong-floating-markets',
      title: 'A morning at the Mekong floating markets',
      excerpt:
        'Dawn on the delta: what to expect, what to eat, and how to find the quieter channels.',
      content:
        '## Start before sunrise\n\nThe markets are busiest at dawn. Hire a small boat to slip into the narrow channels the big tours miss.',
    },
  ];
  for (const p of POSTS) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: admin.id,
      },
      update: { title: p.title, excerpt: p.excerpt, content: p.content },
    });
  }
  console.log(`[seed] posts: ${POSTS.length} published`);

  // 7. Write seeded identifiers for the e2e suite (gitignored; no secrets).
  const outPath = join(__dirname, '..', '.env.e2e');
  const lines = [
    '# Generated by `nx run @tourism/api:seed` — gitignored, no secrets.',
    `E2E_CUSTOMER_ID=${customer.id}`,
    `E2E_CUSTOMER_EMAIL=${customer.email}`,
    `E2E_ADMIN_ID=${admin.id}`,
    `E2E_ADMIN_EMAIL=${admin.email}`,
    `E2E_PAID_BOOKING_CODE=${PAID_BOOKING_CODE}`,
    `E2E_TOUR_SLUG=${PAID_TOUR_SLUG}`,
    `E2E_DEPARTURE_ID=${departure.id}`,
    '',
  ].join('\n');
  writeFileSync(outPath, lines, 'utf8');
  console.log(`[seed] wrote ${outPath}`);
  console.log('[seed] done.');
}

main()
  .catch((err: unknown) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
