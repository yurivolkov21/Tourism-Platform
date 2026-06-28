import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Review, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { FeaturedReviewsDto } from './dto/featured-review.dto';
import { ReviewDto } from './dto/review.dto';
import { FeaturedReview, ReviewsService } from './reviews.service';

/**
 * Customer review surface mounted at `/reviews`. Public read of approved reviews
 * lives under `GET /tours/:slug/reviews`; admin moderation under `/admin/reviews`.
 */
@ApiTags('Reviews')
@ApiBearerAuth('supabase-jwt')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured testimonials for the homepage' })
  @ApiOkResponse({ type: FeaturedReviewsDto, description: 'Approved + featured reviews' })
  featured(): Promise<FeaturedReview[]> {
    // Plain array → the transform interceptor envelopes it as `{ data: [...], error: null }`.
    return this.reviewsService.findFeatured();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a review for one of caller's PAID bookings" })
  @ApiCreatedResponse({ type: ReviewDto, description: 'Created (pending approval)' })
  @ApiResponse({ status: 400, description: 'Booking not PAID' })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 403, description: 'Not the owner of the booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking already has a review' })
  create(
    @CurrentUser() user: User | null,
    @Body() body: CreateReviewDto,
  ): Promise<Review> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before submitting a review',
      });
    }
    return this.reviewsService.createForCustomer(user.id, body);
  }
}
