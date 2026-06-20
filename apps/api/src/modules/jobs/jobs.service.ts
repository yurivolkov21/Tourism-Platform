import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PgBoss } from 'pg-boss';
import { OutboxService } from './outbox.service';

/** Queue + schedule names for the outbox drain (pg-boss owns its `pgboss` schema). */
const OUTBOX_QUEUE = 'outbox-drain';
/** Cron: every minute (pg-boss's minimum granularity). */
const OUTBOX_CRON = '* * * * *';

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
    await this.boss.createQueue(OUTBOX_QUEUE, { policy: 'short' });
    await this.boss.work(OUTBOX_QUEUE, async () => {
      await this.outbox.drainOutbox();
    });
    await this.boss.schedule(OUTBOX_QUEUE, OUTBOX_CRON);
    this.logger.log(`Background jobs started (outbox drain every minute)`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      await this.boss.stop({ graceful: true, timeout: 10_000 });
      this.boss = null;
    }
  }
}
