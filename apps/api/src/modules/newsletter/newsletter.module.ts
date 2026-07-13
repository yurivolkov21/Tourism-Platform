import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminNewsletterController } from './admin-newsletter.controller';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

/**
 * Newsletter lead capture (blog v2 wave 5). `ThrottlerModule` provides the
 * rate-limit storage; the guard is applied only on `NewsletterController`
 * (the public signup), mirroring the enquiry module's posture — the limit never
 * touches authenticated routes. Limits come from `THROTTLE_TTL_SECONDS` /
 * `THROTTLE_LIMIT` (API-W2 — the env knobs were dead config before).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('throttler.ttlSeconds') * 1000,
            limit: config.getOrThrow<number>('throttler.limit'),
          },
        ],
      }),
    }),
  ],
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
