import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminDestinationsController } from './admin-destinations.controller';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';

/**
 * Destinations catalog. Imports `MediaModule` (P1.6) for media sync/attach.
 * `DestinationsService` is exported for the tours module (M:N validation, P1.4b).
 */
@Module({
  imports: [MediaModule],
  controllers: [DestinationsController, AdminDestinationsController],
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
