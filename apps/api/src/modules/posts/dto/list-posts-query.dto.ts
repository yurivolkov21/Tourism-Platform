import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PostStatus } from '@prisma/client';

/**
 * Query for `GET /posts` (public) and the admin variant. Public forces
 * `status: PUBLISHED` + `publishedAt <= now`; `status` here is honoured only by
 * the admin endpoint. Default sort = newest published first.
 */
export class ListPostsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 12;

  /** Case-insensitive `title` search; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'hoi an', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  /** Honoured only by the admin endpoint (public forces PUBLISHED). */
  @ApiPropertyOptional({ enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    enum: ['publishedAt', 'createdAt', 'updatedAt', 'title'],
    default: 'publishedAt',
  })
  @IsOptional()
  @IsIn(['publishedAt', 'createdAt', 'updatedAt', 'title'])
  sortBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'title' = 'publishedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
