import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { SupabaseAuthIdentity } from '../../common/types/authenticated-request';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

const identity = (email: string): SupabaseAuthIdentity => ({
  sub: 'sub-1',
  email,
  emailVerified: true,
  raw: {},
});

function make(adminEmails: string[]) {
  const upsert = jest
    .fn()
    .mockImplementation(({ create }: { create: Record<string, unknown> }) =>
      Promise.resolve({ id: 'u1', role: UserRole.CUSTOMER, ...create }),
    );
  const prisma = { user: { upsert } } as unknown as PrismaService;
  const config = {
    get: (k: string) => (k === 'supabase.adminEmails' ? adminEmails : undefined),
  } as unknown as ConfigService;
  return { svc: new AuthService(prisma, config), upsert };
}

describe('AuthService', () => {
  it('syncCustomer upserts CUSTOMER, lowercases email, trims name, omits role on update', async () => {
    const { svc, upsert } = make([]);
    await svc.syncCustomer(identity('A@X.com'), { fullName: '  Jo  ' });

    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ supabaseId: 'sub-1' });
    expect(arg.create.role).toBe(UserRole.CUSTOMER);
    expect(arg.create.email).toBe('a@x.com');
    expect(arg.create.fullName).toBe('Jo');
    expect(arg.update.role).toBeUndefined(); // customer sync never touches role
  });

  it('syncAdmin rejects a non-allowlisted email (no upsert)', async () => {
    const { svc, upsert } = make(['admin@x.com']);
    await expect(svc.syncAdmin(identity('nope@x.com'), {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('syncAdmin promotes an allowlisted email to ADMIN (create + update)', async () => {
    const { svc, upsert } = make(['admin@x.com']);
    await svc.syncAdmin(identity('Admin@x.com'), {});

    const arg = upsert.mock.calls[0][0];
    expect(arg.create.role).toBe(UserRole.ADMIN);
    expect(arg.update.role).toBe(UserRole.ADMIN);
  });
});
