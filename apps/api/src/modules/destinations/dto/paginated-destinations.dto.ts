import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { DestinationDto } from './destination.dto';

/**
 * Documents the enveloped list response. The `TransformInterceptor` produces
 * `{ data, error: null, meta }`; this type captures `data` + `meta` for Swagger.
 */
export class PaginatedDestinationsDto {
  @ApiProperty({ type: [DestinationDto] })
  data!: DestinationDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
