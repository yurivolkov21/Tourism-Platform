import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query string for `GET /tour-categories` (public) and the admin variant. All
 * optional; the global ValidationPipe coerces `?page=2` to a number. `@Type`
 * makes coercion explicit so it also holds in unit tests. Default sort is the
 * lookup display order (`order` asc) — matches the `(isActive, order)` index.
 */
export class ListTourCategoriesQueryDto {
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

  /** Case-insensitive `name` search; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'adventure', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /** Honoured only by the admin endpoint (public forces `isActive: true`). */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** Whitelisted sort key (prevents arbitrary orderBy injection). */
  @ApiPropertyOptional({
    enum: ['order', 'name', 'createdAt', 'updatedAt'],
    default: 'order',
  })
  @IsOptional()
  @IsIn(['order', 'name', 'createdAt', 'updatedAt'])
  sortBy?: 'order' | 'name' | 'createdAt' | 'updatedAt' = 'order';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
