import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fire-and-forget cross-app cache busting for the public web tour page.
 *
 * The web tour detail page is statically prerendered with a 300s ISR timer, so
 * a freshly (un)approved review would otherwise take up to 5 minutes to show.
 * When moderation changes a review's approval state, {@link ReviewsService}
 * calls this to POST the web on-demand revalidation route
 * (`${FRONTEND_URL}/api/revalidate`, guarded by the shared `REVALIDATE_SECRET`),
 * which busts the `tour:<slug>` cache tag so the change lands within seconds.
 *
 * Best-effort by design: the secret unset ⇒ no-op; any HTTP/transport failure is
 * logged and swallowed (never rethrown) so moderation is never blocked — the
 * 300s ISR timer remains the backstop.
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

  async revalidateTour(slug: string): Promise<void> {
    if (!this.secret) {
      this.logger.debug(
        `REVALIDATE_SECRET unset — skipping web revalidation for tour ${slug}`,
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
        body: JSON.stringify({ slug }),
        // Never let a hung web host stall the caller; the ISR timer backstops us.
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        this.logger.warn(
          `Web revalidation for tour ${slug} failed: HTTP ${res.status}`,
        );
        return;
      }
      this.logger.log(`Revalidated web tour page for ${slug}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`Web revalidation for tour ${slug} errored: ${msg}`);
    }
  }
}
