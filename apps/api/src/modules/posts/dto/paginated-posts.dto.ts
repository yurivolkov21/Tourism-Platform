import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { PostDto } from './post.dto';

/**
 * Documents the enveloped list response. The `TransformInterceptor` produces
 * `{ data, error: null, meta }`; this type captures `data` + `meta` for Swagger.
 */
export class PaginatedPostsDto {
  @ApiProperty({ type: [PostDto] })
  data!: PostDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
