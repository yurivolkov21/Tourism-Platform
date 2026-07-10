import { ApiProperty } from '@nestjs/swagger';
import { TourSummaryDto } from '../../tours/dto/tour-summary.dto';
import { PostDto } from './post.dto';

/**
 * Public post detail (`GET /posts/:slug`) — the shared `PostDto` + the admin-picked related
 * tours as full catalog summaries (published only, pick order), ready for tour cards.
 */
export class PostDetailDto extends PostDto {
  @ApiProperty({
    type: [TourSummaryDto],
    description: 'Published related tours, pick order.',
  })
  relatedTours!: TourSummaryDto[];
}
