import { ApiProperty } from '@nestjs/swagger';
import { ReviewSource } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/**
 * Admin review item — the full row plus tour slug for context in the moderation queue. Admins are
 * trusted with PII, so unlike the public projection this keeps `userId`/`bookingId`. `tourId`/`userId`/
 * `bookingId` are null for CURATED testimonials (no real booking).
 */
export class AdminReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  tourId!: string | null;

  @ApiProperty({ example: 'hoi-an-walking-tour', nullable: true, type: String })
  tourSlug!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  userId!: string | null;

  @ApiProperty({ example: 'Alice Nguyen', description: 'Snapshot display name' })
  authorName!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Sydney, Australia' })
  authorLocation!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  bookingId!: string | null;

  @ApiProperty({ enum: ReviewSource, example: ReviewSource.VERIFIED })
  source!: ReviewSource;

  @ApiProperty({ example: false })
  isFeatured!: boolean;

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
