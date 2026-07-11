import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { ToBoolean } from '../../../common/to-boolean';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query string for `GET /admin/reviews` (admin moderation queue). Adds
 * moderation (`isApproved`), `source`, `rating`, and free-text `search`
 * filters on top of pagination so the whole list is server-driven.
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
  @ToBoolean()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ enum: ReviewSource })
  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  /** Free-text search across author name, title, and body (case-insensitive). */
  @ApiPropertyOptional({ example: 'lantern', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
