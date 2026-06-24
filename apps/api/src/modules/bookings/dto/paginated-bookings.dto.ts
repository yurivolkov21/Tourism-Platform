import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { BookingDto } from './booking.dto';

/**
 * Documents the enveloped admin-bookings list response. The `TransformInterceptor`
 * turns the service's `{ items, meta }` into `{ data, error: null, meta }`; this
 * type captures `data` + `meta` for Swagger.
 */
export class PaginatedBookingsDto {
  @ApiProperty({ type: [BookingDto] })
  data!: BookingDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
