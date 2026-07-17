import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cache-tag strings shared with the web app BY CONTRACT — the single source of
 * truth is `apps/web/src/lib/revalidate.ts` (`TAGS` + `tourTag`/`postTag`).
 * Change values only in lockstep with that module.
 */
export const WEB_TAGS = {
  SITE_MEDIA: 'site-media',
  TOURS: 'tours',
  DESTINATIONS: 'destinations',
  POSTS: 'posts',
  CATEGORIES: 'categories',
  FEATURED_REVIEWS: 'featured-reviews',
  TRUST_STATS: 'trust-stats',
} as const;

/** Per-tour cache tag, e.g. `tour:ha-long-cruise` (web contract). */
export function webTourTag(slug: string): string {
  return `tour:${slug}`;
}

/** Per-post cache tag, e.g. `post:street-food-hanoi` (web contract). */
export function webPostTag(slug: string): string {
  return `post:${slug}`;
}

/**
 * Fire-and-forget cross-app cache busting for the public web
 * (spec: docs/06-specs/2026-07-17-generalized-ondemand-revalidation-design.md).
 *
 * Public pages tag their fetches; when content mutates, the owning service calls
 * {@link revalidateTags} AFTER its DB commit and the web's `POST /api/revalidate`
 * busts exactly those tags, so changes show within seconds. The page ISR timers
 * (≤300s) remain the backstop.
 *
 * Best-effort by design: the secret unset ⇒ no-op; any HTTP/transport failure is
 * logged and swallowed (never rethrown) — a revalidation problem must NEVER
 * affect the mutation that triggered it (money-path safety).
 */
@Injectable()
export class WebRevalidationService {
  private readonly logger = new Logger(WebRevalidationService.name);
  private readonly frontendUrl: string;
  private readonly secret: string | undefined;

  constructor(config: ConfigService) {
    // FRONTEND_URL is boot-validated (Joi, required) — same origin the outbox
    // builds CTA links from. Strip any trailing slash once.
    this.frontendUrl = config
      .getOrThrow<string>('app.frontendUrl')
      .replace(/\/+$/, '');
    this.secret = config.get<string>('revalidate.secret') || undefined;
  }

  /** Bust one tour's detail/reviews cache (thin wrapper kept for the review flow). */
  async revalidateTour(slug: string): Promise<void> {
    return this.revalidateTags([webTourTag(slug)]);
  }

  async revalidateTags(tags: string[]): Promise<void> {
    if (tags.length === 0) return;
    if (!this.secret) {
      this.logger.debug(
        `REVALIDATE_SECRET unset — skipping web revalidation for [${tags.join(', ')}]`,
      );
      return;
    }
    try {
      const res = await fetch(`${this.frontendUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': this.secret,
        },
        body: JSON.stringify({ tags }),
        // Never let a hung web host stall the caller; the ISR timer backstops us.
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        this.logger.warn(
          `Web revalidation for [${tags.join(', ')}] failed: HTTP ${res.status}`,
        );
        return;
      }
      this.logger.log(`Revalidated web tags [${tags.join(', ')}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(
        `Web revalidation for [${tags.join(', ')}] errored: ${msg}`,
      );
    }
  }
}
