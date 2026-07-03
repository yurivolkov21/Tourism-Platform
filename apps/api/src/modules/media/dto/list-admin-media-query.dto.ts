import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query string for `GET /admin/media` (admin media library). Pagination plus
 * optional owner-type / role / media-type filters and a free-text `search`
 * (matched against the Cloudinary publicId and the owning record's title/name).
 * Newest first.
 */
export class ListAdminMediaQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** Filter by owning record kind; omit for all. */
  @ApiPropertyOptional({ enum: MediaOwnerType })
  @IsOptional()
  @IsEnum(MediaOwnerType)
  ownerType?: MediaOwnerType;

  /** Filter by slot (hero / gallery / avatar); omit for all. */
  @ApiPropertyOptional({ enum: MediaRole })
  @IsOptional()
  @IsEnum(MediaRole)
  role?: MediaRole;

  /** Filter by media kind (image / video); omit for all. */
  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  /** Case-insensitive match on publicId OR owner title/name; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'hoi an', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
