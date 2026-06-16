import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { TourCategoryDto } from './tour-category.dto';

/**
 * Documents the enveloped list response. The `TransformInterceptor` produces
 * `{ data, error: null, meta }`; this type captures `data` + `meta` for Swagger.
 */
export class PaginatedTourCategoriesDto {
  @ApiProperty({ type: [TourCategoryDto] })
  data!: TourCategoryDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
