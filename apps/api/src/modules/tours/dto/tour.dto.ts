import { ApiProperty } from '@nestjs/swagger';
import { TourSummaryDto } from './tour-summary.dto';
import {
  TourFaqDto,
  TourItineraryDayDto,
  TourPolicyDto,
} from './tour-relations.dto';

/**
 * Enriched detail payload — the summary plus the full content arrays and the
 * ordered sub-entities (itinerary asc by day, FAQs + policies asc by order).
 */
export class TourDetailDto extends TourSummaryDto {
  @ApiProperty({ type: [String], example: ['Local guide', 'Lunch'] })
  included!: string[];

  @ApiProperty({ type: [String], example: ['Tips'] })
  excluded!: string[];

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Meet at 78 Le Loi street',
  })
  meetingPoint!: string | null;

  @ApiProperty({ type: [TourItineraryDayDto] })
  itinerary!: TourItineraryDayDto[];

  @ApiProperty({ type: [TourFaqDto] })
  faqs!: TourFaqDto[];

  @ApiProperty({ type: [TourPolicyDto] })
  policies!: TourPolicyDto[];
}
