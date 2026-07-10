/**
 * Insert the sample fixtures (./sample-data) into a database in FK-safe order.
 *
 * Shared by the standalone runner (load-fixtures.ts, which owns the connection +
 * the local-DB safety guard) and prisma/seed.ts (which overlays functional test
 * accounts on top). Uses `createMany({ skipDuplicates: true })` so re-running is
 * safe — existing rows by PK/unique are skipped, but note it inserts only and
 * does NOT update changed rows.
 *
 * Parents are inserted before children so every foreign key resolves. The
 * `as any` casts keep the readonly `as const` fixtures assignable to Prisma's
 * CreateMany input types under `--transpile-only`.
 */
import type { PrismaClient } from '@prisma/client';
import * as f from './sample-data';

/**
 * Coerce a bare `YYYY-MM-DD` fixture value to a `Date`. The fixtures store `@db.Date` columns as
 * date-only strings, but Prisma 7's `createMany` rejects those ("Expected ISO-8601 DateTime") — it
 * wants a full datetime or a `Date`. `new Date('2026-07-31')` parses as UTC midnight, so the stored
 * calendar date is unchanged (no timezone drift). Applies to the three `@db.Date` fields in the
 * schema: `TourDeparture.startDate` / `endDate` and the nullable `Enquiry.travelDate`.
 */
const toDate = (value: string | null | undefined): Date | null | undefined =>
  value == null ? value : new Date(value);

export async function insertFixtures(prisma: PrismaClient): Promise<number> {
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
          // @db.Date columns → coerce the date-only strings to Date (see toDate).
          data: (f.tourDepartures as any[]).map((d) => ({
            ...d,
            startDate: toDate(d.startDate),
            endDate: toDate(d.endDate),
          })),
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
          // `travelDate` is a nullable @db.Date → coerce when present.
          data: (f.enquiries as any[]).map((e) => ({
            ...e,
            travelDate: toDate(e.travelDate),
          })),
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

  let total = 0;
  for (const [label, run] of steps) {
    const { count } = await run();
    total += count;
    console.log(`  ${label.padEnd(20)} +${count}`);
  }
  return total;
}
