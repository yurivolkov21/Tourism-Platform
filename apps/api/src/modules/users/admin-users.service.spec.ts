import { ConflictException, NotFoundException } from '@nestjs/common';
import { MediaOwnerType, UserRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaService } from '../media/media.service';
import type { UsersService } from './users.service';
import { AdminUsersService } from './admin-users.service';

interface Mocks {
  user?: Record<string, unknown>;
  booking?: Record<string, unknown>;
  review?: Record<string, unknown>;
  wishlist?: Record<string, unknown>;
  post?: Record<string, unknown>;
  $queryRaw?: jest.Mock;
  $transaction?: jest.Mock;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest
        .fn()
        .mockImplementation(({ where, data }) =>
          Promise.resolve({ ...USER_ROW, id: where.id, ...data }),
        ),
      delete: jest.fn(),
      ...m.user,
    },
    booking: { count: jest.fn().mockResolvedValue(0), ...m.booking },
    review: { count: jest.fn().mockResolvedValue(0), ...m.review },
    wishlist: { count: jest.fn().mockResolvedValue(0), ...m.wishlist },
    post: { count: jest.fn().mockResolvedValue(0), ...m.post },
    $queryRaw: m.$queryRaw ?? jest.fn().mockResolvedValue([{ id: 'a-1' }]),
    $transaction:
      m.$transaction ??
      jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as PrismaService;
}

function makeConfig(adminEmails: string[] = []) {
  return {
    get: (k: string) =>
      k === 'supabase.adminEmails' ? adminEmails : undefined,
  } as unknown as import('@nestjs/config').ConfigService;
}

function makeMedia(over: Record<string, unknown> = {}) {
  return {
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: object) =>
        Promise.resolve({ ...owner, media: [] }),
      ),
    deleteForOwner: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as MediaService;
}

