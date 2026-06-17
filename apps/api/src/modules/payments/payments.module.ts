import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayPalService } from './paypal.service';
import { StripeService } from './stripe.service';

/**
 * Payment gateways (Stripe + PayPal). The SDK wrappers + `PaymentsService` (webhook
 * brain + the shared `claimSeatsForPaid`) are exported so the bookings module can
 * mint sessions/orders, capture, refund, and reserve seats. `PaymentsController`
 * receives both providers' webhooks. `PaymentsService` talks to Prisma directly —
 * no BookingsService dependency, so Bookings→Payments stays a one-way edge.
 */
@Module({
  controllers: [PaymentsController],
  providers: [StripeService, PayPalService, PaymentsService],
  exports: [StripeService, PayPalService, PaymentsService],
})
export class PaymentsModule {}
