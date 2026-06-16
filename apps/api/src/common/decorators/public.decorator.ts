import { SetMetadata } from '@nestjs/common';

/** Reflector key read by `SupabaseJwtGuard` to detect `@Public()` routes. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as publicly accessible. The auth guard is
 * global (`APP_GUARD`), so by default every route needs a valid Supabase JWT;
 * `@Public()` opts a handler out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
