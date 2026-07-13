import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepartureStatus } from '@prisma/client';

/** One booking the cancellation pass could not refund (stays PAID). */
export class DepartureCancellationFailureDto {
  @ApiProperty({ example: 'BK-2047' })
  code!: string;

  @ApiProperty({ example: 'Provider refund failed: network error' })
  message!: string;
}

/**
 * Outcome of the auto-refund pass a `status: CANCELLED` PATCH runs (API-W2).
 * Present only on the response of the PATCH that performed the transition.
 */
export class DepartureCancellationSummaryDto {
  @ApiProperty({ description: 'PAID bookings the pass attempted', example: 4 })
  paidTotal!: number;

  @ApiProperty({ example: 3 })
  refunded!: number;

  @ApiProperty({
    type: [String],
    description: 'PARTIALLY_REFUNDED bookings left for manual follow-up',
    example: ['BK-1201'],
  })
  skipped!: string[];

  @ApiProperty({ type: [DepartureCancellationFailureDto] })
  failed!: DepartureCancellationFailureDto[];
}

/**
 * Response shape for a tour departure. Money fields serialize as decimal strings
 * (Prisma `Decimal`); `null` = use the tour's `basePrice`. `seatsBooked` is
 * read-only here (mutated only by the booking flow, P1.5).
 */
export class DepartureDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ format: 'date', example: '2026-08-15' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  endDate!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '59.00',
    description: 'Decimal string; null = use tour basePrice',
  })
  priceOverride!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '79.00',
    description: 'Decimal string compare-at anchor; null = none',
  })
  compareAtPrice!: string | null;

  @ApiProperty({ example: 15 })
  seatsTotal!: number;

  @ApiProperty({ example: 0 })
  seatsBooked!: number;

  @ApiProperty({ enum: DepartureStatus, example: DepartureStatus.OPEN })
  status!: DepartureStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: DepartureCancellationSummaryDto,
    description:
      'Only on the admin PATCH response that flipped the departure to CANCELLED (API-W2)',
  })
  cancellation?: DepartureCancellationSummaryDto;
}
