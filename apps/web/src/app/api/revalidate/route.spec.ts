import { revalidatePath, revalidateTag } from 'next/cache';

import { POST } from './route';

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockRevalidateTag = revalidateTag as jest.MockedFunction<
  typeof revalidateTag
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

/** Minimal Request stub — the web jsdom env has no global Request/Response. */
function req(headers: Record<string, string>, body: unknown): Request {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Request;
}

const SECRET = 's3cr3t-value';
const AUTHED = { 'x-revalidate-secret': SECRET };

describe('POST /api/revalidate', () => {
  const original = process.env.REVALIDATE_SECRET;

  beforeEach(() => {
    mockRevalidateTag.mockClear();
    mockRevalidatePath.mockClear();
    process.env.REVALIDATE_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.REVALIDATE_SECRET;
    else process.env.REVALIDATE_SECRET = original;
  });

  it('503s and does not revalidate when the server secret is unset', async () => {
    delete process.env.REVALIDATE_SECRET;
    const res = await POST(req(AUTHED, { tags: ['tours'] }));
    expect(res.status).toBe(503);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('401s on a missing or wrong secret header', async () => {
    expect((await POST(req({}, { tags: ['tours'] }))).status).toBe(401);
    expect(
      (
        await POST(
          req({ 'x-revalidate-secret': 'wrong-value!' }, { tags: ['tours'] }),
        )
      ).status,
    ).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('400s on an unknown tag WITHOUT revalidating anything (strict allow-list)', async () => {
    const res = await POST(req(AUTHED, { tags: ['tours', 'bookings'] }));
    expect(res.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('400s on an empty or unparseable body', async () => {
    expect((await POST(req(AUTHED, {}))).status).toBe(400);
    const bad = {
      headers: {
        get: (k: string) => (k === 'x-revalidate-secret' ? SECRET : null),
      },
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Request;
    expect((await POST(bad)).status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates every valid tag with immediate expiry, and paths', async () => {
    const res = await POST(
      req(AUTHED, {
        tags: ['tours', 'tour:ha-long', 'trust-stats'],
        paths: ['/blog'],
      }),
    );
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledTimes(3);
    expect(mockRevalidateTag).toHaveBeenCalledWith('tours', { expire: 0 });
    expect(mockRevalidateTag).toHaveBeenCalledWith('tour:ha-long', {
      expire: 0,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/blog');
    await expect(res.json()).resolves.toEqual({
      revalidated: true,
      tags: ['tours', 'tour:ha-long', 'trust-stats'],
      paths: ['/blog'],
    });
  });

  it('still accepts the legacy { slug } body (backward compat)', async () => {
    const res = await POST(req(AUTHED, { slug: 'ha-long' }));
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith('tour:ha-long', {
      expire: 0,
    });
  });
});
