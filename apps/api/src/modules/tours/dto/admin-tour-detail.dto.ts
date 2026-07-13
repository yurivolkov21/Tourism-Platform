import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TourDetailDto } from './tour.dto';

/** Commercial signals for one tour — admin detail only. */
export class TourOpsDto {
  @ApiProperty({ example: 30, description: 'All bookings ever, any status' })
  bookingsTotal!: number;

  @ApiProperty({ example: 24 })
  bookingsPaid!: number;

  @ApiProperty({
    example: '4500.00',
    description: 'Sum of PAID totals (string Decimal)',
  })
  revenue!: string;

  @ApiProperty({ example: 42 })
  wishlistCount!: number;

  @ApiProperty({ example: 7 })
  enquiriesCount!: number;
}

/**
 * Admin-only tour detail (`GET /admin/tours/:slug`) — the enriched `TourDetailDto` plus
 * commercial ops aggregates. Public tour reads stay ops-free. Mirrors `AdminPostDetailDto`.
 */
export class AdminTourDetailDto extends TourDetailDto {
  @ApiProperty({ type: TourOpsDto })
  ops!: TourOpsDto;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: '19.50',
    description:
      'Per-traveller internal cost (API-W3) — admin-only; public reads strip it',
  })
  costPrice?: string | null;
}
