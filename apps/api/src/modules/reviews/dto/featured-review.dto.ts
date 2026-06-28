import { ApiProperty } from '@nestjs/swagger';

/**
 * Public testimonial item for the homepage carousel. Combines VERIFIED reviews that an admin pinned
 * (`isFeatured`) and CURATED testimonials. `tripLabel` resolves to the linked tour's title when not
 * set explicitly. No ids/booking/email — marketing-safe.
 */
export class FeaturedReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty({ example: 'Emily Carter' })
  authorName!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Sydney, Australia' })
  authorLocation!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Hạ Long Bay Cruise' })
  tripLabel!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/** Enveloped (`{ data }`) featured reviews list — for Swagger. */
export class FeaturedReviewsDto {
  @ApiProperty({ type: [FeaturedReviewDto] })
  data!: FeaturedReviewDto[];
}
