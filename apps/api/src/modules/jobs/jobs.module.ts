import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { JobsService } from './jobs.service';
import { MaintenanceService } from './maintenance.service';
import { OutboxService } from './outbox.service';

/**
 * Background-jobs module (ADR-0007, P1.x). `OutboxService` + `MaintenanceService`
 * hold the testable logic; `JobsService` owns the pg-boss lifecycle and invokes
 * them on schedules. `EmailModule` is `@Global`; `MediaModule` is imported for
 * `CloudinaryService` (media reconcile).
 */
@Module({
  imports: [MediaModule],
  providers: [OutboxService, MaintenanceService, JobsService],
  exports: [OutboxService, MaintenanceService],
})
export class JobsModule {}
