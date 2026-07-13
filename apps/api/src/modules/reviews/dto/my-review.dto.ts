import { ApiProperty } from '@nestjs/swagger';

/** Tour context on an own-review row (null on curated/tourless rows). */
export class MyReviewTourRefDto {
  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour' })
  title!: string;
}

/**
 * One row of `GET /reviews/mine` (API-W3) — the caller's own submissions,
 * including not-yet-approved ones (authors always see their own reviews).
 */
export class MyReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty({
    description: 'False while the review awaits moderation',
    example: true,
  })
  isApproved!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: MyReviewTourRefDto })
  tour!: MyReviewTourRefDto | null;
}
