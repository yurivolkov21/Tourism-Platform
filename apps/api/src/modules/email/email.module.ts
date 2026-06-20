import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Global so the pg-boss outbox worker (`JobsModule`) can inject `EmailService`
 * without re-importing this module. Email is a leaf concern with one
 * implementation; the global registration keeps the dep graph flat (ADR-0007).
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
