import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

/**
 * Customer bookings. Imports `PaymentsModule` for `StripeService` (checkout +
 * refund). `BookingsService` is exported so the payments webhook (P1.5b) can be
 * tested against it; the webhook itself talks to Prisma directly (no cycle).
 */
@Module({
  imports: [PaymentsModule],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
