import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AdminDeparturesController } from './admin-departures.controller';
import { DeparturesController } from './departures.controller';
import { DeparturesService } from './departures.service';

/**
 * Public + admin departure surfaces under one service. Imports
 * `BookingsModule` for `refundByAdmin` — the CANCELLED transition auto-refunds
 * the departure's PAID bookings (API-W2). No cycle: bookings talks to
 * departures via Prisma directly and only imports PaymentsModule.
 */
@Module({
  imports: [BookingsModule],
  controllers: [DeparturesController, AdminDeparturesController],
  providers: [DeparturesService],
  exports: [DeparturesService],
})
export class DeparturesModule {}
