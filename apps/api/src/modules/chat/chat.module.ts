import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { EnquiryModule } from '../enquiry/enquiry.module';
import { ToursModule } from '../tours/tours.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

/**
 * AI concierge chat (spec: docs/06-specs/2026-07-14-ai-concierge-chat-design.md).
 * Tools call ToursService/EnquiryService in-process. Throttler storage is
 * module-local (same idiom as EnquiryModule) so the guard on ChatController
 * never touches the rest of the API.
 */
@Module({
  imports: [
    ToursModule,
    EnquiryModule,
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
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
