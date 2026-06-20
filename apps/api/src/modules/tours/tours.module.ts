import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminToursController } from './admin-tours.controller';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

/**
 * Tours catalog + admin CRUD. Imports `MediaModule` (P1.6) for media sync/attach.
 * `ToursService` resolves `categorySlug` / `destinationSlugs` to ids directly via
 * Prisma (clear 400 for bad refs); `PrismaModule` is `@Global`.
 */
@Module({
  imports: [MediaModule],
  controllers: [ToursController, AdminToursController],
  providers: [ToursService],
  exports: [ToursService],
})
export class ToursModule {}
