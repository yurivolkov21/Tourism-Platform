import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TourBadge, TravellerType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TourFaqInput } from './nested/tour-faq.input';
import { TourItineraryDayInput } from './nested/tour-itinerary-day.input';
import { TourPolicyInput } from './nested/tour-policy.input';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Request body for `POST /admin/tours`. EN-only (ADR-0005): single `title` /
 * `summary`, no `*Vi`. References are by **slug** (category + destinations) —
 * the service resolves them to ids and returns a clear `400` for bad refs.
 *
 * M:N destinations (ADR-0002): `destinationSlugs[]` + `primaryDestinationSlug`
 * (which must be one of the slugs). Sub-entities (itinerary / FAQs / policies)
 * are nested here and written replace-all. Media is out of scope (P1.6).
 */
export class CreateTourDto {
  // ── Identity ──────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: 'hoi-an-walking-tour',
    maxLength: 200,
    description:
      'Any format — normalized server-side to kebab-case (max 120). Omit to generate from title.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({
    example: 'Half-day stroll through lantern-lit alleys.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  // ── References (by slug) ───────────────────────────────────────────────────

  @ApiProperty({ example: 'day-tours', description: 'Existing tour-category slug', maxLength: 60 })
  @IsString()
  @MaxLength(60)
  @Matches(KEBAB, { message: 'categorySlug must be a kebab-case slug' })
  categorySlug!: string;

  @ApiProperty({
    type: [String],
    example: ['hoi-an', 'da-nang'],
    description: 'Slugs of existing destinations (>=1). `primaryDestinationSlug` must be one of these.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(KEBAB, { each: true, message: 'each destination slug must be kebab-case' })
  destinationSlugs!: string[];

  @ApiProperty({ example: 'hoi-an', description: 'Primary destination slug (∈ destinationSlugs)', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @Matches(KEBAB, { message: 'primaryDestinationSlug must be a kebab-case slug' })
  primaryDestinationSlug!: string;

  // ── Logistics ─────────────────────────────────────────────────────────────

  @ApiProperty({ example: 1, minimum: 1, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  durationDays!: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxGroupSize?: number;

  @ApiPropertyOptional({ example: 'Hoi An tourist info centre, 78 Le Loi street', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  meetingPoint?: string;

  // ── Pricing ───────────────────────────────────────────────────────────────

  @ApiProperty({ example: 49.5, minimum: 0, description: 'Decimal(12,2)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

  /** Optional strike-through anchor (D-P1.3). Must exceed `basePrice` to read as a discount. */
  @ApiPropertyOptional({ example: 69, minimum: 0, description: 'Decimal(12,2) compare-at anchor' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 'USD', minLength: 3, maxLength: 3, default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  // ── Classification ────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'easy', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  difficulty?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // ── Merchandising (P1.7e) ──────────────────────────────────────────────────

  @ApiPropertyOptional({
    enum: TravellerType,
    isArray: true,
    example: [TravellerType.FAMILY, TravellerType.COUPLE],
    description: 'Traveller types this tour suits.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsEnum(TravellerType, { each: true })
  suitableFor?: TravellerType[];

  @ApiPropertyOptional({
    enum: TourBadge,
    isArray: true,
    example: [TourBadge.BEST_VALUE],
    description: 'Merchandising badges on the tour card.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsEnum(TourBadge, { each: true })
  badges?: TourBadge[];

  // ── Content arrays (text[]) ────────────────────────────────────────────────

  @ApiPropertyOptional({ type: [String], example: ['Local guide', 'Bottled water', 'Lunch'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  included?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Personal expenses', 'Tips'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  excluded?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Lantern-lit old town', 'Hands-on cooking class'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  highlights?: string[];

  // ── Sub-entities (nested, replace-all) ─────────────────────────────────────

  @ApiPropertyOptional({ type: [TourItineraryDayInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => TourItineraryDayInput)
  itinerary?: TourItineraryDayInput[];

  @ApiPropertyOptional({ type: [TourFaqInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TourFaqInput)
  faqs?: TourFaqInput[];

  @ApiPropertyOptional({ type: [TourPolicyInput] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TourPolicyInput)
  policies?: TourPolicyInput[];
}
