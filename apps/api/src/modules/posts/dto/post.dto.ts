import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';
import { MediaItemDto } from '../../media/dto/media.dto';
import { PostTagDto } from './post-tag.dto';

/** Public-safe author (NO email — that stays admin-only on `PostAuthorDto`). */
export class PublicPostAuthorDto {
  @ApiProperty({ nullable: true, type: String, example: 'Ana Admin' })
  fullName!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Avatar delivery URL, when set.',
  })
  avatarUrl!: string | null;
}

/** Response shape for an editorial post (mirrors the Prisma `Post`). */
export class PostDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'three-perfect-days-in-hoi-an' })
  slug!: string;

  @ApiProperty({ example: 'Three perfect days in Hội An' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  excerpt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    maxLength: 70,
    description: 'SEO <title> override (falls back to title)',
  })
  metaTitle!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    maxLength: 160,
    description: 'SEO meta-description override (falls back to excerpt)',
  })
  metaDescription!: string | null;

  @ApiProperty({ description: 'Markdown body' })
  content!: string;

  @ApiProperty({ enum: PostStatus })
  status!: PostStatus;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  publishedAt!: string | null;

  @ApiProperty({ format: 'uuid' })
  authorId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({
    type: [MediaItemDto],
    description: 'Attached media; the cover is role `hero`.',
  })
  media!: MediaItemDto[];

  @ApiProperty({
    type: [PostTagDto],
    description: 'Free-form topics (empty when untagged).',
  })
  tags!: PostTagDto[];

  @ApiProperty({ type: PublicPostAuthorDto })
  author!: PublicPostAuthorDto;
}
