import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CreatePostDto } from './create-post.dto';

/**
 * Partial update — every create field optional. The SEO overrides and
 * `publishedAt` are redeclared (omitted from the base so the nullable types
 * compile) because `null` carries meaning here: it CLEARS the SEO override /
 * the schedule (see each field's doc). Never `new Date(null)` — the service
 * branches on null explicitly.
 */
export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, [
    'metaTitle',
    'metaDescription',
    'publishedAt',
  ] as const),
) {
  /**
   * ISO date-time sets/reschedules; `null` clears the schedule (a PUBLISHED
   * post re-stamps to now = publish immediately; a DRAFT clears the date).
   */
  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description: 'ISO sets/reschedules; null = publish immediately / clear',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({ strict: true })
  publishedAt?: string | null;

  @ApiPropertyOptional({
    maxLength: 70,
    nullable: true,
    description: 'Pass null to clear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string | null;

  @ApiPropertyOptional({
    maxLength: 160,
    nullable: true,
    description: 'Pass null to clear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string | null;
}
