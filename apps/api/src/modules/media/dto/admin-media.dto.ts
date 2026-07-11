import { ApiProperty } from '@nestjs/swagger';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** One media-library row — an owned asset with delivery URLs + resolved owner. */
export class AdminMediaAssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/tours/hero/1717000000000-hoi-an' })
  publicId!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'uri',
    description: 'Video poster URL.',
  })
  posterUrl!: string | null;

  @ApiProperty({ enum: MediaType })
  type!: MediaType;

  @ApiProperty({ enum: MediaRole })
  role!: MediaRole;

  @ApiProperty({ nullable: true, type: String, example: 'jpg' })
  format!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 1920 })
  width!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 1080 })
  height!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 245000 })
  bytes!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  durationSec!: number | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ enum: MediaOwnerType })
  ownerType!: MediaOwnerType;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Hoi An Walking Tour',
    description:
      'Owning record title/name — null when the owner row no longer exists.',
  })
  ownerTitle!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'hoi-an-walking-tour',
    description:
      'Owner page slug (tour/destination/post); null for USER owners.',
  })
  ownerSlug!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Editable alt text (web falls back to owner-derived text)',
  })
  alt!: string | null;
}

/** Enveloped media-library list (`TransformInterceptor` hoists items→data + meta). */
export class PaginatedAdminMediaDto {
  @ApiProperty({ type: [AdminMediaAssetDto] })
  data!: AdminMediaAssetDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

/** One deferred-Cloudinary-destroy queue row. `attempts`>0 = destroy failing. */
export class MediaGarbageRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/destinations/gallery/1717000000000-old' })
  publicId!: string;

  @ApiProperty({
    example: 'image',
    description: "Cloudinary resource_type ('image' | 'video').",
  })
  resourceType!: string;

  @ApiProperty({ example: 0 })
  attempts!: number;

  @ApiProperty({ nullable: true, type: String })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/** Enveloped garbage-queue list. */
export class PaginatedMediaGarbageDto {
  @ApiProperty({ type: [MediaGarbageRowDto] })
  data!: MediaGarbageRowDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

/** Result of an on-demand reconcile batch. */
export class MediaReconcileResultDto {
  @ApiProperty({ example: 9 })
  destroyed!: number;

  @ApiProperty({ example: 0 })
  failed!: number;
}

/** Ack for a library delete. */
export class DeletedMediaAssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/tours/hero/1717000000000-hoi-an' })
  publicId!: string;
}
