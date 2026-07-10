import { Module } from '@nestjs/common';

import { MediaModule } from '../media/media.module';
import { AdminSiteMediaController } from './admin-site-media.controller';
import { SiteMediaController } from './site-media.controller';
import { SiteMediaService } from './site-media.service';

@Module({
  imports: [MediaModule],
  controllers: [SiteMediaController, AdminSiteMediaController],
  providers: [SiteMediaService],
  exports: [SiteMediaService],
})
export class SiteMediaModule {}
