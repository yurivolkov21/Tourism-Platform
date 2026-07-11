import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MediaModule } from './media.module';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

/**
 * Admin media library (Wave 7). Separate from `MediaModule` (the owner-sync
 * unit) so importing `JobsModule` for `MaintenanceService` stays acyclic
 * (JobsModule already imports MediaModule). Prisma/Config are global.
 */
@Module({
  imports: [JobsModule, MediaModule],
  controllers: [AdminMediaController],
  providers: [AdminMediaService],
})
export class AdminMediaModule {}
