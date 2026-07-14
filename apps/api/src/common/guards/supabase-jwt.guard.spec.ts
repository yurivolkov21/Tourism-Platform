import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';

// jose is ESM-only — mock the whole surface the guard touches so the CJS jest
// runtime never loads the real package.
const mockJwtVerify = jest.fn();
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  decodeProtectedHeader: jest.fn(() => ({ alg: 'ES256' })),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  errors: { JOSEError: class JOSEError extends Error {} },
}));

import { SupabaseJwtGuard } from './supabase-jwt.guard';

function makeGuard(overrides?: { isPublic?: boolean }) {
  const reflector = {
    getAllAndOverride: jest.fn(() => overrides?.isPublic ?? false),
  };
  const config = {
    getOrThrow: jest.fn(() => 'https://example.supabase.co/auth/v1/jwks'),
    get: jest.fn(() => ''),
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
  };
  const guard = new SupabaseJwtGuard(
    reflector as never,
    config as never,
    prisma as never,
  );
  return { guard, prisma };
}

function makeContext(authorization?: string) {
  const req: Record<string, unknown> = { headers: { authorization } };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('SupabaseJwtGuard — optional identity on @Public routes', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it('allows a public request without a token and attaches nothing', async () => {
    const { guard, prisma } = makeGuard({ isPublic: true });
    const { context, req } = makeContext(undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.currentUser).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('attaches the user on a public request with a VALID token', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'sb-1', email: 'a@b.co' },
    });
    const { guard, prisma } = makeGuard({ isPublic: true });
    const { context, req } = makeContext('Bearer good-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: 'sb-1' },
    });
    expect(req.currentUser).toEqual({ id: 'user-1' });
  });

  it('stays anonymous (still allowed) on a public request with an INVALID token', async () => {
    mockJwtVerify.mockRejectedValue(new Error('expired'));
    const { guard, prisma } = makeGuard({ isPublic: true });
    const { context, req } = makeContext('Bearer bad-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.currentUser).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('still rejects a protected request without a token', async () => {
    const { guard } = makeGuard({ isPublic: false });
    const { context } = makeContext(undefined);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
