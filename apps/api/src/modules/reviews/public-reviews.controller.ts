import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { PaginatedPublicReviewsDto } from './dto/public-review.dto';
import {
  PaginatedPublicReviews,
  ReviewsService,
} from './reviews.service';

/**
 * Public read surface for approved reviews on one tour. Mounted at
 * `/tours/:slug/reviews` so the marketing FE fetches it with the same slug it
 * already has for the tour detail. The service strips PII; drafts never appear.
 */
@ApiTags('Reviews (Public)')
@Controller('tours/:slug/reviews')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved reviews for a tour (paginated)' })
  @ApiOkResponse({
    type: PaginatedPublicReviewsDto,
    description: 'Paginated approved reviews + average rating',
  })
  @ApiResponse({ status: 404, description: 'Tour slug not found or unpublished' })
  list(
    @Param('slug') slug: string,
    @Query() query: ListReviewsQueryDto,
  ): Promise<PaginatedPublicReviews> {
    return this.reviewsService.findApprovedForTour(slug, query);
  }
}
