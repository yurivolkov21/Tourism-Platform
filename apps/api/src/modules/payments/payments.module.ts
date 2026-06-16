import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

/**
 * Payment gateways. `StripeService` (thin SDK wrapper) is exported so the
 * bookings module can mint Checkout sessions + issue refunds. `PaymentsController`
 * is the Stripe webhook receiver; `PaymentsService` is its idempotent brain
 * (talks to Prisma directly — no BookingsService dependency, so no import cycle).
 * PayPal joins here in P1.5c.
 */
@Module({
  controllers: [PaymentsController],
  providers: [StripeService, PaymentsService],
  exports: [StripeService],
})
export class PaymentsModule {}
