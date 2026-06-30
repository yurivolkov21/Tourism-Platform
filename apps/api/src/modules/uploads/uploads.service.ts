import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import {
  CreateSignedUploadUrlDto,
  UploadPurpose,
} from './dto/create-signed-upload-url.dto';

/** Cloudinary asset class — selects the upload endpoint + delivery URL. */
export type ResourceType = 'image' | 'video';

/**
 * Everything the FE needs to POST the file straight to Cloudinary. Signed fields
 * (`timestamp`, `folder`, `publicId`) must be echoed verbatim or Cloudinary 401s.
 */
export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  resourceType: ResourceType;
  uploadUrl: string;
}

/** Allowed extensions per resource type — rejects an obvious mismatch at sign time. */
const ALLOWED_EXTENSIONS: Record<ResourceType, ReadonlySet<string>> = {
  image: new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']),
  video: new Set(['mp4', 'webm', 'mov', 'm4v']),
};

/**
 * Issues Cloudinary upload signatures for admin-initiated **direct** uploads (the
 * FE POSTs the bytes to Cloudinary, never through Nest — keeps large/video uploads
 * off the worker). The backend controls WHO (admin guard on the controller) and
 * WHERE (folder derived server-side from the purpose enum). `api_secret` never
 * leaves here.
 */
@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private cloudName!: string;
  private apiKey!: string;
  private apiSecret!: string;
  private rootFolder!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');
    this.apiKey = this.config.getOrThrow<string>('cloudinary.apiKey');
    this.apiSecret = this.config.getOrThrow<string>('cloudinary.apiSecret');
    this.rootFolder = this.config.getOrThrow<string>('cloudinary.uploadFolder');

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  /**
   * Computes a Cloudinary upload signature for a direct browser upload. The
   * signature covers `{ folder, public_id, timestamp }`; the FE must send those
   * three (plus `api_key`, `signature`, `file`) unchanged.
   *
   * @throws BadRequestException `MEDIA_FORMAT_REJECTED` (400) when the file
   *   extension/contentType doesn't match the purpose's resource type.
   */
  createSignedUploadParams(body: CreateSignedUploadUrlDto): SignedUploadParams {
    const resourceType = this.resourceTypeForPurpose(body.purpose);
    this.assertFormatAllowed(resourceType, body.filename, body.contentType);

    const folder = this.folderForPurpose(body.purpose);
    const publicId = this.derivePublicId(body.filename);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { folder, public_id: publicId, timestamp },
      this.apiSecret,
    );

    this.logger.log(
      `Signed Cloudinary upload for ${folder}/${publicId} (purpose=${body.purpose}, type=${resourceType})`,
    );

    return {
      signature,
      timestamp,
      apiKey: this.apiKey,
      cloudName: this.cloudName,
      folder,
      publicId,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
    };
  }

  private resourceTypeForPurpose(purpose: UploadPurpose): ResourceType {
    switch (purpose) {
      case UploadPurpose.TOUR_VIDEO:
      case UploadPurpose.DESTINATION_VIDEO:
        return 'video';
      case UploadPurpose.TOUR_HERO:
      case UploadPurpose.TOUR_GALLERY:
      case UploadPurpose.DESTINATION_HERO:
      case UploadPurpose.DESTINATION_GALLERY:
      case UploadPurpose.USER_AVATAR:
        return 'image';
    }
  }

  private folderForPurpose(purpose: UploadPurpose): string {
    switch (purpose) {
      case UploadPurpose.TOUR_HERO:
        return `${this.rootFolder}/tours/hero`;
      case UploadPurpose.TOUR_GALLERY:
        return `${this.rootFolder}/tours/gallery`;
      case UploadPurpose.TOUR_VIDEO:
        return `${this.rootFolder}/tours/video`;
      case UploadPurpose.DESTINATION_HERO:
        return `${this.rootFolder}/destinations/hero`;
      case UploadPurpose.DESTINATION_GALLERY:
        return `${this.rootFolder}/destinations/gallery`;
      case UploadPurpose.DESTINATION_VIDEO:
        return `${this.rootFolder}/destinations/video`;
      case UploadPurpose.USER_AVATAR:
        return `${this.rootFolder}/users/avatars`;
    }
  }

  /** Rejects a filename/contentType whose type disagrees with the resource type. */
  private assertFormatAllowed(
    resourceType: ResourceType,
    filename: string,
    contentType?: string,
  ): void {
    const ext = this.extensionOf(filename);
    if (!ext || !ALLOWED_EXTENSIONS[resourceType].has(ext)) {
      throw new BadRequestException({
        code: 'MEDIA_FORMAT_REJECTED',
        message: `File type ".${ext}" is not allowed for a ${resourceType} upload.`,
      });
    }
    if (contentType) {
      const major = contentType.split('/')[0]?.toLowerCase();
      if (major !== resourceType) {
        throw new BadRequestException({
          code: 'MEDIA_FORMAT_REJECTED',
          message: `contentType "${contentType}" does not match a ${resourceType} upload.`,
        });
      }
    }
  }

  /** Lowercased extension without the dot, or `''` if none. */
  private extensionOf(filename: string): string {
    const base = filename.split(/[\\/]/).pop() ?? filename;
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(dotIndex + 1).toLowerCase() : '';
  }

  /**
   * Derives a Cloudinary public_id (no extension — Cloudinary appends the format):
   * basename (anti-traversal) → lowercase + non-alphanumerics to `-` → prefixed
   * with `Date.now()` for uniqueness.
   */
  private derivePublicId(rawFilename: string): string {
    const base = rawFilename.split(/[\\/]/).pop() ?? rawFilename;
    const dotIndex = base.lastIndexOf('.');
    const stem = dotIndex > 0 ? base.slice(0, dotIndex) : base;
    const safeStem =
      stem
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'file';
    return `${Date.now()}-${safeStem}`;
  }
}
