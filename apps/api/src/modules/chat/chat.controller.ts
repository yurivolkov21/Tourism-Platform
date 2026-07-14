import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ChatService } from './chat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

/** Public LLM endpoint anti-abuse: at most 10 messages / minute / IP. */
const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_TTL_MS = 60_000;

/**
 * AI concierge chat, mounted at `/chat`. Public (guests chat pre-sales) but
 * hard-capped: per-IP throttle here + per-request token/step caps in the
 * service. POST streams an AI SDK UIMessage response over the raw Express
 * `res` (first SSE surface in this API — bypasses the Transform envelope).
 * A valid JWT, when present, personalizes and binds the conversation.
 */
@ApiTags('Chat')
@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @Public()
  @Throttle({ default: { limit: CHAT_RATE_LIMIT, ttl: CHAT_RATE_TTL_MS } })
  @ApiOperation({
    summary: 'Send a chat message; streams the concierge reply (SSE)',
  })
  @ApiResponse({ status: 200, description: 'UIMessage SSE stream' })
  @ApiResponse({ status: 400, description: 'Invalid message payload' })
  @ApiResponse({ status: 403, description: 'Not your conversation' })
  @ApiResponse({ status: 409, description: 'Conversation full' })
  @ApiResponse({ status: 429, description: 'Too many messages' })
  @ApiResponse({ status: 503, description: 'Concierge not configured' })
  async send(
    @Body() dto: SendChatMessageDto,
    @CurrentUser() user: User | null,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.streamChat({
      conversationId: dto.conversationId,
      message: dto.message,
      user,
      response: res,
    });
  }

  @Get('conversations/:id/messages')
  @Public()
  @ApiOperation({ summary: 'Replay a conversation history (ownership-gated)' })
  getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User | null,
  ) {
    return this.chatService.getMessages(id, user);
  }
}
