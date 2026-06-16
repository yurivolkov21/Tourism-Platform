import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Injects the local DB `User` row for the caller (attached by `SupabaseJwtGuard`).
 * Returns `null` when the user has authenticated but not yet synced — handlers
 * must handle that (throw `USER_NOT_SYNCED` or call sync).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.currentUser ?? null;
  },
);

/**
 * Injects the verified Supabase identity (JWT subset) without requiring a local
 * row. Use in flows where the row may not exist yet (e.g. `/auth/sync`).
 */
export const SupabaseIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.supabaseUser ?? null;
  },
);
