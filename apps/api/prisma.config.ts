import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 config (ported from donor).
 *
 * Connection URLs:
 * - Runtime (`PrismaClient`):      DATABASE_URL — Supabase pooler (port 6543), via PrismaPg adapter.
 * - Migrations (`prisma migrate`): DIRECT_URL — Supabase direct (port 5432).
 *
 * Prisma 7 dropped the schema-level `url`/`directUrl`; the migration engine reads
 * the datasource url below. Actual `migrate` runs once creds land (D-P1.6).
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    // ts-node transpiles in-memory; seed lands in P1.8.
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
