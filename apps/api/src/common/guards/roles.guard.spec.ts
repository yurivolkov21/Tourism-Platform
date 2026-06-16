import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function ctxWith(currentUser: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ currentUser }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

const reflectorWith = (roles: UserRole[] | undefined) =>
  ({ getAllAndOverride: () => roles }) as unknown as Reflector;

describe('RolesGuard', () => {
  it('allows when there is no @Roles metadata', () => {
    const guard = new RolesGuard(reflectorWith(undefined));
    expect(guard.canActivate(ctxWith({ role: UserRole.CUSTOMER }))).toBe(true);
  });

  it('throws 401 when a role is required but no synced user is attached', () => {
    const guard = new RolesGuard(reflectorWith([UserRole.ADMIN]));
    expect(() => guard.canActivate(ctxWith(null))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws 403 when the user role is not in the allowed list', () => {
    const guard = new RolesGuard(reflectorWith([UserRole.ADMIN]));
    expect(() =>
      guard.canActivate(ctxWith({ role: UserRole.CUSTOMER })),
    ).toThrow(ForbiddenException);
  });

  it('allows when the user role matches one of the allowed roles', () => {
    const guard = new RolesGuard(
      reflectorWith([UserRole.ADMIN, UserRole.CUSTOMER]),
    );
    expect(guard.canActivate(ctxWith({ role: UserRole.CUSTOMER }))).toBe(true);
  });
});
