import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/**
 * Admin review item — the full row plus reviewer name + tour slug for context
 * in the moderation queue. Admins are trusted with PII, so unlike the public
 * projection this keeps `userId`/`bookingId`.
 */
export class AdminReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  tourSlug!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ nullable: true, type: String })
  reviewerName!: string | null;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, type: String })
  title!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  isApproved!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

/** Enveloped (`{ data, meta }`) admin reviews list — for Swagger. */
export class PaginatedAdminReviewsDto {
  @ApiProperty({ type: [AdminReviewDto] })
  data!: AdminReviewDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
