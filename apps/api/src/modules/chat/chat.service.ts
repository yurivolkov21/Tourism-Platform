import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from 'ai';
import type { ServerResponse } from 'http';
import type { ChatRole, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { EnquiryService } from '../enquiry/enquiry.service';
import { ToursService } from '../tours/tours.service';
import { canAccessConversation } from './ownership';
import { windowHistory } from './shape';
import { buildSystemPrompt } from './system-prompt';
import { buildChatTools, type ChatTools } from './tools';

/** Hard spend/abuse caps — every request is bounded server-side (spec §caps). */
const HISTORY_WINDOW = 20;
const MAX_STEPS = 4;
const MAX_OUTPUT_TOKENS = 800;
const MAX_MESSAGE_CHARS = 2000;
const MAX_MESSAGES_PER_CONVERSATION = 200;

interface StreamChatInput {
  conversationId?: string;
  message: unknown;
  user: User | null;
  response: ServerResponse;
}

/**
 * AI concierge (spec: docs/06-specs/2026-07-14-ai-concierge-chat-design.md).
 * History is server-authoritative: the client sends only its NEW message plus
 * the conversation id; prior turns are loaded from Postgres, the reply streams
 * back as an AI SDK UIMessage stream over the raw Express response (the first
 * SSE surface in this API — `@Res()` bypasses the Transform envelope).
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly tools: ChatTools;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    toursService: ToursService,
    enquiryService: EnquiryService,
  ) {
    this.tools = buildChatTools({ toursService, enquiryService });
  }

  async streamChat(input: StreamChatInput): Promise<void> {
    const apiKey = this.config.get<string>('chat.anthropicApiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'CHAT_UNAVAILABLE',
        message: 'The AI concierge is not configured on this environment.',
      });
    }

    const conversation = await this.resolveConversation(
      input.conversationId,
      input.user,
    );

    const persistedCount = await this.prisma.chatMessage.count({
      where: { conversationId: conversation.id },
    });
    if (persistedCount >= MAX_MESSAGES_PER_CONVERSATION) {
      throw new ConflictException({
        code: 'CHAT_CONVERSATION_FULL',
        message: 'This conversation is full — start a new one.',
      });
    }

    this.assertIncomingUserMessage(input.message);

    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { seq: 'asc' },
      select: { payload: true },
    });
    const history = rows.map((row) => row.payload as unknown as UIMessage);

    let validated: UIMessage[];
    try {
      validated = await validateUIMessages({
        messages: [...history, input.message as UIMessage],
        // Typed tool generics don't satisfy the loose validation signature.
        tools: this.tools as unknown as Parameters<
          typeof validateUIMessages
        >[0]['tools'],
      });
    } catch {
      throw new BadRequestException({
        code: 'CHAT_INVALID_MESSAGE',
        message: 'The chat message payload is not a valid UI message.',
      });
    }

    const anthropic = createAnthropic({ apiKey });
    const model = this.config.get<string>('chat.model') ?? 'claude-haiku-4-5';

    const result = streamText({
      model: anthropic(model),
      system: buildSystemPrompt({
        user: input.user,
        todayISO: new Date().toISOString().slice(0, 10),
      }),
      messages: await convertToModelMessages(
        windowHistory(validated, HISTORY_WINDOW),
      ),
      tools: this.tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    pipeUIMessageStreamToResponse({
      response: input.response,
      headers: { 'x-conversation-id': conversation.id },
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: validated,
        onEnd: async ({ messages }: { messages: UIMessage[] }) => {
          await this.persistTail(conversation.id, persistedCount, messages);
        },
      }),
    });
  }

  async getMessages(
    conversationId: string,
    user: User | null,
  ): Promise<{ conversationId: string; messages: unknown[] }> {
    await this.resolveConversation(conversationId, user);
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { seq: 'asc' },
      select: { payload: true },
    });
    return { conversationId, messages: rows.map((row) => row.payload) };
  }

  /** Looks up (or creates) the conversation and enforces the ownership rule. */
  private async resolveConversation(
    conversationId: string | undefined,
    user: User | null,
  ): Promise<{ id: string; userId: string | null }> {
    if (!conversationId) {
      return this.prisma.chatConversation.create({
        data: { userId: user?.id ?? null },
      });
    }
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException({
        code: 'CHAT_CONVERSATION_NOT_FOUND',
        message: 'Conversation not found.',
      });
    }
    if (!canAccessConversation(conversation, user)) {
      throw new ForbiddenException({
        code: 'CHAT_CONVERSATION_FORBIDDEN',
        message: 'You do not have access to this conversation.',
      });
    }
    return conversation;
  }

  /** Cheap pre-validation before the (heavier) AI SDK schema validation. */
  private assertIncomingUserMessage(message: unknown): void {
    const candidate = message as { role?: unknown; parts?: unknown } | null;
    const parts = Array.isArray(candidate?.parts) ? candidate.parts : null;
    if (!candidate || candidate.role !== 'user' || !parts) {
      throw new BadRequestException({
        code: 'CHAT_INVALID_MESSAGE',
        message: 'Expected a single user message with parts.',
      });
    }
    const textLength = parts.reduce(
      (sum: number, part: { type?: unknown; text?: unknown }) =>
        part?.type === 'text' && typeof part.text === 'string'
          ? sum + part.text.length
          : sum,
      0,
    );
    if (textLength === 0 || textLength > MAX_MESSAGE_CHARS) {
      throw new BadRequestException({
        code: 'CHAT_MESSAGE_TOO_LONG',
        message: `Messages must be 1–${MAX_MESSAGE_CHARS} characters.`,
      });
    }
  }

  /**
   * Persists only the tail this turn produced (the incoming user message +
   * the assistant reply). Runs at stream end — a failure here must not crash
   * the already-delivered stream, so it logs instead of throwing.
   */
  private async persistTail(
    conversationId: string,
    persistedCount: number,
    messages: UIMessage[],
  ): Promise<void> {
    try {
      const tail = messages.slice(persistedCount);
      if (tail.length === 0) return;
      await this.prisma.chatMessage.createMany({
        data: tail.map((message, i) => ({
          conversationId,
          seq: persistedCount + i,
          role: (message.role === 'user' ? 'USER' : 'ASSISTANT') as ChatRole,
          payload: message as never,
        })),
      });
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (err) {
      this.logger.error(
        `Failed to persist chat tail for ${conversationId}: ${(err as Error).message}`,
      );
    }
  }
}
