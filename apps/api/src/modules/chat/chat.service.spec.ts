import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

// `ai` + `@ai-sdk/anthropic` are ESM-only — mocked wholesale (jest CJS runtime).
const mockStreamText = jest.fn();
const mockToUIMessageStream = jest.fn();
const mockPipe = jest.fn();
const mockValidate = jest.fn();
jest.mock('ai', () => ({
  tool: (def: unknown) => def,
  streamText: (...args: unknown[]) => mockStreamText(...args),
  toUIMessageStream: (...args: unknown[]) => mockToUIMessageStream(...args),
  pipeUIMessageStreamToResponse: (...args: unknown[]) => mockPipe(...args),
  validateUIMessages: (...args: unknown[]) => mockValidate(...args),
  convertToModelMessages: (messages: unknown) => messages,
  stepCountIs: (n: number) => ({ maxSteps: n }),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => (modelId: string) => ({ modelId })),
}));

import { ChatService } from './chat.service';

const GUEST_CONVO = { id: 'convo-1', userId: null };
const OWNED_CONVO = { id: 'convo-2', userId: 'user-1' };

function userMessage(text: string, id = 'm-new') {
  return { id, role: 'user', parts: [{ type: 'text', text }] };
}

function makeService(overrides?: { apiKey?: string | undefined }) {
  const prisma = {
    chatConversation: {
      findUnique: jest.fn().mockResolvedValue(GUEST_CONVO),
      create: jest.fn().mockResolvedValue({ id: 'convo-new', userId: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    chatMessage: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'chat.anthropicApiKey')
        return overrides && 'apiKey' in overrides
          ? overrides.apiKey
          : 'sk-test';
      if (key === 'chat.model') return 'claude-haiku-4-5';
      return undefined;
    }),
  };
  const toursService = {
    findPublicList: jest.fn(),
    findPublicBySlug: jest.fn(),
  };
  const enquiryService = { create: jest.fn() };
  const service = new ChatService(
    prisma as never,
    config as never,
    toursService as never,
    enquiryService as never,
  );
  const response = { setHeader: jest.fn() };
  return { service, prisma, response };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockValidate.mockImplementation(({ messages }: { messages: unknown[] }) =>
    Promise.resolve(messages),
  );
  mockStreamText.mockReturnValue({ stream: 'model-stream' });
  mockToUIMessageStream.mockReturnValue('ui-stream');
});

