/**
 * Database seed — loads the committed sample fixtures (`prisma/fixtures`), then
 * overlays a thin layer of functional test scaffolding on top.
 *
 * WHY this shape (Option A, 2026-07-01): the fixtures are a rich, varied,
 * schema-verified dataset (18 models / 369 rows) — the whole catalog + sample
 * users/bookings/reviews. But fixture users have fabricated `supabaseId`s and
 * `@example.com`/`@nexora.travel` emails, so nobody can *log in* as them. This
 * seed therefore:
 *   1. inserts the fixtures (`insertFixtures`), then
 *   2. upserts a known, login-able CUSTOMER (`customer@tourism.test`) + an ADMIN
 *      (email from `ADMIN_EMAILS`), and
 *   3. creates one self-signed PAID booking (`BK-SEEDPAID`) owned by that
 *      customer, so `POST /reviews`, "my bookings", and the e2e suite run without
 *      a live payment.
 *
 * Admin *access* is granted by `ADMIN_EMAILS` + a real Supabase account — the
 * admin row here is a convenience mirror. To act as the customer, register a
 * Supabase account with `customer@tourism.test` (relink-by-email on first login).
 *
 * Idempotent: fixtures use `createMany({ skipDuplicates })`, the overlay upserts,
 * and the PAID booking is created once. For a clean rebuild, TRUNCATE first with
 * `prisma/reset.ts` (⚠️ destructive — it wipes the DB that DIRECT_URL points at,
 * the live Supabase in this repo).
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
  PaymentProvider,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { insertFixtures } from './fixtures/insert';

/** Self-signed PAID booking code (owned by the overlay customer). */
const PAID_BOOKING_CODE = 'BK-SEEDPAID';
/** Attach the PAID booking to this tour when it qualifies; else the soonest qualifying departure. */
const PREFERRED_PAID_TOUR_SLUG = 'hoi-an-walking-tour';
const PAID_SEATS = 2;

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

/**
 * Picks an OPEN departure (on a published tour) with at least `seats` free, to attach the self-signed
 * PAID booking to. Prefers {@link PREFERRED_PAID_TOUR_SLUG} when it qualifies, else the soonest
 * qualifying departure. Prisma can't compare two columns in a `where`, so free seats are filtered in JS.
 */
async function pickPaidDeparture(seats: number) {
  const candidates = await prisma.tourDeparture.findMany({
    where: { status: DepartureStatus.OPEN, tour: { isPublished: true } },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      tourId: true,
      seatsTotal: true,
      seatsBooked: true,
      priceOverride: true,
      tour: { select: { slug: true, basePrice: true, currency: true } },
    },
  });
  const free = candidates.filter((d) => d.seatsTotal - d.seatsBooked >= seats);
  if (free.length === 0) return null;
  return free.find((d) => d.tour.slug === PREFERRED_PAID_TOUR_SLUG) ?? free[0];
}

async function main(): Promise<void> {
  // 1. Data — catalog + sample users/bookings/reviews all come from the fixtures.
  console.log('[seed] loading fixtures...');
  const inserted = await insertFixtures(prisma);
  console.log(
    `[seed] fixtures: ${inserted} rows inserted (duplicates skipped).`,
  );

  // 2. Functional overlay — a known, login-able CUSTOMER + an ADMIN (upsert by email; citext unique).
  const adminEmail =
    process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'admin@tourism.test';
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
    update: { role: UserRole.ADMIN },
  });
  console.log(
    `[seed] overlay users: customer=${customer.email} admin=${admin.email}`,
  );

  // 3. Self-signed PAID booking owned by the overlay customer — write a PAID row directly (no gateway)
  //    + claim seats, so the review flow + "my bookings" + e2e are runnable. Created once; attached to
  //    an OPEN fixture departure with free seats, claimed atomically so it can't overbook.
  const existing = await prisma.booking.findUnique({
    where: { code: PAID_BOOKING_CODE },
    select: { departureId: true, tour: { select: { slug: true } } },
  });
  let paidDepartureId = existing?.departureId ?? '';
  let paidTourSlug = existing?.tour.slug ?? '';
  if (!existing) {
    const departure = await pickPaidDeparture(PAID_SEATS);
    if (!departure) {
      throw new Error(
        '[seed] no OPEN fixture departure with free seats for the PAID booking',
      );
    }
    const unitPrice = departure.priceOverride ?? departure.tour.basePrice; // Prisma.Decimal
    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          code: PAID_BOOKING_CODE,
          userId: customer.id,
          tourId: departure.tourId,
          departureId: departure.id,
          numAdults: PAID_SEATS,
          numChildren: 0,
          totalAmount: unitPrice.mul(PAID_SEATS),
          currency: departure.tour.currency,
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
        data: { seatsBooked: { increment: PAID_SEATS } },
      });
    });
    paidDepartureId = departure.id;
    paidTourSlug = departure.tour.slug;
    console.log(
      `[seed] created PAID booking ${PAID_BOOKING_CODE} on ${paidTourSlug} (${PAID_SEATS} seats)`,
    );
  } else {
    console.log(
      `[seed] PAID booking ${PAID_BOOKING_CODE} already exists — skipped`,
    );
  }

  // 4. Write seeded identifiers for the e2e suite (gitignored; no secrets).
  const outPath = join(__dirname, '..', '.env.e2e');
  const lines = [
    '# Generated by `nx run @tourism/api:seed` — gitignored, no secrets.',
    `E2E_CUSTOMER_ID=${customer.id}`,
    `E2E_CUSTOMER_EMAIL=${customer.email}`,
    `E2E_ADMIN_ID=${admin.id}`,
    `E2E_ADMIN_EMAIL=${admin.email}`,
    `E2E_PAID_BOOKING_CODE=${PAID_BOOKING_CODE}`,
    `E2E_TOUR_SLUG=${paidTourSlug}`,
    `E2E_DEPARTURE_ID=${paidDepartureId}`,
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
