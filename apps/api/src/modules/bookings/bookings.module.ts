import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

/**
 * Customer bookings (P1.5a — lifecycle up to payment). `BookingsService` is
 * exported so the payments module (P1.5b/c) can confirm a booking + reserve
 * seats on `checkout.session.completed` / PayPal capture.
 */
@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
