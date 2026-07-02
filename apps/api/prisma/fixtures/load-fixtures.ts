/**
 * Load the sample fixtures (./sample-data) into the database.
 *
 * Mirrors prisma/seed.ts: PrismaPg adapter, prefers DIRECT_URL (Supabase direct
 * 5432) and falls back to DATABASE_URL. Inserts in FK-safe order using
 * `createMany({ skipDuplicates: true })`, so re-running is safe (existing rows by
 * PK/unique are skipped — note it inserts only, it does NOT update changed rows).
 *
 * Run:
 *   cd apps/api && pnpm exec ts-node --transpile-only prisma/fixtures/load-fixtures.ts
 *
 * Prerequisites: the schema must be migrated (tables exist) and apps/api/.env must
 * hold DIRECT_URL (preferred) or DATABASE_URL.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as f from './sample-data';

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error(
    '[load-fixtures] missing DIRECT_URL (preferred) or DATABASE_URL in environment',
  );
}

// Safety guard: this inserts 369 sample rows. The connection string comes from
// DIRECT_URL/DATABASE_URL, which in this repo points at the live Supabase DB —
// refuse to run against a non-local database unless explicitly confirmed, so the
// fixtures can never accidentally pollute production. Set LOAD_FIXTURES_CONFIRM=1
// to override (e.g. for a throwaway staging DB you actually mean to fill).
const isLocalDb = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
if (!isLocalDb && process.env.LOAD_FIXTURES_CONFIRM !== '1') {
  throw new Error(
    '[load-fixtures] refusing to load into a non-local database. This targets ' +
      'DIRECT_URL/DATABASE_URL (the live Supabase in this repo). If you really mean ' +
      'to, set LOAD_FIXTURES_CONFIRM=1.',
  );
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  // Ordered parents-before-children so every foreign key resolves.
  // Each entry: [label, createMany call]. `as any` keeps the readonly `as const`
  // fixtures assignable to Prisma's CreateMany input types under --transpile-only.
  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    [
      'users',
      () =>
        prisma.user.createMany({ data: f.users as any, skipDuplicates: true }),
    ],
    [
      'tourCategories',
      () =>
        prisma.tourCategory.createMany({
          data: f.tourCategories as any,
          skipDuplicates: true,
        }),
    ],
    [
      'destinations',
      () =>
        prisma.destination.createMany({
          data: f.destinations as any,
          skipDuplicates: true,
        }),
    ],
    [
      'tours',
      () =>
        prisma.tour.createMany({ data: f.tours as any, skipDuplicates: true }),
    ],
    [
      'tourDestinations',
      () =>
        prisma.tourDestination.createMany({
          data: f.tourDestinations as any,
          skipDuplicates: true,
        }),
    ],
    [
      'tourItineraryDays',
      () =>
        prisma.tourItineraryDay.createMany({
          data: f.tourItineraryDays as any,
          skipDuplicates: true,
        }),
    ],
    [
      'tourFaqs',
      () =>
        prisma.tourFaq.createMany({
          data: f.tourFaqs as any,
          skipDuplicates: true,
        }),
    ],
    [
      'tourPolicies',
      () =>
        prisma.tourPolicy.createMany({
          data: f.tourPolicies as any,
          skipDuplicates: true,
        }),
    ],
    [
      'tourDepartures',
      () =>
        prisma.tourDeparture.createMany({
          data: f.tourDepartures as any,
          skipDuplicates: true,
        }),
    ],
    [
      'bookings',
      () =>
        prisma.booking.createMany({
          data: f.bookings as any,
          skipDuplicates: true,
        }),
    ],
    [
      'paymentEvents',
      () =>
        prisma.paymentEvent.createMany({
          data: f.paymentEvents as any,
          skipDuplicates: true,
        }),
    ],
    [
      'reviews',
      () =>
        prisma.review.createMany({
          data: f.reviews as any,
          skipDuplicates: true,
        }),
    ],
    [
      'wishlist',
      () =>
        prisma.wishlist.createMany({
          data: f.wishlist as any,
          skipDuplicates: true,
        }),
    ],
    [
      'enquiries',
      () =>
        prisma.enquiry.createMany({
          data: f.enquiries as any,
          skipDuplicates: true,
        }),
    ],
    [
      'posts',
      () =>
        prisma.post.createMany({ data: f.posts as any, skipDuplicates: true }),
    ],
    [
      'outbox',
      () =>
        prisma.outbox.createMany({
          data: f.outbox as any,
          skipDuplicates: true,
        }),
    ],
    [
      'mediaAssets',
      () =>
        prisma.mediaAsset.createMany({
          data: f.mediaAssets as any,
          skipDuplicates: true,
        }),
    ],
    [
      'mediaGarbage',
      () =>
        prisma.mediaGarbage.createMany({
          data: f.mediaGarbage as any,
          skipDuplicates: true,
        }),
    ],
  ];

  console.log('[load-fixtures] inserting sample data...');
  let total = 0;
  for (const [label, run] of steps) {
    const { count } = await run();
    total += count;
    console.log(`  ${label.padEnd(20)} +${count}`);
  }
  console.log(
    `[load-fixtures] done — ${total} rows inserted (duplicates skipped).`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('[load-fixtures] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
