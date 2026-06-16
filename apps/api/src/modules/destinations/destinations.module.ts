import { Module } from '@nestjs/common';
import { AdminDestinationsController } from './admin-destinations.controller';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';

/**
 * Destinations catalog. `DestinationsService` is exported for the tours module
 * (M:N validation) in P1.4b.
 */
@Module({
  controllers: [DestinationsController, AdminDestinationsController],
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
