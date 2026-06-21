import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

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
}
