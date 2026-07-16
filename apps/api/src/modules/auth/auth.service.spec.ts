import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import type { SupabaseAuthIdentity } from '../../common/types/authenticated-request';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

const identity = (email: string, sub = 'sub-1'): SupabaseAuthIdentity => ({
  sub,
  email,
  emailVerified: true,
  raw: {},
});

type Row = {
  id: string;
  role: UserRole;
  supabaseId: string;
  email: string;
} | null;

/**
 * Mocks the two unique-key lookups + the write. `bySub`/`byEmail` seed what `findUnique` returns for
 * the `supabaseId` / `email` queries, so each test drives a specific branch (new / known / relink).
 */
function make(
  adminEmails: string[],
  { bySub = null, byEmail = null }: { bySub?: Row; byEmail?: Row } = {},
) {
  const findUnique = jest
    .fn()
    .mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve('supabaseId' in where ? bySub : byEmail),
    );
  const create = jest
    .fn()
    .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'u-new', role: UserRole.CUSTOMER, ...data }),
    );
  const update = jest
    .fn()
    .mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        // Like real Prisma, return the current row merged with the patch — fields NOT in `data`
        // (e.g. `role` on a profile-only refresh) keep their stored value, not a mock default.
        const base = [bySub, byEmail].find((row) => row?.id === where.id) ?? {
          role: UserRole.CUSTOMER,
          supabaseId: 'x',
          email: 'x',
        };
        return Promise.resolve({ ...base, id: where.id, ...data });
      },
    );
  const outboxCreateMany = jest.fn().mockResolvedValue({ count: 1 });
  const outbox = { createMany: outboxCreateMany };
  const prisma = {
    user: { findUnique, create, update },
    outbox,
    // The `bySub` branch wraps update + outbox enqueue in a tx (email-change notice).
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({ user: { update }, outbox }),
    ),
  } as unknown as PrismaService;
  const config = {
    get: (k: string) =>
      k === 'supabase.adminEmails' ? adminEmails : undefined,
  } as unknown as ConfigService;
  return {
    svc: new AuthService(prisma, config),
    findUnique,
    create,
    update,
    outboxCreateMany,
  };
}

