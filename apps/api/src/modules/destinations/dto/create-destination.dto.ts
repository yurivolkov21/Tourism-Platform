import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * Create payload for a destination (admin). `slug` is optional — when omitted
 * or blank it's generated from `name`. EN-only (ADR-0005): single `name` /
 * `description`, no `*Vi` fields.
 */
export class CreateDestinationDto {
  @ApiProperty({ example: 'Hoi An', maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({
    description: 'kebab slug; generated from `name` when omitted',
    example: 'hoi-an',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ example: 'Vietnam', default: 'Vietnam', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @ApiPropertyOptional({ example: 'Central Vietnam', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
