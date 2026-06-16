import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

/** Response for `POST /bookings/:code/checkout` — the FE redirects to `checkoutUrl`. */
export class CheckoutSessionDto {
  @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_test_...' })
  checkoutUrl!: string;

  @ApiProperty({ example: 'BK-7Q2KX9AB' })
  bookingCode!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  status!: BookingStatus;
}
