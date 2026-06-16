import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Enforces `@Roles(...)` against the local `User.role`. MUST run AFTER
 * `SupabaseJwtGuard` (which attaches `req.currentUser`). Routes without
 * `@Roles()` pass through — role-less means "any authenticated user", not
 * "anyone". (Ported from the donor.)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.currentUser;

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'User not synced — call POST /auth/sync first',
      });
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Requires role: ${required.join(' or ')}`,
      });
    }

    return true;
  }
}
