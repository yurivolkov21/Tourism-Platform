import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Request body for `POST /bookings`. The booking owner (`userId`) comes from the
 * JWT `sub`, never the body. Contact details ARE in the body — the buyer may book
 * on behalf of someone else (agent for client, parent for child).
 *
 * Server-controlled (NOT in this DTO): `userId` (JWT), `totalAmount` (computed),
 * `currency` (tour), `code` (generated), `status` (always PENDING on create),
 * `seatsBooked` delta (applied at payment confirmation — P1.5b).
 */
export class CreateBookingDto {
  @ApiProperty({
    example: 'hoi-an-walking-tour',
    description: 'Slug of an existing published tour (kebab-case).',
  })
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'tourSlug must be kebab-case' })
  tourSlug!: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID of a departure under the tour. Must be OPEN.',
  })
  @IsUUID()
  departureId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  numAdults!: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 20, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  numChildren?: number;

  /**
   * Payment rail the buyer intends to use (ADR-0006). Stored at create; the
   * checkout session is minted in P1.5b (Stripe) / P1.5c (PayPal).
   */
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  @IsEnum(PaymentProvider)
  paymentProvider!: PaymentProvider;

  @ApiProperty({ example: 'Nguyen Van A', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  contactName!: string;

  /** Booking confirmation + voucher go to this email. */
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @MaxLength(200)
  contactEmail!: string;

  /** Looser than `users.phone` — agents paste numbers with spaces/extensions. */
  @ApiPropertyOptional({ example: '+84901234567', minLength: 6, maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(6, 30)
  contactPhone?: string;

  /** Free-form notes for the operator (dietary, mobility, …). */
  @ApiPropertyOptional({ example: 'Vegetarian meals for one adult.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialRequests?: string;
}
