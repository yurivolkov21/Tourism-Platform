import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  isValidRevalidateSecret,
  parseRevalidatePayload,
} from '../../../lib/revalidate';

// Server-only, uncached: this handler mutates the Data Cache, it is never a read.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generalized on-demand revalidation endpoint
 * (spec: docs/06-specs/2026-07-17-generalized-ondemand-revalidation-design.md).
 *
 * The NestJS API POSTs `{ tags?: string[], paths?: string[] }` here right after
 * a content mutation commits (tours, posts, site-media, …) so the public pages
 * reflect the change within seconds; the legacy `{ slug }` body still maps to
 * `tour:<slug>`. Tags are validated STRICTLY against the taxonomy allow-list
 * (`parseRevalidatePayload`) — unknown tags reject the whole request (400) so
 * the endpoint can't be used to force arbitrary recompute.
 *
 * Guarded by the shared `REVALIDATE_SECRET` (constant-time compare). Unset on
 * the server ⇒ 503 (visible misconfig); bad/missing header ⇒ 401. Tags expire
 * immediately (`{ expire: 0 }`): this is a webhook-style trigger where the very
 * next visit must reflect the change — the ISR timers remain the backstop.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { revalidated: false, error: 'INVALID_BODY' },
      { status: 400 },
    );
  }
  const payload = parseRevalidatePayload(body);
  if (!payload) {
    return NextResponse.json(
      { revalidated: false, error: 'INVALID_TAGS_OR_PATHS' },
      { status: 400 },
    );
  }

  for (const tag of payload.tags) {
    revalidateTag(tag, { expire: 0 });
  }
  for (const path of payload.paths) {
    revalidatePath(path);
  }
  return NextResponse.json({
    revalidated: true,
    tags: payload.tags,
    paths: payload.paths,
  });
}
