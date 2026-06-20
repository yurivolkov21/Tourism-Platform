import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

/**
 * Customer wishlist. Imports `MediaModule` (P1.6) so the tour preview on
 * `GET /wishlist/me` carries Cloudinary delivery URLs.
 */
@Module({
  imports: [MediaModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
