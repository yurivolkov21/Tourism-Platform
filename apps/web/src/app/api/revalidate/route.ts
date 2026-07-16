import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { isValidRevalidateSecret, tourTag } from '../../../lib/revalidate';

// Server-only, uncached: this handler mutates the Data Cache, it is never a read.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * On-demand revalidation endpoint. The NestJS API POSTs here right after a
 * review is (un)approved so the public tour page reflects the change within
 * seconds instead of waiting out the 300s ISR timer (see
 * `docs/06-specs/2026-07-16-review-ondemand-revalidation-design.md`).
 *
 * Guarded by the shared `REVALIDATE_SECRET` (constant-time compare). Unset on
 * the server ⇒ 503 (visible misconfig); bad/missing header ⇒ 401. `revalidateTag`
 * uses `{ expire: 0 }` (immediate expiry) rather than the `'max'`
 * stale-while-revalidate profile: this is a webhook-style trigger where the very
 * next visit must reflect the change (an admin approving then reloading), so we
 * want a blocking cache miss on that request, not one-more-stale-render. The
 * 300s ISR remains the backstop if this call never arrives.
 */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const provided = request.headers.get('x-revalidate-secret');
  if (!isValidRevalidateSecret(provided, expected)) {
    return NextResponse.json(
      { revalidated: false, error: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let slug: unknown;
  try {
    const body = (await request.json()) as { slug?: unknown } | null;
    slug = body?.slug;
  } catch {
    return NextResponse.json(
      { revalidated: false, error: 'INVALID_BODY' },
      { status: 400 },
    );
  }
  if (typeof slug !== 'string' || slug.length === 0) {
    return NextResponse.json(
      { revalidated: false, error: 'MISSING_SLUG' },
      { status: 400 },
    );
  }

  const tag = tourTag(slug);
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
