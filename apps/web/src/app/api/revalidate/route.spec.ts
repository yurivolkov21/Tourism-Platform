import { revalidateTag } from 'next/cache';

import { POST } from './route';

jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));
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

/** Minimal Request stub — the web jsdom env has no global Request/Response. */
function req(headers: Record<string, string>, body: unknown): Request {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Request;
}

const SECRET = 's3cr3t-value';

describe('POST /api/revalidate', () => {
  const original = process.env.REVALIDATE_SECRET;

  beforeEach(() => {
    mockRevalidateTag.mockClear();
    process.env.REVALIDATE_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.REVALIDATE_SECRET;
    else process.env.REVALIDATE_SECRET = original;
  });

  it('503s and does not revalidate when the server secret is unset', async () => {
    delete process.env.REVALIDATE_SECRET;
    const res = await POST(
      req({ 'x-revalidate-secret': SECRET }, { slug: 'x' }),
    );
    expect(res.status).toBe(503);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('401s on a missing secret header', async () => {
    const res = await POST(req({}, { slug: 'ha-long' }));
    expect(res.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('401s on a wrong secret header', async () => {
    const res = await POST(
      req({ 'x-revalidate-secret': 'wrong-value!' }, { slug: 'ha-long' }),
    );
    expect(res.status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('400s when slug is missing', async () => {
    const res = await POST(req({ 'x-revalidate-secret': SECRET }, {}));
    expect(res.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('400s on an unparseable body', async () => {
    const bad = {
      headers: {
        get: (k: string) => (k === 'x-revalidate-secret' ? SECRET : null),
      },
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Request;
    const res = await POST(bad);
    expect(res.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates the tour tag on a valid request', async () => {
    const res = await POST(
      req({ 'x-revalidate-secret': SECRET }, { slug: 'ha-long' }),
    );
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith('tour:ha-long', {
      expire: 0,
    });
    await expect(res.json()).resolves.toEqual({
      revalidated: true,
      tag: 'tour:ha-long',
    });
  });
});
