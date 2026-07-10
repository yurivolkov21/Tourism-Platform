import { ApiProperty } from '@nestjs/swagger';

/** Site-wide approved-review aggregate for the marketing trust band. */
export class ReviewSummaryDto {
  @ApiProperty({ example: 26, description: 'Number of approved reviews' })
  count!: number;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 4.4,
    description: 'Mean rating across approved reviews (1 dp); null when none.',
  })
  averageRating!: number | null;
}
