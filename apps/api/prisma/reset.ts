/**
 * Database reset — TRUNCATE every application table back to empty, for
 * "test from zero" manual runs (you rebuild every row yourself via the API).
 *
 * Keeps intact: the schema, RLS policies, extensions, and the pg-boss job
 * schema. Does **NOT** touch Supabase Auth accounts — those live in the `auth`
 * schema (managed by Supabase), not here — so your customer/admin logins
 * survive a reset; only their local `users` mirror row is cleared (re-created
 * on the next `/auth/sync`).
 *
 * Run:  pnpm nx run @tourism/api:reset
 * Targets DIRECT_URL (Supabase direct 5432), like the migration engine + seed.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error(
    '[reset] missing DIRECT_URL (preferred) or DATABASE_URL in environment',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Every `@@map` table in schema.prisma. FK order is irrelevant — CASCADE.
const TABLES = [
  'users',
  'tour_categories',
  'destinations',
  'tours',
  'tour_destinations',
  'tour_itinerary_days',
  'tour_departures',
  'tour_faqs',
  'tour_policies',
  'bookings',
  'cancellation_requests',
  'reviews',
  'wishlist',
  'payment_events',
  'enquiries',
  'enquiry_notes',
  'subscribers',
  'media_assets',
  'site_media_slots',
  'outbox',
  'media_garbage',
  'posts',
  'post_tags',
  'post_tag_links',
  'post_tours',
] as const;

async function main(): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
  console.log(`[reset] truncated ${TABLES.length} tables → database is empty.`);
  console.log(
    '[reset] kept: schema/RLS, pg-boss queue, and Supabase Auth accounts.',
  );
}

main()
  .catch((err: unknown) => {
    console.error('[reset] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
