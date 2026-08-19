/**
 * On-demand revalidation — the single source of the cache-tag taxonomy
 * (spec: docs/06-specs/2026-07-17-generalized-ondemand-revalidation-design.md).
 *
 * Public fetches tag their reads with these values; the API busts the exact tag
 * post-commit via `POST /api/revalidate` the moment content changes, so pages
 * refresh within seconds and the ISR timers become a pure backstop. The API
 * mirrors these strings by contract — change them ONLY in lockstep with
 * `apps/api/src/modules/revalidation/web-revalidation.service.ts`.
 */

/** Static (surface-wide) cache tags. Coarse on purpose — one tag per surface. */
export const TAGS = {
  SITE_MEDIA: 'site-media',
  TOURS: 'tours',
  DESTINATIONS: 'destinations',
  POSTS: 'posts',
  CATEGORIES: 'categories',
  FEATURED_REVIEWS: 'featured-reviews',
  TRUST_STATS: 'trust-stats',
} as const;

const STATIC_TAGS = new Set<string>(Object.values(TAGS));
const MAX_TAG_LENGTH = 200;
const MAX_PATH_LENGTH = 200;

/** Per-tour cache tag, e.g. `tour:ha-long-cruise`. */
export function tourTag(slug: string): string {
  return `tour:${slug}`;
}

/** Per-post cache tag, e.g. `post:street-food-hanoi`. */
export function postTag(slug: string): string {
  return `post:${slug}`;
}

/**
 * Allow-list for incoming tags: the static taxonomy plus `tour:<slug>` /
 * `post:<slug>` with a non-blank slug. Everything else is rejected so the
 * endpoint can't be used to force arbitrary recompute.
 */
export function isAllowedTag(tag: string): boolean {
  if (
    typeof tag !== 'string' ||
    tag.length === 0 ||
    tag.length > MAX_TAG_LENGTH
  )
    return false;
  if (STATIC_TAGS.has(tag)) return true;
  const match = /^(?:tour|post):(.+)$/.exec(tag);
  return match !== null && match[1].trim().length > 0;
}

/** Conservative local-path check (mirrors the `safeRedirect` rules). */
export function isAllowedPath(path: string): boolean {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.length > MAX_PATH_LENGTH
  )
    return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  for (let i = 0; i < path.length; i += 1) {
    if (path.charCodeAt(i) < 0x20) return false;
  }
  return true;
}

export interface RevalidatePayload {
  tags: string[];
  paths: string[];
}

/**
 * Validate + normalise the `/api/revalidate` body. Accepts `{ tags?, paths? }`
 * (and the legacy `{ slug }`, mapped to `tour:<slug>`). STRICT: any invalid tag
 * or path rejects the whole payload (`null` → 400) — a partial bust would hide
 * a misconfigured trigger. Entries are de-duplicated; an empty result is `null`.
 */
export function parseRevalidatePayload(
  body: unknown,
): RevalidatePayload | null {
  if (body === null || typeof body !== 'object') return null;
  const { tags, paths, slug } = body as {
    tags?: unknown;
    paths?: unknown;
    slug?: unknown;
  };

  const outTags: string[] = [];
  const outPaths: string[] = [];

  if (typeof slug === 'string' && slug.length > 0) outTags.push(tourTag(slug));

  if (tags !== undefined) {
    if (!Array.isArray(tags)) return null;
    for (const tag of tags) {
      if (typeof tag !== 'string' || !isAllowedTag(tag)) return null;
      outTags.push(tag);
    }
  }
  if (paths !== undefined) {
    if (!Array.isArray(paths)) return null;
    for (const path of paths) {
      if (typeof path !== 'string' || !isAllowedPath(path)) return null;
      outPaths.push(path);
    }
  }

  const dedupedTags = [...new Set(outTags)];
  const dedupedPaths = [...new Set(outPaths)];
  if (dedupedTags.length === 0 && dedupedPaths.length === 0) return null;
  return { tags: dedupedTags, paths: dedupedPaths };
}

/**
 * Constant-time equality for the shared `REVALIDATE_SECRET`. Returns `false`
 * for any empty/nullish value (an unconfigured server must never match) and for
 * a length mismatch, then compares the remaining characters without an
 * early-exit so a wrong secret can't be timed character-by-character. Pure (no
 * `node:crypto`) so it stays trivially testable and bundler-agnostic.
 */
export function isValidRevalidateSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
