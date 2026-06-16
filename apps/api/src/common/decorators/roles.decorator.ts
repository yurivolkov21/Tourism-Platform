import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/** Reflector key read by `RolesGuard`. */
export const ROLES_KEY = 'roles';

/**
 * Restricts a handler to users whose `role` matches one of the listed roles
 * (logical OR). `SupabaseJwtGuard` must run before `RolesGuard` so
 * `req.currentUser` is populated. Without `@Roles()`, any authenticated user
 * may access the route.
 *
 * @example
 * `@Roles(UserRole.ADMIN)`
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
