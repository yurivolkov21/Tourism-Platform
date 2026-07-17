import { Global, Module } from '@nestjs/common';
import { WebRevalidationService } from './web-revalidation.service';

/**
 * Cross-app web cache revalidation (spec:
 * docs/06-specs/2026-07-17-generalized-ondemand-revalidation-design.md).
 * `@Global()` on purpose: every content-mutating module (tours, departures,
 * posts, destinations, categories, site-media, reviews) fires post-commit tag
 * busts, so the provider is app-wide rather than re-imported seven times.
 */
@Global()
@Module({
  providers: [WebRevalidationService],
  exports: [WebRevalidationService],
})
export class RevalidationModule {}
