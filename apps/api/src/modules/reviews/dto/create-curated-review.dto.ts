import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /admin/reviews/curated` — an admin-authored testimonial with no booking. Created
 * approved + featured (it exists to go on the homepage). `authorLocation`/`tripLabel` are free text.
 */
export class CreateCuratedReviewDto {
  @ApiProperty({ maxLength: 120, example: 'Emily Carter' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  authorName!: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'Sydney, Australia' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorLocation?: string;

  @ApiPropertyOptional({ maxLength: 160, example: 'Hạ Long Bay Cruise' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tripLabel?: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body!: string;
}
