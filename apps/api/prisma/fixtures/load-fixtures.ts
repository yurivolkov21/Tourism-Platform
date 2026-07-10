/**
 * Load the sample fixtures (./sample-data) into the database — standalone runner.
 *
 * Owns the connection + a local-DB safety guard; the actual FK-safe inserts live
 * in ./insert (`insertFixtures`), shared with prisma/seed.ts. PrismaPg adapter,
 * prefers DIRECT_URL (Supabase direct 5432) and falls back to DATABASE_URL.
 * `createMany({ skipDuplicates: true })` → re-running is safe (existing rows by
 * PK/unique are skipped; note it inserts only, it does NOT update changed rows).
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
import { insertFixtures } from './insert';

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
const isLocalDb = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(
  connectionString,
);
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
  console.log('[load-fixtures] inserting sample data...');
  const total = await insertFixtures(prisma);
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