function makeUsers(over: Record<string, unknown> = {}) {
  return {
    deleteSupabaseUser: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as UsersService;
}

function svcWith(
  prisma: PrismaService,
  adminEmails: string[] = [],
  media = makeMedia(),
  users = makeUsers(),
): AdminUsersService {
  return new AdminUsersService(prisma, makeConfig(adminEmails), media, users);
}

const USER_ROW = {
  id: 'u-1',
  supabaseId: 'sub-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  phone: null,
  locale: 'en',
  role: UserRole.CUSTOMER,
  createdAt: new Date('2026-01-05T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

describe('AdminUsersService', () => {
  describe('list', () => {
    it('maps rows with bookingsCount, strips _count, newest first', async () => {
      const findMany = jest
        .fn()
        .mockResolvedValue([{ ...USER_ROW, _count: { bookings: 3 } }]);
      const prisma = makePrisma({
        user: { findMany, count: jest.fn().mockResolvedValue(1) },
      });

      const res = await svcWith(prisma).list({});

      expect(res.items[0]).toEqual({
        id: 'u-1',
        email: 'jane@example.com',
        fullName: 'Jane Doe',
        phone: null,
        role: UserRole.CUSTOMER,
        createdAt: '2026-01-05T00:00:00.000Z',
        bookingsCount: 3,
      });
      expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
      expect(findMany.mock.calls[0][0].include).toEqual({
        _count: { select: { bookings: true } },
      });
    });

    it('AND-composes role filter with search over name/email', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        user: { findMany, count: jest.fn().mockResolvedValue(0) },
      });

      await svcWith(prisma).list({
        role: UserRole.ADMIN,
        search: 'jane',
      } as never);

      const where = findMany.mock.calls[0][0].where;
      expect(where.role).toBe(UserRole.ADMIN);
      expect(where.OR).toEqual([
        { fullName: { contains: 'jane', mode: 'insensitive' } },
        { email: { contains: 'jane', mode: 'insensitive' } },
      ]);
    });
  });

  describe('detail', () => {
    it('returns counts, avatar, isEnvAdmin and isSelf', async () => {
      const prisma = makePrisma({
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN }),
        },
        booking: { count: jest.fn().mockResolvedValue(4) },
        review: { count: jest.fn().mockResolvedValue(2) },
        wishlist: { count: jest.fn().mockResolvedValue(5) },
      });
      const media = makeMedia({
        attachToOwner: jest.fn().mockImplementation((_t: unknown, o: object) =>
          Promise.resolve({
            ...o,
            media: [{ url: 'https://cdn/avatar.jpg' }],
          }),
        ),
      });

      const res = await svcWith(prisma, ['jane@example.com'], media).detail(
        'u-1',
        'caller-9',
      );

      expect(res.avatarUrl).toBe('https://cdn/avatar.jpg');
      expect(res.counts).toEqual({ bookings: 4, reviews: 2, wishlist: 5 });
      expect(res.isEnvAdmin).toBe(true);
      expect(res.isSelf).toBe(false);
      expect(res.locale).toBe('en');
    });

    it('flags isSelf when the caller opens their own detail', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
      });
      const res = await svcWith(prisma).detail('u-1', 'u-1');
      expect(res.isSelf).toBe(true);
      expect(res.isEnvAdmin).toBe(false);
    });

    it('404s on an unknown id', async () => {
      await expect(
        svcWith(makePrisma()).detail('nope', 'c'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changeRole', () => {
    const admin = {
      ...USER_ROW,
      id: 'a-1',
      role: UserRole.ADMIN,
      email: 'boss@x.com',
    };

    it('promotes a customer to ADMIN', async () => {
      const update = jest.fn().mockResolvedValue({
        ...USER_ROW,
        role: UserRole.ADMIN,
        _count: undefined,
      });
      const queryRaw = jest.fn();
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW), update },
        booking: { count: jest.fn().mockResolvedValue(0) },
        $queryRaw: queryRaw,
      });
      const res = await svcWith(prisma).changeRole(
        'u-1',
        'caller-9',
        UserRole.ADMIN,
      );
      expect(update.mock.calls[0][0]).toMatchObject({
        where: { id: 'u-1' },
        data: { role: UserRole.ADMIN },
      });
      expect(res.role).toBe(UserRole.ADMIN);
      expect(queryRaw).not.toHaveBeenCalled();
    });

    it('blocks changing your own role (ROLE_SELF_CHANGE)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
      });
      await expect(
        svcWith(prisma).changeRole('u-1', 'u-1', UserRole.ADMIN),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks demoting an env-admin (ROLE_ENV_ADMIN)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(admin) },
      });
      await expect(
        svcWith(prisma, ['boss@x.com']).changeRole(
          'a-1',
          'caller-9',
          UserRole.CUSTOMER,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks demoting the last ADMIN via an empty claim (ROLE_LAST_ADMIN)', async () => {
      const queryRaw = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(admin) },
        $queryRaw: queryRaw,
      });
      await expect(
        svcWith(prisma).changeRole('a-1', 'caller-9', UserRole.CUSTOMER),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(queryRaw).toHaveBeenCalled();
    });

    it('demotes a non-last, non-env admin via the locking-CTE claim, then re-fetches for the DTO', async () => {
      const queryRaw = jest.fn().mockResolvedValue([{ id: 'a-1' }]);
      const findUnique = jest
        .fn()
        .mockResolvedValueOnce(admin) // pre-check read
        .mockResolvedValueOnce({ ...admin, role: UserRole.CUSTOMER }); // re-fetch after claim
      const update = jest.fn();
      const prisma = makePrisma({
        user: { findUnique, update },
        booking: { count: jest.fn().mockResolvedValue(0) },
        $queryRaw: queryRaw,
      });
      const res = await svcWith(prisma).changeRole(
        'a-1',
        'caller-9',
        UserRole.CUSTOMER,
      );
      expect(queryRaw).toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(findUnique).toHaveBeenCalledTimes(2);
      expect(res.role).toBe(UserRole.CUSTOMER);
    });

    it('self-change and env-admin pre-checks fire before any claim is attempted', async () => {
      const selfQueryRaw = jest.fn();
      const selfPrisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(admin) },
        $queryRaw: selfQueryRaw,
      });
      await expect(
        svcWith(selfPrisma).changeRole('a-1', 'a-1', UserRole.CUSTOMER),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(selfQueryRaw).not.toHaveBeenCalled();

      const envQueryRaw = jest.fn();
      const envPrisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(admin) },
        $queryRaw: envQueryRaw,
      });
      await expect(
        svcWith(envPrisma, ['boss@x.com']).changeRole(
          'a-1',
          'caller-9',
          UserRole.CUSTOMER,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(envQueryRaw).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('deletes a bookings-free customer: media cleanup + conditional row delete in a tx + Supabase auth delete', async () => {
      const del = jest.fn().mockResolvedValue({ count: 1 });
      const $transaction = jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
          fn({ user: { deleteMany: del } }),
        );
      const media = makeMedia();
      const users = makeUsers();
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        $transaction,
      });

      const res = await svcWith(prisma, [], media, users).deleteUser(
        'u-1',
        'caller-9',
      );

      expect(res).toEqual({ id: 'u-1', email: 'jane@example.com' });
      expect(
        (media as unknown as { deleteForOwner: jest.Mock }).deleteForOwner,
      ).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.USER, 'u-1');
      // Role-conditional delete: the in-tx claim is what makes a concurrent
      // promote unable to slip an ADMIN row into the delete (last-admin
      // invariant, wave D2 adversarial-review fix).
      expect(del).toHaveBeenCalledWith({
        where: { id: 'u-1', role: UserRole.CUSTOMER },
      });
      expect(
        (users as unknown as { deleteSupabaseUser: jest.Mock })
          .deleteSupabaseUser,
      ).toHaveBeenCalledWith('sub-1');
    });

    it('409s (USER_IS_ADMIN) when the target was promoted between the pre-check and the tx delete', async () => {
      const del = jest.fn().mockResolvedValue({ count: 0 });
      const $transaction = jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
          fn({ user: { deleteMany: del } }),
        );
      const users = makeUsers();
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        $transaction,
      });

      await expect(
        svcWith(prisma, [], makeMedia(), users).deleteUser('u-1', 'caller-9'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        (users as unknown as { deleteSupabaseUser: jest.Mock })
          .deleteSupabaseUser,
      ).not.toHaveBeenCalled();
    });

    it('blocks self-delete (USER_SELF_DELETE)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
      });
      await expect(
        svcWith(prisma).deleteUser('u-1', 'u-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks deleting an ADMIN (USER_IS_ADMIN)', async () => {
      const prisma = makePrisma({
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN }),
        },
      });
      await expect(
        svcWith(prisma).deleteUser('u-1', 'c'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks when the user has bookings (ACCOUNT_HAS_BOOKINGS)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        booking: { count: jest.fn().mockResolvedValue(2) },
      });
      await expect(
        svcWith(prisma).deleteUser('u-1', 'c'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks a posts author (USER_HAS_POSTS)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        post: { count: jest.fn().mockResolvedValue(1) },
      });
      await expect(
        svcWith(prisma).deleteUser('u-1', 'c'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s on an unknown id', async () => {
      await expect(
        svcWith(makePrisma()).deleteUser('nope', 'c'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
