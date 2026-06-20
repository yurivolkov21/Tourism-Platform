/**
 * Database seed — populates the Supabase Postgres with a realistic catalog +
 * test accounts for local dev, the e2e suite, and demo screenshots.
 *
 * Adapted from the donor seed for OUR schema (P1.8a):
 *  - EN-only (ADR-0005): `name`/`title`/`summary` single columns (no `*_vi`).
 *  - TourCategory is a LOOKUP TABLE (D-P1.5), not an enum — seeded first, then
 *    referenced by `categoryId`.
 *  - Tour↔Destination is M:N (ADR-0002) via `TourDestination` (`isPrimary`),
 *    not the donor's single `destinationId` column.
 *  - Gateways are Stripe + PayPal (ADR-0006), no MoMo.
 *  - Adds seeded USERS (customer + admin) and a SELF-SIGNED PAID booking so the
 *    review flow + e2e are runnable without a live payment. Dev-only — the
 *    runtime PAID path stays the gateway webhook + atomic seat-claim CTE.
 *
 * Idempotency: upsert by `slug` (categories/destinations/tours), `(tourId,
 * dayNumber)` (itinerary), `(tourId,destinationId)` (M:N); departures are
 * reset+recreated only for tours WITHOUT bookings (FK is Restrict); the PAID
 * booking is created once (skipped if its code already exists).
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
  PrismaClient,
  UserRole,
} from '@prisma/client';

// Cloudinary built-in sample images (present in every cloud) so seeded tours +
// destinations render real media. Admin-uploaded media replaces these in prod.
const TOUR_HERO_SAMPLES = [
  'samples/landscapes/nature-mountains',
  'samples/landscapes/beach-boat',
  'samples/landscapes/girl-urban-view',
  'samples/balloons',
];
const TOUR_GALLERY_SAMPLES = [
  'samples/landscapes/architecture-signs',
  'samples/food/spices',
  'samples/food/pot-mussels',
  'samples/coffee',
  'samples/people/kitchen-bar',
];

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
// Seed data
// ────────────────────────────────────────────────────────────────────────────

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  order: number;
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'day', name: 'Day Tour', description: 'Single-day experiences', order: 1 },
  { slug: 'musical', name: 'Musical & Cultural', description: 'Festivals, music, and cultural nights', order: 2 },
  { slug: 'package', name: 'Multi-day Package', description: 'Multi-day trips with overnight stays', order: 3 },
  { slug: 'honeymoon', name: 'Honeymoon', description: 'Romantic getaways for couples', order: 4 },
];

interface DestinationSeed {
  slug: string;
  name: string;
  country: string;
  region: string;
  description: string;
}

const DESTINATIONS: DestinationSeed[] = [
  {
    slug: 'hoi-an',
    name: 'Hoi An',
    country: 'Vietnam',
    region: 'Central',
    description:
      'UNESCO-listed Ancient Town glowing with silk lanterns, riverside cafés, and centuries-old merchant houses.',
  },
  {
    slug: 'ha-noi',
    name: 'Hanoi',
    country: 'Vietnam',
    region: 'North',
    description:
      'A thousand-year-old capital where French colonial boulevards meet bustling motorbike-filled alleys.',
  },
  {
    slug: 'sa-pa',
    name: 'Sapa',
    country: 'Vietnam',
    region: 'Northwest',
    description:
      'Misty mountain town overlooking emerald rice terraces and home to Vietnam’s highest peak, Fansipan.',
  },
  {
    slug: 'phu-quoc',
    name: 'Phu Quoc',
    country: 'Vietnam',
    region: 'South',
    description:
      'Tropical island getaway with white-sand beaches, pepper farms, and Vietnam’s clearest snorkelling waters.',
  },
];

interface TourSeed {
  slug: string;
  destinationSlug: string;
  categorySlug: string;
  title: string;
  summary: string;
  durationDays: number;
  maxGroupSize: number;
  basePrice: number;
  difficulty?: string;
  isPublished: boolean;
  isFeatured: boolean;
  included: string[];
  excluded: string[];
  meetingPoint: string;
  itinerary?: { dayNumber: number; title: string; description: string }[];
}

const TOURS: TourSeed[] = [
  {
    slug: 'hoi-an-walking-tour',
    destinationSlug: 'hoi-an',
    categorySlug: 'day',
    title: 'Hoi An Ancient Town Walking Tour',
    summary: 'Half-day stroll through lantern-lit alleys with a local guide.',
    durationDays: 1,
    maxGroupSize: 12,
    basePrice: 39,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    included: ['Local guide', 'Bottled water', 'Heritage site entrance'],
    excluded: ['Lunch', 'Personal expenses'],
    meetingPoint: 'Hoi An tourist info centre, 78 Le Loi street',
  },
  {
    slug: 'hoi-an-lantern-night',
    destinationSlug: 'hoi-an',
    categorySlug: 'musical',
    title: 'Hoi An Lantern Festival Night',
    summary:
      'Evening river cruise with paper lantern release, live traditional music, and street food sampling.',
    durationDays: 1,
    maxGroupSize: 20,
    basePrice: 29,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    included: ['Boat ride', 'Lantern', 'Street food vouchers'],
    excluded: ['Tips'],
    meetingPoint: 'Bach Dang street pier',
  },
  {
    slug: 'hoi-an-cooking-class',
    destinationSlug: 'hoi-an',
    categorySlug: 'day',
    title: 'Hoi An Market & Cooking Class',
    summary:
      'Morning market tour, basket boat ride, then cook 4 classic Hoi An dishes.',
    durationDays: 1,
    maxGroupSize: 10,
    basePrice: 59,
    difficulty: 'easy',
    // Draft on purpose so public-catalog filters can be tested — MUST NOT appear
    // in GET /tours but MUST appear in /admin/tours.
    isPublished: false,
    isFeatured: false,
    included: ['Market tour', 'Basket boat', 'Cooking class', 'Lunch'],
    excluded: ['Drinks'],
    meetingPoint: 'Tra Que village entrance',
  },
  {
    slug: 'ha-noi-old-quarter',
    destinationSlug: 'ha-noi',
    categorySlug: 'day',
    title: 'Hanoi Old Quarter Discovery',
    summary:
      'Cyclo + walking tour of the 36 streets with a stop at Hoan Kiem Lake.',
    durationDays: 1,
    maxGroupSize: 15,
    basePrice: 35,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    included: ['Cyclo ride', 'Local guide', 'Bottled water'],
    excluded: ['Lunch'],
    meetingPoint: 'St Joseph cathedral, Nha Tho street',
  },
  {
    slug: 'ha-long-bay-day-cruise',
    destinationSlug: 'ha-noi',
    categorySlug: 'day',
    title: 'Ha Long Bay Day Cruise from Hanoi',
    summary:
      'Round-trip bus + 4-hour bay cruise with kayaking and seafood lunch.',
    durationDays: 1,
    maxGroupSize: 25,
    basePrice: 79,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    included: ['Coach transfer', 'Boat cruise', 'Kayak', 'Seafood lunch'],
    excluded: ['Tips', 'Drinks beyond water'],
    meetingPoint: 'Hanoi Opera House',
  },
  {
    slug: 'ha-noi-food-tour',
    destinationSlug: 'ha-noi',
    categorySlug: 'day',
    title: 'Hanoi Street Food Walking Tour',
    summary: 'Sample 8+ classic Hanoi dishes with a local food blogger guide.',
    durationDays: 1,
    maxGroupSize: 8,
    basePrice: 45,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    included: ['All food + drinks', 'Local guide'],
    excluded: ['Tips'],
    meetingPoint: 'Hang Be market entrance',
  },
  {
    slug: 'sa-pa-trek-2d1n',
    destinationSlug: 'sa-pa',
    categorySlug: 'package',
    title: 'Sapa Rice Terrace Trek (2D1N Homestay)',
    summary:
      'Two-day moderate trek through Cat Cat + Lao Chai villages with a Hmong homestay.',
    durationDays: 2,
    maxGroupSize: 12,
    basePrice: 119,
    difficulty: 'moderate',
    isPublished: true,
    isFeatured: true,
    included: ['Guide', 'Homestay night', '3 meals', 'Insurance'],
    excluded: ['Personal trekking gear', 'Drinks'],
    meetingPoint: 'Sapa central square',
    itinerary: [
      {
        dayNumber: 1,
        title: 'Cat Cat Village & Muong Hoa Valley',
        description:
          'Morning trek into Cat Cat village to meet Hmong artisans, then descend into Muong Hoa rice terraces. Lunch at a local family home. Arrive at the Lao Chai homestay by 16:00 for tea and dinner.',
      },
      {
        dayNumber: 2,
        title: 'Ta Van Ridge & return',
        description:
          'Sunrise trek up the Ta Van ridge for panoramic terrace views. Breakfast at the homestay, then descend through Giang Ta Chai village back to Sapa town by 14:00.',
      },
    ],
  },
  {
    slug: 'sa-pa-fansipan-cable',
    destinationSlug: 'sa-pa',
    categorySlug: 'day',
    title: 'Fansipan Summit by Cable Car',
    summary:
      'Half-day cable car ride to Indochina’s highest peak with summit time included.',
    durationDays: 1,
    maxGroupSize: 20,
    basePrice: 65,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: false,
    included: ['Cable car ticket', 'Funicular', 'Guide'],
    excluded: ['Meals'],
    meetingPoint: 'Sapa cable car station',
  },
  {
    slug: 'phu-quoc-island-hopping',
    destinationSlug: 'phu-quoc',
    categorySlug: 'day',
    title: 'Phu Quoc 3-Island Snorkelling',
    summary:
      'Full-day speedboat tour of An Thoi archipelago with two snorkel stops and BBQ lunch.',
    durationDays: 1,
    maxGroupSize: 18,
    basePrice: 49,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    included: ['Speedboat', 'Snorkel gear', 'BBQ lunch', 'Insurance'],
    excluded: ['Drinks', 'Underwater camera rental'],
    meetingPoint: 'An Thoi port',
  },
  {
    slug: 'phu-quoc-sunset-cruise',
    destinationSlug: 'phu-quoc',
    categorySlug: 'honeymoon',
    title: 'Phu Quoc Romantic Sunset Sail',
    summary:
      'Private-feel sunset sail along the west coast with sparkling wine, tapas, and a couples-friendly itinerary.',
    durationDays: 1,
    maxGroupSize: 16,
    basePrice: 55,
    difficulty: 'easy',
    isPublished: true,
    isFeatured: true,
    included: ['Sailing boat', 'Sparkling wine', 'Tapas', 'Guide'],
    excluded: ['Tips'],
    meetingPoint: 'Duong Dong harbour pier 3',
  },
];

// Which seeded tour gets the self-signed PAID booking (must be published).
const PAID_TOUR_SLUG = 'hoi-an-walking-tour';
const PAID_BOOKING_CODE = 'BK-SEEDPAID';

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
  for (const [destIdx, d] of DESTINATIONS.entries()) {
    const row = await prisma.destination.upsert({
      where: { slug: d.slug },
      create: { ...d, isActive: true },
      update: { ...d, isActive: true },
    });
    destinationIdBySlug.set(d.slug, row.id);

    await prisma.mediaAsset.deleteMany({
      where: { ownerType: MediaOwnerType.DESTINATION, ownerId: row.id },
    });
    await prisma.mediaAsset.create({
      data: {
        publicId: TOUR_HERO_SAMPLES[destIdx % TOUR_HERO_SAMPLES.length],
        type: MediaType.IMAGE,
        ownerType: MediaOwnerType.DESTINATION,
        ownerId: row.id,
        role: 'hero',
        format: 'jpg',
        sortOrder: 0,
      },
    });
  }

  // 3. Tours — upsert by slug (+ M:N destination, itinerary, media).
  console.log(`[seed] upserting ${TOURS.length} tours...`);
  const tourIdBySlug = new Map<string, string>();
  for (const [mediaIdx, t] of TOURS.entries()) {
    const destinationId = destinationIdBySlug.get(t.destinationSlug);
    const categoryId = categoryIdBySlug.get(t.categorySlug);
    if (!destinationId) {
      throw new Error(`[seed] tour "${t.slug}" → unknown destination "${t.destinationSlug}"`);
    }
    if (!categoryId) {
      throw new Error(`[seed] tour "${t.slug}" → unknown category "${t.categorySlug}"`);
    }

    const data = {
      title: t.title,
      summary: t.summary,
      categoryId,
      durationDays: t.durationDays,
      maxGroupSize: t.maxGroupSize,
      basePrice: t.basePrice,
      currency: 'USD',
      difficulty: t.difficulty,
      isPublished: t.isPublished,
      isFeatured: t.isFeatured,
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

    // M:N — primary destination (ADR-0002).
    await prisma.tourDestination.upsert({
      where: { tourId_destinationId: { tourId: row.id, destinationId } },
      create: { tourId: row.id, destinationId, isPrimary: true },
      update: { isPrimary: true },
    });

    // Itinerary — upsert per (tourId, dayNumber).
    for (const day of t.itinerary ?? []) {
      await prisma.tourItineraryDay.upsert({
        where: { tourId_dayNumber: { tourId: row.id, dayNumber: day.dayNumber } },
        create: { tourId: row.id, dayNumber: day.dayNumber, title: day.title, description: day.description },
        update: { title: day.title, description: day.description },
      });
    }

    // Media — 1 hero + 2 gallery (Cloudinary samples). Idempotent: clear + recreate.
    await prisma.mediaAsset.deleteMany({
      where: { ownerType: MediaOwnerType.TOUR, ownerId: row.id },
    });
    await prisma.mediaAsset.createMany({
      data: [
        { publicId: TOUR_HERO_SAMPLES[mediaIdx % TOUR_HERO_SAMPLES.length], type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId: row.id, role: 'hero', format: 'jpg', sortOrder: 0 },
        { publicId: TOUR_GALLERY_SAMPLES[mediaIdx % TOUR_GALLERY_SAMPLES.length], type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId: row.id, role: 'gallery', format: 'jpg', sortOrder: 1 },
        { publicId: TOUR_GALLERY_SAMPLES[(mediaIdx + 2) % TOUR_GALLERY_SAMPLES.length], type: MediaType.IMAGE, ownerType: MediaOwnerType.TOUR, ownerId: row.id, role: 'gallery', format: 'jpg', sortOrder: 2 },
      ],
    });
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
