import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { ToursService } from './tours.service';
import type { CreateTourDto } from './dto/create-tour.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: 'x',
  });

interface PrismaMocks {
  tour?: Record<string, unknown>;
  tourCategory?: Record<string, unknown>;
  destination?: Record<string, unknown>;
}

function makePrisma(m: PrismaMocks = {}): PrismaService {
  const p: Record<string, unknown> = {
    tour: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...m.tour,
    },
    tourCategory: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      ...m.tourCategory,
    },
    destination: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'd-1', slug: 'hoi-an' },
          { id: 'd-2', slug: 'da-nang' },
        ]),
      ...m.destination,
    },
  };
  // Interactive tx runs its callback against the same mock (tx.tour.delete etc.).
  p.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(p));
  return p as unknown as PrismaService;
}

/** MediaService stub — attach passes media:[] through; writes are no-ops. */
function makeMedia(over: Record<string, unknown> = {}) {
  return {
    syncAssets: jest.fn().mockResolvedValue(undefined),
    deleteForOwner: jest.fn().mockResolvedValue(undefined),
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: object) =>
        Promise.resolve({ ...owner, media: [] }),
      ),
    attachToOwners: jest
      .fn()
      .mockImplementation((_t: unknown, owners: object[]) =>
        Promise.resolve(owners.map((o) => ({ ...o, media: [] }))),
      ),
    ...over,
  } as unknown as import('../media/media.service').MediaService;
}

function makeService(prisma: PrismaService, media = makeMedia()): ToursService {
  return new ToursService(prisma, media);
}

/** Minimal valid create body (two destinations, primary = hoi-an). */
function body(overrides: Partial<CreateTourDto> = {}): CreateTourDto {
  return {
    title: 'Hoi An Walking Tour',
    categorySlug: 'day-tours',
    destinationSlugs: ['hoi-an', 'da-nang'],
    primaryDestinationSlug: 'hoi-an',
    durationDays: 1,
    basePrice: 49.5,
    ...overrides,
  } as CreateTourDto;
}

describe('ToursService', () => {
  it('create resolves refs, generates slug, and flags the primary destination', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 't-1', ...data }));
    const svc = makeService(makePrisma({ tour: { create } }));

    await svc.create(body());

    const data = create.mock.calls[0][0].data;
    expect(data.slug).toBe('hoi-an-walking-tour');
    expect(data.category.connect.id).toBe('cat-1');
    const links = data.destinations.create;
    expect(links).toHaveLength(2);
    expect(links.find((l: { isPrimary: boolean; destination: { connect: { id: string } } }) =>
      l.destination.connect.id === 'd-1').isPrimary).toBe(true);
    expect(links.find((l: { isPrimary: boolean; destination: { connect: { id: string } } }) =>
      l.destination.connect.id === 'd-2').isPrimary).toBe(false);
  });

  it('create rejects an unknown category slug (400)', async () => {
    const svc = makeService(
      makePrisma({ tourCategory: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create(body())).rejects.toThrow(BadRequestException);
  });

  it('create rejects an unknown destination slug (400)', async () => {
    const svc = makeService(
      makePrisma({
        destination: {
          findMany: jest.fn().mockResolvedValue([{ id: 'd-1', slug: 'hoi-an' }]),
        },
      }),
    );
    await expect(svc.create(body())).rejects.toThrow(BadRequestException);
  });

  it('create rejects a primary slug not in destinationSlugs (400)', async () => {
    const svc = makeService(makePrisma());
    await expect(
      svc.create(body({ primaryDestinationSlug: 'sapa' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = makeService(makePrisma({ tour: { create } }));
    await expect(svc.create(body())).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces isPublished=true and computes pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 't-1' }]);
    const count = jest.fn().mockResolvedValue(21);
    const svc = makeService(makePrisma({ tour: { findMany, count } }));

    const res = await svc.findPublicList({ page: 2, pageSize: 10 });

    expect(findMany.mock.calls[0][0].where.isPublished).toBe(true);
    expect(res.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('remove refuses a published tour (must unpublish first)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: true });
    const svc = makeService(makePrisma({ tour: { findUnique } }));
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('remove maps an FK violation (P2003 — has bookings) to 409', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: false });
    const del = jest.fn().mockRejectedValue(knownError('P2003'));
    const svc = makeService(
      makePrisma({ tour: { findUnique, delete: del } }),
    );
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = makeService(makePrisma({ tour: { findFirst } }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
