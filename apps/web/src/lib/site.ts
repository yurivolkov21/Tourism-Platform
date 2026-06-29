/**
 * Canonical site origin, used for metadataBase, canonical URLs, sitemap, robots, and JSON-LD.
 *
 * Resolution order (server-side):
 *  1. NEXT_PUBLIC_SITE_URL — set this to a custom domain once one is bought.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel injects the stable production host automatically.
 *  3. localhost — local dev fallback.
 *
 * Always returns an absolute origin with no trailing slash.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = explicit || (vercel ? `https://${vercel}` : 'http://localhost:3001');
  return raw.replace(/\/+$/, '');
}

export const SITE_URL = resolveSiteUrl();

/** Joins a path onto the site origin, guaranteeing a single leading slash. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
