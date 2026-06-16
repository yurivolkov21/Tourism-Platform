import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepartureStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Request body for `POST /admin/tours/:slug/departures`. `tourId` is NOT in the
 * body — derived from the URL `:slug` (service resolves slug → tour.id).
 *
 * Dates are strict ISO-8601 (`YYYY-MM-DD`); the DB column is `@db.Date`. The
 * `endDate >= startDate` rule is enforced in the service (single source of
 * truth, easy to unit-test). `seatsBooked` is **never** accepted from clients —
 * it's owned by the booking flow (P1.5); a client-settable counter would make
 * seat oversell trivial.
 */
export class CreateDepartureDto {
  @ApiProperty({ example: '2026-08-15', description: 'ISO 8601 date' })
  @IsISO8601({ strict: true })
  startDate!: string;

  @ApiProperty({ example: '2026-08-18', description: 'ISO 8601 date' })
  @IsISO8601({ strict: true })
  endDate!: string;

  /** Total capacity. Lower bound 1, upper bound 1000 to prevent abuse. */
  @ApiProperty({ example: 15, minimum: 1, maximum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  seatsTotal!: number;

  /**
   * Optional override on the tour's `basePrice`. Omitted/null = tour base price
   * applies. Decimal(12,2).
   */
  @ApiPropertyOptional({ example: 59.0, minimum: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number | null;

  /**
   * Optional strike-through anchor for this departure (D-P1.3). Decimal(12,2).
   */
  @ApiPropertyOptional({ example: 79.0, minimum: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number | null;

  @ApiPropertyOptional({ enum: DepartureStatus, default: DepartureStatus.OPEN })
  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;
}
