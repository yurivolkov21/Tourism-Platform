import { Module } from '@nestjs/common';
import { AdminUploadsController } from './admin-uploads.controller';
import { UploadsService } from './uploads.service';

/** Cloudinary signed direct-upload signing (admin-only). */
@Module({
  controllers: [AdminUploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
