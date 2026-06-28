import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Body for `PATCH /admin/reviews/:id/feature` — pin/unpin on the homepage carousel. */
export class FeatureReviewDto {
  @ApiProperty({
    description: 'true to pin to the homepage testimonials; false to unpin.',
    example: true,
  })
  @IsBoolean()
  isFeatured!: boolean;
}
