import { Module } from '@nestjs/common';
import { MediaService } from './media.service';

/**
 * Owns all `MediaAsset` access (polymorphic by `ownerType`/`ownerId`).
 * `MediaService` is exported so the tours + destinations modules can sync,
 * attach (read), and clean up media for their rows.
 */
@Module({
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
