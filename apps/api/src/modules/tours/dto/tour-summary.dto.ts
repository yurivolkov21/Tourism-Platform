import { ApiProperty } from '@nestjs/swagger';
import { TourBadge, TravellerType } from '@prisma/client';
import { MediaItemDto } from '../../media/dto/media.dto';
import {
  TourCategoryRefDto,
  TourDestinationLinkDto,
} from './tour-relations.dto';

/**
 * Lean list-row shape (no itinerary/FAQs/policies). Money fields serialize as
 * decimal strings (Prisma `Decimal`). Includes the category + destination
 * links so catalog cards render without a follow-up call.
 */
export class TourSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ example: 1 })
  durationDays!: number;

  @ApiProperty({ example: 20 })
  maxGroupSize!: number;

  @ApiProperty({ type: String, example: '49.50' })
  basePrice!: string;

  @ApiProperty({ type: String, nullable: true, example: '69.00' })
  compareAtPrice!: string | null;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ nullable: true, type: String, example: 'easy' })
  difficulty!: string | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  isFeatured!: boolean;

  @ApiProperty({ type: [String], example: ['Lantern-lit old town'] })
  highlights!: string[];

  @ApiProperty({ enum: TravellerType, isArray: true, example: [TravellerType.FAMILY] })
  suitableFor!: TravellerType[];

  @ApiProperty({ enum: TourBadge, isArray: true, example: [TourBadge.BEST_VALUE] })
  badges!: TourBadge[];

  @ApiProperty({ example: 4.8, description: 'Average of approved reviews (1-dp); 0 if none' })
  averageRating!: number;

  @ApiProperty({ example: 214, description: 'Count of approved reviews' })
  reviewsCount!: number;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-08-15',
    description: 'Soonest open upcoming departure date; null if none scheduled',
  })
  nextDepartureDate!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 6,
    description: 'Seats left on the soonest open upcoming departure; null if none',
  })
  nextDepartureSeatsLeft!: number | null;

  @ApiProperty({ type: TourCategoryRefDto })
  category!: TourCategoryRefDto;

  @ApiProperty({ type: [TourDestinationLinkDto] })
  destinations!: TourDestinationLinkDto[];

  @ApiProperty({ type: [MediaItemDto] })
  media!: MediaItemDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
