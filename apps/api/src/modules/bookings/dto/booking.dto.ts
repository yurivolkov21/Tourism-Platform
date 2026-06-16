import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, PaymentProvider } from '@prisma/client';

/** Lightweight tour reference embedded on a booking payload (EN-only). */
export class BookingTourRefDto {
  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour' })
  title!: string;
}

/** Lightweight departure reference embedded on a booking payload. */
export class BookingDepartureRefDto {
  @ApiProperty({ format: 'date', example: '2026-08-15' })
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2026-08-18' })
  endDate!: string;
}

/**
 * Response shape for a booking. Money serializes as a decimal string (Prisma
 * `Decimal`). `seatsBooked` on the departure is not reflected here at PENDING —
 * the seat reservation happens at payment confirmation (P1.5b).
 */
export class BookingDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'BK-7Q2KX9AB' })
  code!: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PENDING })
  status!: BookingStatus;

  @ApiProperty({ example: 2 })
  numAdults!: number;

  @ApiProperty({ example: 1 })
  numChildren!: number;

  @ApiProperty({ type: String, example: '99.00' })
  totalAmount!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.STRIPE })
  paymentProvider!: PaymentProvider;

  @ApiProperty({ example: 'Nguyen Van A' })
  contactName!: string;

  @ApiProperty({ example: 'guest@example.com' })
  contactEmail!: string;

  @ApiProperty({ nullable: true, type: String, example: '+84901234567' })
  contactPhone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  specialRequests!: string | null;

  @ApiProperty({ type: BookingTourRefDto })
  tour!: BookingTourRefDto;

  @ApiProperty({ type: BookingDepartureRefDto })
  departure!: BookingDepartureRefDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
