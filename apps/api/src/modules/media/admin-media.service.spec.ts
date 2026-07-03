import { ConflictException, NotFoundException } from '@nestjs/common';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MaintenanceService } from '../jobs/maintenance.service';
import { AdminMediaService } from './admin-media.service';

interface Mocks {
  mediaAsset?: Record<string, unknown>;
  mediaGarbage?: Record<string, unknown>;
  tour?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  post?: Record<string, unknown>;
  user?: Record<string, unknown>;
  $transaction?: jest.Mock;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    mediaAsset: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn(),
      ...m.mediaAsset,
    },
    mediaGarbage: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createMany: jest.fn(),
      ...m.mediaGarbage,
    },
    tour: { findMany: jest.fn().mockResolvedValue([]), ...m.tour },
    destination: { findMany: jest.fn().mockResolvedValue([]), ...m.destination },
    post: { findMany: jest.fn().mockResolvedValue([]), ...m.post },
    user: { findMany: jest.fn().mockResolvedValue([]), ...m.user },
    $transaction: m.$transaction ?? jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
}

function makeConfig() {
  return {
    getOrThrow: jest.fn().mockReturnValue('demo-cloud'),
  } as unknown as import('@nestjs/config').ConfigService;
}

function makeMaintenance(over: Record<string, unknown> = {}) {
  return {
    reconcileMedia: jest.fn().mockResolvedValue({ destroyed: 2, failed: 1 }),
    ...over,
  } as unknown as MaintenanceService;
}

function svcWith(prisma: PrismaService, maintenance = makeMaintenance()): AdminMediaService {
  return new AdminMediaService(prisma, makeConfig(), maintenance);
}

const IMAGE_ROW = {
  id: 'asset-1',
  publicId: 'tourism/tours/hero/123-hoi-an',
  type: MediaType.IMAGE,
  ownerType: MediaOwnerType.TOUR,
  ownerId: 'tour-1',
  role: MediaRole.hero,
  format: 'jpg',
  width: 1920,
  height: 1080,
  durationSec: null,
  posterId: null,
  bytes: 245000,
  sortOrder: 0,
  createdAt: new Date('2026-07-01T10:00:00Z'),
  updatedAt: new Date('2026-07-01T10:00:00Z'),
};

