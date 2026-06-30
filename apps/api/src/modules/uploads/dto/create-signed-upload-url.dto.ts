import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Catalog of allowed upload purposes. Maps 1:1 to a Cloudinary folder so the
 * asset layout is predictable. Each purpose also implies a Cloudinary
 * `resource_type` (image vs video) — see `UploadsService.resourceTypeForPurpose`.
 *
 * Adding a new purpose means: add the enum case, then map it in both
 * `folderForPurpose` and `resourceTypeForPurpose`.
 */
export enum UploadPurpose {
  TOUR_HERO = 'TOUR_HERO',
  TOUR_GALLERY = 'TOUR_GALLERY',
  TOUR_VIDEO = 'TOUR_VIDEO',
  DESTINATION_HERO = 'DESTINATION_HERO',
  DESTINATION_GALLERY = 'DESTINATION_GALLERY',
  DESTINATION_VIDEO = 'DESTINATION_VIDEO',
  USER_AVATAR = 'USER_AVATAR',
}

/**
 * Request body for `POST /admin/uploads/signed-url`. The endpoint does NOT proxy
 * the file — it returns a Cloudinary upload signature the FE uses to POST the file
 * directly to Cloudinary (keeps large/video uploads off the Nest worker).
 *
 * Backend's job: validate purpose + filename + format↔resource-type, derive a
 * sanitized timestamped folder/public_id, and sign with the api_secret.
 */
export class CreateSignedUploadUrlDto {
  @ApiProperty({
    enum: UploadPurpose,
    description: 'Upload classification — determines the storage folder.',
  })
  @IsEnum(UploadPurpose)
  purpose!: UploadPurpose;

  /**
   * Original filename from the FE. The regex is the first line of defence against
   * path traversal (`../../etc/passwd`) — rejects slashes/backslashes/null bytes
   * and requires a single 1-8 char extension. The service re-sanitizes before use.
   */
  @ApiProperty({
    example: 'hero-shot.jpg',
    description:
      'Original filename (single extension). The backend sanitizes + timestamps it.',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9._-]+\.[A-Za-z0-9]{1,8}$/, {
    message:
      'filename must contain only letters, digits, hyphen, underscore, dot, and end with a 1-8 char extension',
  })
  filename!: string;

  /** Optional content-type hint; the major type must match the resource type. */
  @ApiPropertyOptional({ example: 'image/jpeg', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/, {
    message: 'contentType must be a valid MIME type',
  })
  contentType?: string;
}
