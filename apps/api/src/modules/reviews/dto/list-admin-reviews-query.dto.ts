import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query string for `GET /admin/reviews` (admin moderation queue). Adds an
 * `isApproved` filter on top of pagination so the admin can isolate the
 * pending-approval backlog (`?isApproved=false`).
 */
export class ListAdminReviewsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** Filter by moderation state; omit for all. */
  @ApiPropertyOptional({
    example: false,
    description: 'true = approved only, false = pending only, omit = all',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isApproved?: boolean;
}
