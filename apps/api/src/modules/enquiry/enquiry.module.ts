import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminEnquiryController } from './admin-enquiry.controller';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';

/**
 * Enquiries (ADR-0003). `ThrottlerModule.forRoot` provides the rate-limit
 * storage; the guard itself is applied only on `EnquiryController` (the public
 * form), so the limit never touches authenticated routes. The default below is a
 * generous fallback — the public POST tightens it via `@Throttle` (5/min).
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
    }),
  ],
  controllers: [EnquiryController, AdminEnquiryController],
  providers: [EnquiryService],
  exports: [EnquiryService],
})
export class EnquiryModule {}
