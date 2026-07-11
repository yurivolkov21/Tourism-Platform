import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { BookingDto } from './booking.dto';

/** Page meta for the admin bookings list — adds per-status tab counts. */
export class BookingsPageMetaDto extends PageMetaDto {
  @ApiPropertyOptional({
    description:
      'Per-status totals within the current scope (minus the status filter) — for tab badges. Omitted if the count query fails.',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      PENDING: 2,
      PAID: 14,
      CANCELLED: 1,
      REFUNDED: 0,
      PARTIALLY_REFUNDED: 0,
    },
  })
  statusCounts?: Record<BookingStatus, number>;
}

/**
 * Documents the enveloped admin-bookings list response. The `TransformInterceptor`
 * turns the service's `{ items, meta }` into `{ data, error: null, meta }`; this
 * type captures `data` + `meta` for Swagger.
 */
export class PaginatedBookingsDto {
  @ApiProperty({ type: [BookingDto] })
  data!: BookingDto[];

  @ApiProperty({ type: BookingsPageMetaDto })
  meta!: BookingsPageMetaDto;
}
