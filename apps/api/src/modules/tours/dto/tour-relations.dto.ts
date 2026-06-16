import { ApiProperty } from '@nestjs/swagger';
import { PolicyKind } from '@prisma/client';

/** Lightweight category reference embedded on a tour payload. */
export class TourCategoryRefDto {
  @ApiProperty({ example: 'day-tours' })
  slug!: string;

  @ApiProperty({ example: 'Day Tours' })
  name!: string;
}

/** Lightweight destination reference embedded on a tour payload. */
export class TourDestinationRefDto {
  @ApiProperty({ example: 'hoi-an' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An' })
  name!: string;
}

/** A tour↔destination link (M:N) with the primary flag. */
export class TourDestinationLinkDto {
  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ type: TourDestinationRefDto })
  destination!: TourDestinationRefDto;
}

/** One itinerary day on the enriched detail payload. */
export class TourItineraryDayDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  dayNumber!: number;

  @ApiProperty({ example: 'Arrival & old town walk' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;
}

/** One FAQ on the enriched detail payload. */
export class TourFaqDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Is hotel pickup included?' })
  question!: string;

  @ApiProperty({ example: 'Yes, within the old town.' })
  answer!: string;

  @ApiProperty({ example: 0 })
  order!: number;
}

/** One policy on the enriched detail payload. */
export class TourPolicyDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PolicyKind, example: PolicyKind.CANCELLATION })
  kind!: PolicyKind;

  @ApiProperty({ example: 'Free cancellation up to 24h' })
  title!: string;

  @ApiProperty({ example: 'Full refund if cancelled 24h before departure.' })
  body!: string;

  @ApiProperty({ example: 0 })
  order!: number;
}
