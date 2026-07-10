import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, PaymentProvider } from '@prisma/client';
import { CancellationRequestSummaryDto } from '../../cancellations/dto/cancellation-request.dto';
import { BookingDepartureRefDto, BookingDto } from './booking.dto';

/** The admin user who issued a refund — shown in the detail refund-audit panel. */
export class RefundedByDto {
  @ApiProperty({ nullable: true, type: String, example: 'Jane Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;
}

/** Cancellation-request summary + id — admin detail can deep-link to the queue row. */
export class AdminCancellationRequestSummaryDto extends CancellationRequestSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

/** Departure ref + capacity (admin detail only — the public ref has no seat data). */
export class AdminBookingDepartureRefDto extends BookingDepartureRefDto {
  @ApiProperty({ example: 12 })
  seatsTotal!: number;

  @ApiProperty({ example: 7 })
  seatsBooked!: number;
}

/** The customer ACCOUNT behind the booking (vs. the contact snapshot fields). */
export class BookingCustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Jane Doe' })
  fullName!: string | null;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Account created — "customer since".',
  })
  createdAt!: string;
}

/** Another booking by the same customer — detail mini-list row. */
export class OtherBookingItemDto {
  @ApiProperty({ example: 'BK-7Q2KX9AB' })
  code!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: 'Mekong Delta Day Trip' })
  tourTitle!: string;

  @ApiProperty({ type: String, example: '150.00' })
  totalAmount!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

/** The customer's other bookings — capped preview + true total. */
export class OtherBookingsDto {
  @ApiProperty({
    example: 7,
    description: 'Total OTHER bookings (current one excluded).',
  })
  total!: number;

  @ApiProperty({
    type: [OtherBookingItemDto],
    description: 'Newest first, at most 5.',
  })
  items!: OtherBookingItemDto[];
}

/**
 * Webhook event linked to this booking — metadata only (the raw payload holds
 * provider payment data and is deliberately not exposed). `processedAt` null =
 * the handler never finished (received but processing crashed mid-flight).
 */
export class PaymentEventSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ example: 'checkout.session.completed' })
  type!: string;

  @ApiProperty({
    example: 'evt_1PabcXYZ',
    description: 'Provider-side event id.',
  })
  eventId!: string;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  processedAt!: string | null;
}

/**
 * Admin-only booking detail (`GET /admin/bookings/:code`). Extends the shared
 * `BookingDto` with lifecycle timestamps, payment references, the refund audit,
 * the customer account + their other bookings, departure capacity, and the
 * webhook event trail — fields deliberately kept OFF the customer-facing
 * `BookingDto` so they never reach `/bookings/me`.
 */
export class AdminBookingDetailDto extends BookingDto {
  @ApiProperty({ type: AdminBookingDepartureRefDto })
  declare departure: AdminBookingDepartureRefDto;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paidAt!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  cancelledAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Captured charge/order id at the payment gateway (Stripe PaymentIntent / PayPal capture).',
    example: 'pi_3QabcXYZ',
  })
  providerPaymentId!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Checkout session / PayPal order id minted at checkout start (pre-capture reference).',
    example: 'cs_test_a1B2c3',
  })
  providerSessionId!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Customer cancelled within the free window',
  })
  refundReason!: string | null;

  @ApiProperty({ nullable: true, type: RefundedByDto })
  refundedBy!: RefundedByDto | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  refundedAt!: string | null;

  @ApiProperty({ nullable: true, type: AdminCancellationRequestSummaryDto })
  declare cancellationRequest: AdminCancellationRequestSummaryDto | null;

  @ApiProperty({ type: BookingCustomerDto })
  customer!: BookingCustomerDto;

  @ApiProperty({ type: OtherBookingsDto })
  otherBookings!: OtherBookingsDto;

  @ApiProperty({ type: [PaymentEventSummaryDto] })
  paymentEvents!: PaymentEventSummaryDto[];
}
