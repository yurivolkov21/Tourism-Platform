import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * Create payload for a tour category (admin). `slug` is optional — when omitted
 * or blank it's generated from `name`. EN-only (ADR-0005): single `name` /
 * `description`, no `*Vi` fields. Lookup table (D-P1.5) replacing the donor enum.
 */
export class CreateTourCategoryDto {
  @ApiProperty({ example: 'Adventure Tours', maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({
    description: 'kebab slug; generated from `name` when omitted',
    example: 'adventure-tours',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
