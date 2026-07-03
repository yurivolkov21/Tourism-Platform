import { ApiProperty } from '@nestjs/swagger';
import { PostDto } from './post.dto';

/** The post's author — admin detail only (display name + contact, not the bare UUID). */
export class PostAuthorDto {
  @ApiProperty({ nullable: true, type: String, example: 'Ana Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'ana@nexora.travel' })
  email!: string;

  @ApiProperty({ nullable: true, type: String, description: 'Avatar delivery URL, when set.' })
  avatarUrl!: string | null;
}

/** Light related-tour row for the admin rail (identity, not merchandising). */
export class AdminRelatedTourDto {
  @ApiProperty({ example: 'halong-heritage-cruise' })
  slug!: string;

  @ApiProperty({ example: 'Hạ Long heritage cruise' })
  title!: string;

  @ApiProperty()
  isPublished!: boolean;
}

/**
 * Admin-only post detail (`GET /admin/posts/:slug`). Extends the shared `PostDto` with the author
 * — surfaced only on the admin read (public reads use `findPublicBySlug`, untouched). Mirrors
 * `AdminDestinationDetailDto` / `AdminBookingDetailDto`.
 */
export class AdminPostDetailDto extends PostDto {
  @ApiProperty({ type: PostAuthorDto })
  override author!: PostAuthorDto;

  @ApiProperty({ type: [AdminRelatedTourDto], description: 'Admin-picked tours, pick order.' })
  relatedTours!: AdminRelatedTourDto[];
}
