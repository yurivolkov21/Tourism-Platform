import { Module } from '@nestjs/common';
import { AdminReviewsController } from './admin-reviews.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { WebRevalidationService } from './web-revalidation.service';

/**
 * Reviews module — customer create (`POST /reviews`), public approved list
 * (`GET /tours/:slug/reviews`), and admin moderation (`/admin/reviews`). Exports
 * the service so the future admin-stats aggregator (P1.7c) can reuse it.
 */
@Module({
  controllers: [
    ReviewsController,
    PublicReviewsController,
    AdminReviewsController,
  ],
  providers: [ReviewsService, WebRevalidationService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
