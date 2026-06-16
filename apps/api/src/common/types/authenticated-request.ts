import type { User } from '@prisma/client';
import type { Request } from 'express';

/**
 * Subset of a verified Supabase access-token payload that the auth pipeline
 * exposes downstream. Populated by `SupabaseJwtGuard` after JWT verification.
 *
 * - `sub`   — stable Supabase auth UUID; the natural key for the local mirror.
 *             Never trust the request body for this.
 * - `email` — verified email claim (case preserved; lowercased before persist).
 * - `raw`   — full decoded payload, for future claims without growing this type.
 */
export type SupabaseAuthIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  raw: Record<string, unknown>;
};

/**
 * Express `Request` augmented by the auth pipeline.
 *
 * After `SupabaseJwtGuard`: `supabaseUser` is present on protected routes;
 * `currentUser` is the matching local `users` row, or `null` if the user
 * authenticated but hasn't called `/auth/sync` yet. Both optional because
 * `@Public()` routes skip the guard — callers must narrow before use.
 */
export interface AuthenticatedRequest extends Request {
  supabaseUser?: SupabaseAuthIdentity;
  currentUser?: User | null;
}
