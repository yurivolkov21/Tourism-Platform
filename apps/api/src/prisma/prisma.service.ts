import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client wired into the NestJS DI lifecycle (ported from donor).
 *
 * - Driver adapter `PrismaPg` (Prisma 7 dropped `datasource.url`): runtime
 *   connection from `DATABASE_URL` (Supabase pooler). `prisma migrate` uses
 *   `DIRECT_URL` via prisma.config.ts.
 * - Eager `$connect` on boot so a bad URL fails startup loudly.
 * - Re-exported via the `@Global()` `PrismaModule`.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
      log:
        config.get<string>('app.logLevel') === 'debug'
          ? ['warn', 'error']
          : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to database');
    } catch (err) {
      this.logger.error('Failed to connect to database', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
