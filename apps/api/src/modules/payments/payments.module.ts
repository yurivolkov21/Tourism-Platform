import { Module } from '@nestjs/common';
import { AdminPaymentEventsController } from './admin-payment-events.controller';
import { AdminPaymentEventsService } from './admin-payment-events.service';
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
  controllers: [PaymentsController, AdminPaymentEventsController],
  providers: [
    StripeService,
    PayPalService,
    PaymentsService,
    AdminPaymentEventsService,
  ],
  exports: [StripeService, PayPalService, PaymentsService],
})
export class PaymentsModule {}
