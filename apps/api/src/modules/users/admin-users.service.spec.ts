import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaService } from '../media/media.service';
import type { UsersService } from './users.service';
import { AdminUsersService } from './admin-users.service';

interface Mocks {
  user?: Record<string, unknown>;
  booking?: Record<string, unknown>;
  review?: Record<string, unknown>;
  wishlist?: Record<string, unknown>;
  $transaction?: jest.Mock;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({ ...USER_ROW, id: where.id, ...data }),
      ),
      delete: jest.fn(),
      ...m.user,
    },
    booking: { count: jest.fn().mockResolvedValue(0), ...m.booking },
    review: { count: jest.fn().mockResolvedValue(0), ...m.review },
    wishlist: { count: jest.fn().mockResolvedValue(0), ...m.wishlist },
    $transaction:
      m.$transaction ??
      jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as PrismaService;
}

function makeConfig(adminEmails: string[] = []) {
  return {
    get: (k: string) => (k === 'supabase.adminEmails' ? adminEmails : undefined),
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

function svcWith(
  prisma: PrismaService,
  adminEmails: string[] = [],
  media = makeMedia(),
): AdminUsersService {
  return new AdminUsersService(
    prisma,
    makeConfig(adminEmails),
    media,
    undefined as unknown as UsersService,
  );
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
      const prisma = makePrisma({ user: { findMany, count: jest.fn().mockResolvedValue(0) } });

      await svcWith(prisma).list({ role: UserRole.ADMIN, search: 'jane' } as never);

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
        user: { findUnique: jest.fn().mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN }) },
        booking: { count: jest.fn().mockResolvedValue(4) },
        review: { count: jest.fn().mockResolvedValue(2) },
        wishlist: { count: jest.fn().mockResolvedValue(5) },
      });
      const media = makeMedia({
        attachToOwner: jest.fn().mockImplementation((_t: unknown, o: object) =>
          Promise.resolve({ ...o, media: [{ url: 'https://cdn/avatar.jpg' }] }),
        ),
      });

      const res = await svcWith(prisma, ['jane@example.com'], media).detail('u-1', 'caller-9');

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
      await expect(svcWith(makePrisma()).detail('nope', 'c')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