describe('AdminMediaService', () => {
  describe('list', () => {
    it('maps rows with built URLs and resolved owner title/slug', async () => {
      const findMany = jest.fn().mockResolvedValue([IMAGE_ROW]);
      const count = jest.fn().mockResolvedValue(1);
      const tourFindMany = jest
        .fn()
        .mockResolvedValue([{ id: 'tour-1', title: 'Hoi An Walking Tour', slug: 'hoi-an' }]);
      const prisma = makePrisma({
        mediaAsset: { findMany, count },
        tour: { findMany: tourFindMany },
      });

      const res = await svcWith(prisma).list({});

      expect(res.meta.total).toBe(1);
      expect(res.items[0]).toEqual({
        id: 'asset-1',
        publicId: 'tourism/tours/hero/123-hoi-an',
        url: 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/tourism/tours/hero/123-hoi-an',
        posterUrl: null,
        type: MediaType.IMAGE,
        role: MediaRole.hero,
        format: 'jpg',
        width: 1920,
        height: 1080,
        bytes: 245000,
        durationSec: null,
        sortOrder: 0,
        createdAt: '2026-07-01T10:00:00.000Z',
        ownerType: MediaOwnerType.TOUR,
        ownerId: 'tour-1',
        ownerTitle: 'Hoi An Walking Tour',
        ownerSlug: 'hoi-an',
      });
      // Newest first + pagination applied.
      expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
      expect(findMany.mock.calls[0][0].take).toBe(20);
    });

    it('resolves USER owners to fullName/email with a null slug', async () => {
      const row = {
        ...IMAGE_ROW,
        id: 'asset-2',
        ownerType: MediaOwnerType.USER,
        ownerId: 'user-1',
        role: MediaRole.avatar,
      };
      const prisma = makePrisma({
        mediaAsset: { findMany: jest.fn().mockResolvedValue([row]), count: jest.fn().mockResolvedValue(1) },
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'user-1', fullName: null, email: 'jane@example.com' }]),
        },
      });

      const res = await svcWith(prisma).list({});

      expect(res.items[0].ownerTitle).toBe('jane@example.com');
      expect(res.items[0].ownerSlug).toBeNull();
    });

    it('AND-composes ownerType/role/type filters', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({ mediaAsset: { findMany, count: jest.fn().mockResolvedValue(0) } });

      await svcWith(prisma).list({
        ownerType: MediaOwnerType.DESTINATION,
        role: MediaRole.gallery,
        type: MediaType.IMAGE,
      } as never);

      const where = findMany.mock.calls[0][0].where;
      expect(where.ownerType).toBe(MediaOwnerType.DESTINATION);
      expect(where.role).toBe(MediaRole.gallery);
      expect(where.type).toBe(MediaType.IMAGE);
    });

    it('search ORs publicId with owner-title matches resolved per type', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const tourFindMany = jest.fn().mockResolvedValue([{ id: 'tour-9' }]);
      const prisma = makePrisma({
        mediaAsset: { findMany, count: jest.fn().mockResolvedValue(0) },
        tour: { findMany: tourFindMany },
      });

      await svcWith(prisma).list({ search: 'hoi an' } as never);

      // Owner-id lookup queried tours by title.
      expect(tourFindMany.mock.calls[0][0].where.title).toEqual({
        contains: 'hoi an',
        mode: 'insensitive',
      });
      const or = findMany.mock.calls[0][0].where.OR;
      expect(or[0]).toEqual({ publicId: { contains: 'hoi an', mode: 'insensitive' } });
      expect(or).toContainEqual({
        ownerType: MediaOwnerType.TOUR,
        ownerId: { in: ['tour-9'] },
      });
      // Types with no matching owners contribute no clause (destination/post/user mocks return []).
      expect(or).toHaveLength(2);
    });
  });

  describe('deleteAsset', () => {
    it('queues garbage (with video poster) and deletes atomically', async () => {
      const videoRow = {
        ...IMAGE_ROW,
        id: 'asset-3',
        publicId: 'tourism/tours/video/123-clip',
        type: MediaType.VIDEO,
        posterId: 'tourism/tours/video/123-poster',
      };
      const createMany = jest.fn();
      const del = jest.fn();
      const $transaction = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        mediaAsset: { findUnique: jest.fn().mockResolvedValue(videoRow), delete: del },
        mediaGarbage: { createMany },
        $transaction,
      });

      const res = await svcWith(prisma).deleteAsset('asset-3');

      expect(res).toEqual({ id: 'asset-3', publicId: 'tourism/tours/video/123-clip' });
      expect(createMany.mock.calls[0][0]).toEqual({
        data: [
          { publicId: 'tourism/tours/video/123-clip', resourceType: 'video' },
          { publicId: 'tourism/tours/video/123-poster', resourceType: 'image' },
        ],
        skipDuplicates: true,
      });
      expect(del.mock.calls[0][0]).toEqual({ where: { id: 'asset-3' } });
      // Batch transaction (array form) — garbage insert + delete together.
      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects USER-owned assets with 409', async () => {
      const avatar = { ...IMAGE_ROW, id: 'asset-4', ownerType: MediaOwnerType.USER };
      const prisma = makePrisma({
        mediaAsset: { findUnique: jest.fn().mockResolvedValue(avatar) },
      });
      await expect(svcWith(prisma).deleteAsset('asset-4')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('404s on an unknown id', async () => {
      const prisma = makePrisma();
      await expect(svcWith(prisma).deleteAsset('asset-nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('garbage', () => {
    it('lists the queue oldest first with ISO dates', async () => {
      const prisma = makePrisma({
        mediaGarbage: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'g-1',
              publicId: 'tourism/x',
              resourceType: 'image',
              attempts: 2,
              lastError: 'boom',
              createdAt: new Date('2026-07-02T12:00:00Z'),
            },
          ]),
          count: jest.fn().mockResolvedValue(1),
        },
      });

      const res = await svcWith(prisma).listGarbage({});

      expect(res.items[0]).toEqual({
        id: 'g-1',
        publicId: 'tourism/x',
        resourceType: 'image',
        attempts: 2,
        lastError: 'boom',
        createdAt: '2026-07-02T12:00:00.000Z',
      });
      const prismaGarbage = (prisma as unknown as { mediaGarbage: { findMany: jest.Mock } })
        .mediaGarbage;
      expect(prismaGarbage.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    });

    it('runReconcile passes through to MaintenanceService', async () => {
      const maintenance = makeMaintenance();
      const res = await svcWith(makePrisma(), maintenance).runReconcile();
      expect(res).toEqual({ destroyed: 2, failed: 1 });
      expect(
        (maintenance as unknown as { reconcileMedia: jest.Mock }).reconcileMedia,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