describe('ChatService.streamChat', () => {
  it('answers 503 CHAT_UNAVAILABLE when no API key is configured', async () => {
    const { service, response } = makeService({ apiKey: undefined });
    await expect(
      service.streamChat({
        message: userMessage('hi there'),
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockPipe).not.toHaveBeenCalled();
  });

  it('creates a conversation bound to the logged-in user when no id is sent', async () => {
    const { service, prisma, response } = makeService();
    await service.streamChat({
      message: userMessage('hello'),
      user: { id: 'user-1' } as never,
      response: response as never,
    });
    expect(prisma.chatConversation.create).toHaveBeenCalledWith({
      data: { userId: 'user-1' },
    });
    expect(mockPipe).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-conversation-id': 'convo-new' }),
      }),
    );
  });

  it('creates the conversation under the client-minted id when unknown', async () => {
    const { service, prisma, response } = makeService();
    prisma.chatConversation.findUnique.mockResolvedValue(null);
    prisma.chatConversation.create.mockResolvedValue({
      id: 'client-uuid',
      userId: null,
    });
    await service.streamChat({
      conversationId: 'client-uuid',
      message: userMessage('hello'),
      user: null,
      response: response as never,
    });
    expect(prisma.chatConversation.create).toHaveBeenCalledWith({
      data: { id: 'client-uuid', userId: null },
    });
  });

  it('404s a replay of an unknown conversation id', async () => {
    const { service, prisma } = makeService();
    prisma.chatConversation.findUnique.mockResolvedValue(null);
    await expect(service.getMessages('missing', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids continuing an owned conversation as guest or another user', async () => {
    const { service, prisma, response } = makeService();
    prisma.chatConversation.findUnique.mockResolvedValue(OWNED_CONVO);
    const attempt = (user: { id: string } | null) =>
      service.streamChat({
        conversationId: OWNED_CONVO.id,
        message: userMessage('hello'),
        user: user as never,
        response: response as never,
      });
    await expect(attempt(null)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(attempt({ id: 'user-2' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when the conversation hit the message cap', async () => {
    const { service, prisma, response } = makeService();
    prisma.chatMessage.count.mockResolvedValue(200);
    await expect(
      service.streamChat({
        conversationId: GUEST_CONVO.id,
        message: userMessage('hello'),
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects non-text parts and oversized raw payloads (smuggling guard)', async () => {
    const { service, response } = makeService();
    await expect(
      service.streamChat({
        message: {
          id: 'm',
          role: 'user',
          parts: [
            { type: 'text', text: 'look at this' },
            { type: 'file', url: 'data:application/octet-stream;base64,AAAA' },
          ],
        },
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.streamChat({
        message: {
          id: 'm',
          role: 'user',
          parts: [{ type: 'text', text: 'ok', extra: 'y'.repeat(9000) }],
        },
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falls back to the winner row when losing a create race on a fresh id', async () => {
    const { service, prisma, response } = makeService();
    prisma.chatConversation.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(GUEST_CONVO);
    prisma.chatConversation.create.mockRejectedValue(
      new Error('Unique constraint failed'),
    );
    await service.streamChat({
      conversationId: GUEST_CONVO.id,
      message: userMessage('hello'),
      user: null,
      response: response as never,
    });
    expect(mockPipe).toHaveBeenCalled();
  });

  it('rejects a non-user role or an oversized message', async () => {
    const { service, response } = makeService();
    await expect(
      service.streamChat({
        message: {
          id: 'm',
          role: 'assistant',
          parts: [{ type: 'text', text: 'hi' }],
        },
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.streamChat({
        message: userMessage('x'.repeat(2001)),
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('streams with guardrail caps and persists only the new tail on end', async () => {
    const { service, prisma, response } = makeService();
    const history = [
      { id: 'h1', role: 'user', parts: [{ type: 'text', text: 'old q' }] },
      { id: 'h2', role: 'assistant', parts: [{ type: 'text', text: 'old a' }] },
    ];
    prisma.chatMessage.count.mockResolvedValue(2);
    // Service loads newest-first (desc + take) and re-reverses to chronological.
    prisma.chatMessage.findMany.mockResolvedValue(
      history.map((m, i) => ({ payload: m, seq: i })).reverse(),
    );

    await service.streamChat({
      conversationId: GUEST_CONVO.id,
      message: userMessage('new question'),
      user: null,
      response: response as never,
    });

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.maxOutputTokens).toBe(800);
    expect(callArgs.stopWhen).toEqual({ maxSteps: 4 });
    expect(callArgs.system).toContain('Nexora');
    expect(callArgs.messages).toHaveLength(3); // history(2) + new(1)

    // Simulate stream end: onEnd receives the FULL message list incl. reply.
    const { onEnd } = mockToUIMessageStream.mock.calls[0][0];
    await onEnd({
      messages: [
        ...history,
        userMessage('new question'),
        {
          id: 'a-1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'answer' }],
        },
      ],
    });
    expect(prisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          conversationId: 'convo-1',
          seq: 2,
          role: 'USER',
        }),
        expect.objectContaining({
          conversationId: 'convo-1',
          seq: 3,
          role: 'ASSISTANT',
        }),
      ],
    });
  });

  it('maps validateUIMessages failures to a 400', async () => {
    const { service, response } = makeService();
    mockValidate.mockRejectedValue(new Error('bad shape'));
    await expect(
      service.streamChat({
        message: userMessage('hello'),
        user: null,
        response: response as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ChatService.getMessages', () => {
  it('replays payloads for an accessible conversation', async () => {
    const { service, prisma } = makeService();
    prisma.chatMessage.findMany.mockResolvedValue([
      { payload: { id: 'h1', role: 'user', parts: [] }, seq: 0 },
    ]);
    await expect(service.getMessages(GUEST_CONVO.id, null)).resolves.toEqual({
      conversationId: GUEST_CONVO.id,
      messages: [{ id: 'h1', role: 'user', parts: [] }],
    });
  });

  it('enforces ownership on replay', async () => {
    const { service, prisma } = makeService();
    prisma.chatConversation.findUnique.mockResolvedValue(OWNED_CONVO);
    await expect(
      service.getMessages(OWNED_CONVO.id, null),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
