import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PgBoss } from 'pg-boss';
import { MaintenanceService } from './maintenance.service';
import { OutboxService } from './outbox.service';

/** Queue + schedule names for the outbox drain (pg-boss owns its `pgboss` schema). */
const OUTBOX_QUEUE = 'outbox-drain';
/** Cron: every minute (pg-boss's minimum granularity). */
const OUTBOX_CRON = '* * * * *';
/** Abandoned-booking cleanup — every 15 minutes. */
const CLEANUP_QUEUE = 'abandoned-booking-cleanup';
const CLEANUP_CRON = '*/15 * * * *';
/** Media reconcile — daily at 03:00 UTC (off-peak). */
const MEDIA_RECONCILE_QUEUE = 'media-reconcile';
const MEDIA_RECONCILE_CRON = '0 3 * * *';

/**
 * pg-boss lifecycle owner (ADR-0007). Starts pg-boss on the **direct** Postgres
 * connection (session mode, port 5432 — the transaction pooler can't host
 * pg-boss's LISTEN/maintenance), schedules a once-a-minute drain, and processes
 * it via {@link OutboxService}.
 *
 * pg-boss is ESM-only and is **dynamically imported** so it never loads under
 * Jest (unit + e2e run on CJS). The whole subsystem is disabled in `test` and
 * when `RESEND_API_KEY` is absent, so the app still boots without email.
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private boss: PgBoss | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly outbox: OutboxService,
    private readonly maintenance: MaintenanceService,
  ) {}

  async onModuleInit(): Promise<void> {
    const nodeEnv = this.config.get<string>('app.nodeEnv');
    const resendKey = this.config.get<string>('email.resendApiKey');
    if (nodeEnv === 'test' || !resendKey) {
      this.logger.log(
        `Background jobs disabled (${nodeEnv === 'test' ? 'test env' : 'no RESEND_API_KEY'})`,
      );
      return;
    }

    const connectionString = this.config.getOrThrow<string>('DIRECT_URL');
    const { PgBoss } = await import('pg-boss');
    this.boss = new PgBoss(connectionString);
    this.boss.on('error', (err: Error) =>
      this.logger.error(`pg-boss error: ${err.message}`, err.stack),
    );

    await this.boss.start();

    // Outbox drain — every minute.
    await this.boss.createQueue(OUTBOX_QUEUE, { policy: 'short' });
    await this.boss.work(OUTBOX_QUEUE, async () => {
      await this.outbox.drainOutbox();
    });
    await this.boss.schedule(OUTBOX_QUEUE, OUTBOX_CRON);

    // Abandoned-booking cleanup — every 15 minutes.
    await this.boss.createQueue(CLEANUP_QUEUE, { policy: 'short' });
    await this.boss.work(CLEANUP_QUEUE, async () => {
      await this.maintenance.cancelAbandonedBookings();
    });
    await this.boss.schedule(CLEANUP_QUEUE, CLEANUP_CRON);

    // Media reconcile — daily.
    await this.boss.createQueue(MEDIA_RECONCILE_QUEUE, { policy: 'short' });
    await this.boss.work(MEDIA_RECONCILE_QUEUE, async () => {
      await this.maintenance.reconcileMedia();
    });
    await this.boss.schedule(MEDIA_RECONCILE_QUEUE, MEDIA_RECONCILE_CRON);

    this.logger.log(
      'Background jobs started (outbox 1m · booking-cleanup 15m · media-reconcile daily)',
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      await this.boss.stop({ graceful: true, timeout: 10_000 });
      this.boss = null;
    }
  }
}
