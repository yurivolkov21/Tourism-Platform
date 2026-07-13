import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminEnquiryController } from './admin-enquiry.controller';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';

/**
 * Enquiries (ADR-0003). `ThrottlerModule` provides the rate-limit storage; the
 * guard itself is applied only on `EnquiryController` (the public form), so the
 * limit never touches authenticated routes. The module default comes from
 * `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT` (API-W2 — dead config before); the
 * public POST tightens it via `@Throttle` (5/min) as an explicit business rule.
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
  controllers: [EnquiryController, AdminEnquiryController],
  providers: [EnquiryService],
  exports: [EnquiryService],
})
export class EnquiryModule {}