describe('AuthService', () => {
  it('creates a new CUSTOMER, lowercasing email + trimming name', async () => {
    const { svc, create } = make([]);
    await svc.syncCustomer(identity('A@X.com'), { fullName: '  Jo  ' });

    const arg = create.mock.calls[0][0];
    expect(arg.data.supabaseId).toBe('sub-1');
    expect(arg.data.email).toBe('a@x.com');
    expect(arg.data.fullName).toBe('Jo');
    expect(arg.data.role).toBe(UserRole.CUSTOMER);
  });

  it('refreshes a known identity (by supabaseId) without touching role on a customer sync', async () => {
    const { svc, update, create } = make([], {
      bySub: {
        id: 'u1',
        role: UserRole.CUSTOMER,
        supabaseId: 'sub-1',
        email: 'a@x.com',
      },
    });
    await svc.syncCustomer(identity('A@X.com'), { fullName: 'Jo' });

    expect(create).not.toHaveBeenCalled();
    const arg = update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'u1' });
    expect(arg.data.email).toBe('a@x.com');
    expect(arg.data.role).toBeUndefined(); // customer sync never sets role
  });

  it('enqueues an EMAIL_CHANGED notice to the OLD address when a known identity email changed', async () => {
    const { svc, outboxCreateMany } = make([], {
      bySub: {
        id: 'u1',
        role: UserRole.CUSTOMER,
        supabaseId: 'sub-1',
        email: 'old@x.com',
      },
    });
    await svc.syncCustomer(identity('New@x.com'), {});

    expect(outboxCreateMany).toHaveBeenCalledTimes(1);
    const arg = outboxCreateMany.mock.calls[0][0] as {
      data: Array<{ type: string; payload: unknown; dedupeKey: string }>;
    };
    expect(arg.data[0].type).toBe('EMAIL_CHANGED');
    expect(arg.data[0].payload).toEqual({
      oldEmail: 'old@x.com',
      newEmail: 'new@x.com',
    });
    // Fresh per-enqueue uuid (NOT keyed by email) so a repeat change back to a
    // previously-used address is never suppressed by the unique dedupeKey.
    expect(arg.data[0].dedupeKey).toMatch(/^email-changed:u1:[0-9a-f-]{36}$/);
  });

  it('does NOT enqueue a notice when the known identity email is unchanged', async () => {
    const { svc, outboxCreateMany } = make([], {
      bySub: {
        id: 'u1',
        role: UserRole.CUSTOMER,
        supabaseId: 'sub-1',
        email: 'a@x.com',
      },
    });
    await svc.syncCustomer(identity('A@X.com'), {});
    expect(outboxCreateMany).not.toHaveBeenCalled();
  });

  it('does NOT enqueue a notice on the new-user or email-relink branches', async () => {
    const created = make([]);
    await created.svc.syncCustomer(identity('brand@new.com'), {});
    expect(created.outboxCreateMany).not.toHaveBeenCalled();

    const relinked = make([], {
      byEmail: {
        id: 'seed-1',
        role: UserRole.CUSTOMER,
        supabaseId: 'placeholder',
        email: 'customer@tourism.test',
      },
    });
    await relinked.svc.syncCustomer(
      identity('customer@tourism.test', 'real-sub'),
      {},
    );
    expect(relinked.outboxCreateMany).not.toHaveBeenCalled();
  });

  it('relinks an existing email-owner to the new Supabase id instead of colliding (seeded user)', async () => {
    // A seeded row owns the email under a placeholder supabaseId; the real sign-in carries a new sub.
    const { svc, update, create } = make([], {
      bySub: null,
      byEmail: {
        id: 'seed-1',
        role: UserRole.CUSTOMER,
        supabaseId: '11111111-1111-1111-1111-111111111111',
        email: 'customer@tourism.test',
      },
    });
    await svc.syncCustomer(
      identity('customer@tourism.test', 'real-sub-99'),
      {},
    );

    expect(create).not.toHaveBeenCalled();
    const arg = update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: 'seed-1' });
    expect(arg.data.supabaseId).toBe('real-sub-99'); // relinked to the real identity
    expect(arg.data.email).toBe('customer@tourism.test');
  });

  it('syncAdmin rejects a non-allowlisted email with no matching DB-admin row (no DB write)', async () => {
    // Not on the env allowlist and no mirrored row (bySub/byEmail both null) → falls through the
    // DB-role check (which reads, but never writes) and still 403s.
    const { svc, create, update } = make(['admin@x.com']);
    await expect(svc.syncAdmin(identity('nope@x.com'), {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('syncAdmin promotes an allowlisted email to ADMIN on create', async () => {
    const { svc, create } = make(['admin@x.com']);
    await svc.syncAdmin(identity('Admin@x.com'), {});
    expect(create.mock.calls[0][0].data.role).toBe(UserRole.ADMIN);
  });

  it('syncAdmin promotes an allowlisted email to ADMIN when relinking by email', async () => {
    const { svc, update } = make(['admin@x.com'], {
      bySub: null,
      byEmail: {
        id: 'seed-admin',
        role: UserRole.CUSTOMER,
        supabaseId: 'old',
        email: 'admin@x.com',
      },
    });
    await svc.syncAdmin(identity('admin@x.com', 'new-sub'), {});
    const arg = update.mock.calls[0][0];
    expect(arg.data.supabaseId).toBe('new-sub');
    expect(arg.data.role).toBe(UserRole.ADMIN);
  });

  it('syncAdmin grants a DB-promoted admin whose email is NOT on the env allowlist', async () => {
    const { svc, update } = make([], {
      bySub: {
        id: 'u9',
        role: UserRole.ADMIN,
        supabaseId: 'sub-1',
        email: 'dbadmin@x.com',
      },
    });
    const user = await svc.syncAdmin(identity('dbadmin@x.com'), {});
    expect(update).toHaveBeenCalled();
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('syncAdmin DB-role path refreshes the profile WITHOUT writing role (revocation race)', async () => {
    // TOCTOU guard: if an admin is demoted between the role check-read and the upsert-write, a
    // forced `role: ADMIN` write would silently restore the revoked privilege. The DB-role path
    // must therefore never write `role` — the row keeps whatever role it has at write time.
    const { svc, update } = make([], {
      bySub: {
        id: 'u12',
        role: UserRole.ADMIN,
        supabaseId: 'sub-1',
        email: 'dbadmin@x.com',
      },
    });
    await svc.syncAdmin(identity('dbadmin@x.com'), { fullName: 'DB Admin' });
    const arg = update.mock.calls[0][0];
    expect(arg.data.role).toBeUndefined(); // profile refreshed, role untouched
    expect(arg.data.fullName).toBe('DB Admin');
  });

  it('syncAdmin grants via the email-relink row when no supabaseId row exists', async () => {
    const { svc } = make([], {
      byEmail: {
        id: 'u10',
        role: UserRole.ADMIN,
        supabaseId: 'old-sub',
        email: 'dbadmin@x.com',
      },
    });
    await expect(
      svc.syncAdmin(identity('dbadmin@x.com'), {}),
    ).resolves.toMatchObject({
      role: UserRole.ADMIN,
    });
  });

  it('syncAdmin still 403s a plain customer (row exists, role CUSTOMER)', async () => {
    const { svc } = make([], {
      bySub: {
        id: 'u11',
        role: UserRole.CUSTOMER,
        supabaseId: 'sub-1',
        email: 'c@x.com',
      },
    });
    await expect(svc.syncAdmin(identity('c@x.com'), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('syncAdmin 403s an unknown user not on the allowlist', async () => {
    const { svc } = make([]);
    await expect(
      svc.syncAdmin(identity('nobody@x.com'), {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
