import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminOutboxController } from './admin-outbox.controller';
import { AdminOutboxService } from './admin-outbox.service';
import { JobsService } from './jobs.service';
import { MaintenanceService } from './maintenance.service';
import { OutboxService } from './outbox.service';

/**
 * Background-jobs module (ADR-0007, P1.x). `OutboxService` + `MaintenanceService`
 * hold the testable logic; `JobsService` owns the pg-boss lifecycle and invokes
 * them on schedules. `EmailModule` is `@Global`; `MediaModule` is imported for
 * `CloudinaryService` (media reconcile). `AdminOutboxController`/`Service`
 * expose admin visibility + retry over the outbox table.
 */
@Module({
  imports: [MediaModule],
  controllers: [AdminOutboxController],
  providers: [
    OutboxService,
    MaintenanceService,
    JobsService,
    AdminOutboxService,
  ],
  exports: [OutboxService, MaintenanceService],
})
export class JobsModule {}
