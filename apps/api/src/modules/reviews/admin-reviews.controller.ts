import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Review, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedAdminReviewsDto } from './dto/admin-review.dto';
import { CreateCuratedReviewDto } from './dto/create-curated-review.dto';
import { FeatureReviewDto } from './dto/feature-review.dto';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews-query.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewDto } from './dto/review.dto';
import {
  PaginatedAdminReviews,
  ReviewsService,
} from './reviews.service';

/**
 * Admin review surface mounted at `/admin/reviews` — moderation queue (list with
 * optional `isApproved` filter) + per-review approve/re-draft toggle.
 *
 * Auth: verified Supabase JWT + `role === ADMIN` (`RolesGuard` enforces `@Roles`).
 */
@ApiTags('Admin / Reviews')
@ApiBearerAuth('supabase-jwt')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List reviews for moderation (paginated, filterable)' })
  @ApiOkResponse({ type: PaginatedAdminReviewsDto, description: 'Paginated reviews' })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  list(
    @Query() query: ListAdminReviewsQueryDto,
  ): Promise<PaginatedAdminReviews> {
    return this.reviewsService.findAllForAdmin(query);
  }

  @Patch(':id/moderation')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or re-draft a review (admin)' })
  @ApiOkResponse({ type: ReviewDto, description: 'Updated review row' })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  moderate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ModerateReviewDto,
  ): Promise<Review> {
    return this.reviewsService.moderateById(id, body.isApproved);
  }

  @Patch(':id/feature')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pin/unpin a review on the homepage carousel' })
  @ApiOkResponse({ type: ReviewDto, description: 'Updated review row' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  feature(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: FeatureReviewDto,
  ): Promise<Review> {
    return this.reviewsService.setFeatured(id, body.isFeatured);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a curated testimonial (verified reviews are protected)' })
  @ApiOkResponse({ type: ReviewDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 409, description: 'Not a curated review' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<Review> {
    return this.reviewsService.deleteCuratedById(id);
  }

  @Post('curated')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a curated testimonial (no booking)' })
  @ApiCreatedResponse({ type: ReviewDto, description: 'Created (approved + featured)' })
  createCurated(@Body() body: CreateCuratedReviewDto): Promise<Review> {
    return this.reviewsService.createCurated(body);
  }
}
