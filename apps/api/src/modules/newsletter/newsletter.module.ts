import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminNewsletterController } from './admin-newsletter.controller';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

/**
 * Newsletter lead capture (blog v2 wave 5). `ThrottlerModule.forRoot` provides
 * the rate-limit storage; the guard is applied only on `NewsletterController`
 * (the public signup), mirroring the enquiry module's posture — the limit never
 * touches authenticated routes.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
    }),
  ],
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
