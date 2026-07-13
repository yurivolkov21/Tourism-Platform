/**
 * One-off updater — pushes the long-form article bodies from
 * `fixtures/post-content.cjs` onto the live `posts` rows by slug, without
 * touching the schema or truncating anything.
 *
 * WHY this exists (2026-07-13, blog content enrichment): the fixtures are
 * regenerated from `fixtures/gen.cjs` (which now sources `content` /
 * `metaTitle` / `metaDescription` from `post-content.cjs`), but a fresh
 * `node gen.cjs` run only rewrites `sample-data.ts` + `json/*.json` — it does
 * NOT touch a database that was already seeded. This script closes that gap
 * for an environment that already has the 10 fixture posts loaded: run it
 * once after a content update to bring the live rows in line with the
 * fixtures, without a destructive reset + reseed.
 *
 * Idempotent: re-running just re-applies the same content. Skips (does not
 * throw) any slug in post-content.cjs that has no matching row in the
 * database — useful for partial/dev databases that haven't loaded every
 * fixture post. Does NOT touch `title` / `excerpt` (already good copy per
 * docs/06-specs/2026-07-13-blog-content-enrichment-design.md) or `status`.
 *
 * Run:  pnpm nx run @tourism/api:refresh-posts
 * Targets DIRECT_URL (Supabase direct 5432), like reset.ts / seed.ts.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postContent = require('./fixtures/post-content.cjs') as Record<
  string,
  { content: string; metaTitle: string; metaDescription: string }
>;

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
if (!connectionString) {
  throw new Error(
    '[refresh-post-content] missing DIRECT_URL (preferred) or DATABASE_URL in environment',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
  );
}

async function main(): Promise<void> {
  const slugs = Object.keys(postContent);
  let updated = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const { content, metaTitle, metaDescription } = postContent[slug];
    try {
      await prisma.post.update({
        where: { slug },
        data: { content, metaTitle, metaDescription },
      });
      updated++;
      console.log(`[refresh-post-content] updated  ${slug}`);
    } catch (err) {
      if (isRecordNotFound(err)) {
        skipped++;
        console.log(`[refresh-post-content] skipped (not in DB)  ${slug}`);
        continue;
      }
      throw err;
    }
  }

  console.log(
    `[refresh-post-content] done — ${updated} updated, ${skipped} skipped, ${slugs.length} total.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error('[refresh-post-content] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
