import { Module } from '@nestjs/common';
import { AdminTourCategoriesController } from './admin-tour-categories.controller';
import { TourCategoriesController } from './tour-categories.controller';
import { TourCategoriesService } from './tour-categories.service';

/**
 * Tour categories lookup. `TourCategoriesService` is exported for the tours
 * module (P1.4b) to resolve `categorySlug` → id when creating/updating a tour.
 */
@Module({
  controllers: [TourCategoriesController, AdminTourCategoriesController],
  providers: [TourCategoriesService],
  exports: [TourCategoriesService],
})
export class TourCategoriesModule {}
