import { Module } from '@nestjs/common';
import { AdminToursController } from './admin-tours.controller';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

/**
 * Tours catalog + admin CRUD. `ToursService` resolves `categorySlug` /
 * `destinationSlugs` to ids directly via Prisma (returning a clear 400 for bad
 * refs), so no sibling-module imports are needed — `PrismaModule` is `@Global`.
 * Departures (P1.4c) and media (P1.6) attach later.
 */
@Module({
  controllers: [ToursController, AdminToursController],
  providers: [ToursService],
  exports: [ToursService],
})
export class ToursModule {}
