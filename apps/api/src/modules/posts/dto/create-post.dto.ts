import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PostStatus } from '@prisma/client';

/**
 * Create payload for an editorial post (admin). `slug` is optional — generated
 * from `title` when omitted/blank. `content` is markdown (rendered sanitized
 * client-side). `authorId` is NOT accepted from the client — it's taken from the
 * authenticated admin. EN-only (ADR-0005).
 */
export class CreatePostDto {
  @ApiProperty({ example: 'Three perfect days in Hội An', maxLength: 160 })
  @IsString()
  @Length(1, 160)
  title!: string;

  @ApiPropertyOptional({
    description: 'kebab slug; generated from `title` when omitted',
    example: 'three-perfect-days-in-hoi-an',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @ApiProperty({ description: 'Markdown body', example: '## Day 1\\n...' })
  @IsString()
  @Length(1, 50000)
  content!: string;

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.DRAFT })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
