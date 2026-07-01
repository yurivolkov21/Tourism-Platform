import { ApiProperty } from '@nestjs/swagger';
import { BookingDto } from './booking.dto';

/** The admin user who issued a refund — shown in the detail refund-audit panel. */
export class RefundedByDto {
  @ApiProperty({ nullable: true, type: String, example: 'Jane Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;
}

/**
 * Admin-only booking detail (`GET /admin/bookings/:code`). Extends the shared
 * `BookingDto` with lifecycle timestamps, the captured payment reference, and the
 * refund audit — fields deliberately kept OFF the customer-facing `BookingDto` so
 * they never reach `/bookings/me`.
 */
export class AdminBookingDetailDto extends BookingDto {
  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paidAt!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  cancelledAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Captured charge/order id at the payment gateway (Stripe PaymentIntent / PayPal capture).',
    example: 'pi_3QabcXYZ',
  })
  providerPaymentId!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Customer cancelled within the free window' })
  refundReason!: string | null;

  @ApiProperty({ nullable: true, type: RefundedByDto })
  refundedBy!: RefundedByDto | null;
}
