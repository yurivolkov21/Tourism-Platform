import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Body for `PATCH /admin/reviews/:id` — partial edit of a CURATED testimonial
 * (VERIFIED reviews are a customer's words and stay immutable; moderation
 * toggles cover hiding them).
 *
 * Null semantics (deliberately explicit — NOT `PartialType`): the nullable
 * columns (`authorLocation`/`tripLabel`/`title`) accept `null` to CLEAR the
 * value (`@IsOptional` skips validation for null and the service writes it
 * through); the non-nullable fields use `@ValidateIf(defined)` so an explicit
 * `null` still hits their validators and 400s instead of reaching Prisma.
 */
export class UpdateCuratedReviewDto {
  @ApiPropertyOptional({ maxLength: 120, example: 'Emily Carter' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  authorName?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    example: 'Sydney, Australia',
    nullable: true,
    description: 'Pass null to clear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorLocation?: string | null;

  @ApiPropertyOptional({
    maxLength: 160,
    example: 'Hạ Long Bay Cruise',
    nullable: true,
    description: 'Pass null to clear (falls back to the tour title)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tripLabel?: string | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, example: 5 })
  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    maxLength: 120,
    nullable: true,
    description: 'Pass null to clear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @ApiPropertyOptional({ minLength: 10, maxLength: 2000 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body?: string;
}
