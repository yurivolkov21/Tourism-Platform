import { Module } from '@nestjs/common';
import { AdminDeparturesController } from './admin-departures.controller';
import { DeparturesController } from './departures.controller';
import { DeparturesService } from './departures.service';

/**
 * Public + admin departure surfaces under one service. `DeparturesService` is
 * exported so the bookings module (P1.5) can read/lock `seatsTotal`/`seatsBooked`
 * and increment under transaction when creating bookings.
 */
@Module({
  controllers: [DeparturesController, AdminDeparturesController],
  providers: [DeparturesService],
  exports: [DeparturesService],
})
export class DeparturesModule {}
