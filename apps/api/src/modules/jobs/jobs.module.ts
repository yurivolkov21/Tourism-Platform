import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { OutboxService } from './outbox.service';

/**
 * Background-jobs module (ADR-0007, P1.x). `OutboxService` holds the testable
 * drain logic; `JobsService` owns the pg-boss lifecycle and invokes it on a
 * schedule. `EmailModule` is `@Global`, so it needs no import here.
 */
@Module({
  providers: [OutboxService, JobsService],
  exports: [OutboxService],
})
export class JobsModule {}
