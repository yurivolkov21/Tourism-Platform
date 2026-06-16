import { ApiProperty } from '@nestjs/swagger';
import { DepartureStatus } from '@prisma/client';

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
}
