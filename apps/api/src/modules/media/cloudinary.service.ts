import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

/** Cloudinary `resource_type` values we store/destroy. */
type ResourceType = 'image' | 'video';

/**
 * Thin Cloudinary admin wrapper — owns the SDK `destroy` call used by the
 * media-reconcile cron (P1.x-b). Configuration mirrors `UploadsService`; the SDK
 * client is a process singleton, so re-configuring here is harmless.
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('cloudinary.cloudName'),
      api_key: this.config.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.config.getOrThrow<string>('cloudinary.apiSecret'),
      secure: true,
    });
  }

  /**
   * Destroy an asset. Returns Cloudinary's `result` (`'ok'` | `'not found'`);
   * both mean the asset is gone, so the caller can treat either as success.
   * Throws on a transport/API error so the cron can retry.
   */
  async destroy(publicId: string, resourceType: string): Promise<string> {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType as ResourceType,
      invalidate: true,
    });
    return res.result;
  }
}
