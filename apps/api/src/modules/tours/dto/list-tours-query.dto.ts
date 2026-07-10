import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Query string for `GET /tours` (public) and the admin variant. Filters are
 * optional and AND-combined. `category` / `destination` are matched by **slug**
 * (resolved → id in the service) so marketing URLs stay human-readable. The
 * public endpoint pins `isPublished: true`; only the admin path honours the
 * `isPublished` filter.
 */
export class ListToursQueryDto {
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

  @ApiPropertyOptional({
    example: 'day-tours',
    description: 'Tour-category slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(KEBAB, { message: 'category must be a kebab-case slug' })
  category?: string;

  @ApiPropertyOptional({ example: 'hoi-an', description: 'Destination slug' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(KEBAB, { message: 'destination must be a kebab-case slug' })
  destination?: string;

  /** Featured-only filter for the home-page hero shelf. */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  /** Honoured only by the admin endpoint (public forces `isPublished: true`). */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive `title` search; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'lantern', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  /** Whitelisted sort key (prevents arbitrary orderBy injection). */
  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'basePrice', 'durationDays', 'title'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'basePrice', 'durationDays', 'title'])
  sortBy?: 'createdAt' | 'updatedAt' | 'basePrice' | 'durationDays' | 'title' =
    'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
