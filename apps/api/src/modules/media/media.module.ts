import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { MediaService } from './media.service';

/**
 * Owns all `MediaAsset` access (polymorphic by `ownerType`/`ownerId`).
 * `MediaService` is exported so the tours + destinations modules can sync,
 * attach (read), and clean up media for their rows. `CloudinaryService` is
 * exported for the media-reconcile cron (P1.x-b).
 */
@Module({
  providers: [MediaService, CloudinaryService],
  exports: [MediaService, CloudinaryService],
})
export class MediaModule {}
