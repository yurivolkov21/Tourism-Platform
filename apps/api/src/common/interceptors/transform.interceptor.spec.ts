import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const ctx = {
  getHandler: () => ({}),
  getClass: () => ({}),
} as unknown as ExecutionContext;

const reflector = (skip: boolean) =>
  ({ getAllAndOverride: () => skip }) as unknown as Reflector;

async function run(payload: unknown, skip = false): Promise<unknown> {
  const interceptor = new TransformInterceptor(reflector(skip));
  const next = { handle: () => of(payload) } as CallHandler;
  return lastValueFrom(interceptor.intercept(ctx, next));
}

describe('TransformInterceptor', () => {
  it('wraps a plain value as { data, error: null }', async () => {
    await expect(run({ id: '1' })).resolves.toEqual({
      data: { id: '1' },
      error: null,
    });
  });

  it('wraps null', async () => {
    await expect(run(null)).resolves.toEqual({ data: null, error: null });
  });

  it('hoists { items, meta } to { data, error, meta }', async () => {
    await expect(run({ items: [1, 2], meta: { total: 2 } })).resolves.toEqual({
      data: [1, 2],
      error: null,
      meta: { total: 2 },
    });
  });

  it('passes an already-shaped envelope through unchanged', async () => {
    const env = { data: 1, error: null };
    await expect(run(env)).resolves.toBe(env);
  });

  it('skips wrapping when @SkipTransform is set', async () => {
    const raw = { received: true };
    await expect(run(raw, true)).resolves.toBe(raw);
  });
});
