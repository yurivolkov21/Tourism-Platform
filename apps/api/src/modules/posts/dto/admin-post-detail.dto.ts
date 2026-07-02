import { ApiProperty } from '@nestjs/swagger';
import { PostDto } from './post.dto';

/** The post's author — admin detail only (display name + contact, not the bare UUID). */
export class PostAuthorDto {
  @ApiProperty({ nullable: true, type: String, example: 'Ana Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'ana@nexora.travel' })
  email!: string;
}

/**
 * Admin-only post detail (`GET /admin/posts/:slug`). Extends the shared `PostDto` with the author
 * — surfaced only on the admin read (public reads use `findPublicBySlug`, untouched). Mirrors
 * `AdminDestinationDetailDto` / `AdminBookingDetailDto`.
 */
export class AdminPostDetailDto extends PostDto {
  @ApiProperty({ type: PostAuthorDto })
  author!: PostAuthorDto;
}
