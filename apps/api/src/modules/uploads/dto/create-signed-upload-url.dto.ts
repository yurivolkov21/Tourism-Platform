import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

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
  POST_COVER = 'POST_COVER',
  POST_BODY = 'POST_BODY',
  SITE_CHROME = 'SITE_CHROME',
}

/**
 * Request body for `POST /admin/uploads/signed-url`. The endpoint does NOT proxy
 * the file — it returns a Cloudinary upload signature the FE uses to POST the file
 * directly to Cloudinary (keeps large/video uploads off the Nest worker).
 *
 * Backend's job: validate purpose + filename + format↔resource-type, derive a
 * sanitized timestamped folder/public_id, and sign with the api_secret.
 */
/**
 * First-line-of-defence filename shape: no slashes/backslashes/control chars
 * and a single 1-8 char extension — and nothing more (spaces, unicode,
 * parentheses all pass; the service re-sanitizes the stem into the Cloudinary
 * public_id). Built via RegExp-from-string so no literal control characters
 * appear in this source file.
 */
// Built without any backslash in source (escape-mangling-proof): the char
// class excludes backslash (92,92 = escaped-backslash), forward slash, and
// control chars 0-31; '[.]' is the literal dot.
const FILENAME_PATTERN = new RegExp(
  '^[^' +
    String.fromCharCode(92) +
    String.fromCharCode(92) +
    '/' +
    String.fromCharCode(0) +
    '-' +
    String.fromCharCode(31) +
    ']+[.][A-Za-z0-9]{1,8}$',
);

export class CreateSignedUploadUrlDto {
  @ApiProperty({
    enum: UploadPurpose,
    description: 'Upload classification — determines the storage folder.',
  })
  @IsEnum(UploadPurpose)
  purpose!: UploadPurpose;

  /**
   * Original filename from the FE. The regex is the first line of defence against
   * path traversal (`../../etc/passwd`) — it rejects slashes/backslashes/control
   * chars and requires a 1-8 char extension, and NOTHING more: real-world names
   * (Windows "Screenshot 2026-07-17 ….png" with spaces, Vietnamese/unicode
   * names, "image (1).png") must pass, because the service re-sanitizes the stem
   * into the Cloudinary public_id anyway (`derivePublicId`).
   */
  @ApiProperty({
    example: 'hero-shot.jpg',
    description:
      'Original filename (single extension). The backend sanitizes + timestamps it.',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  @Matches(FILENAME_PATTERN, {
    message:
      'filename must not contain slashes or control characters and must end with a 1-8 character extension',
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
