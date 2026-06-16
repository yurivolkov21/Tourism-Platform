import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { TourSummaryDto } from './tour-summary.dto';

/**
 * Documents the enveloped list response. The `TransformInterceptor` produces
 * `{ data, error: null, meta }`; this type captures `data` (lean summaries) +
 * `meta` for Swagger.
 */
export class PaginatedToursDto {
  @ApiProperty({ type: [TourSummaryDto] })
  data!: TourSummaryDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
