import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Review, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedAdminReviewsDto } from './dto/admin-review.dto';
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
}
