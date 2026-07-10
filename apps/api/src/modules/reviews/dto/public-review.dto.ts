import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Public-safe reviewer projection — display name only (no id/email/booking). */
export class ReviewerDto {
  @ApiProperty({
    example: 'Alice N.',
    description: 'Display name (or "Anonymous")',
  })
  fullName!: string;
}

/**
 * Public review item. Deliberately strips `bookingId`/`userId`/email so a
 * customer's purchase history isn't probeable from the marketing page.
 */
export class PublicReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: ReviewerDto })
  reviewer!: ReviewerDto;
}

/** `PageMetaDto` + the tour's average approved rating (cached by the FE card). */
export class ReviewPageMetaDto extends PageMetaDto {
  @ApiProperty({
    nullable: true,
    type: Number,
    example: 4.5,
    description: 'Mean rating across approved reviews; null when none yet.',
  })
  averageRating!: number | null;
}

/** Enveloped (`{ data, meta }`) public reviews list — for Swagger. */
export class PaginatedPublicReviewsDto {
  @ApiProperty({ type: [PublicReviewDto] })
  data!: PublicReviewDto[];

  @ApiProperty({ type: ReviewPageMetaDto })
  meta!: ReviewPageMetaDto;
}
