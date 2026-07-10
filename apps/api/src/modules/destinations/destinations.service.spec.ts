import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { DestinationsService } from './destinations.service';
import type { CreateDestinationDto } from './dto/create-destination.dto';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('dup', {
    code: 'P2002',
    clientVersion: 'x',
  });

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  const p: Record<string, unknown> = {
    destination: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides,
    },
  };
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

function makeService(
  prisma: PrismaService,
  media = makeMedia(),
): DestinationsService {
  return new DestinationsService(prisma, media);
}

describe('DestinationsService', () => {
  it('create generates a slug from name and defaults country', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = makeService(makePrisma({ create }));

    await svc.create({ name: 'Hội An' } as CreateDestinationDto);

    expect(create.mock.calls[0][0].data.slug).toBe('hoi-an');
    expect(create.mock.calls[0][0].data.country).toBe('Vietnam');
  });

  it('create rejects a symbol-only slug source (400)', async () => {
    const svc = makeService(makePrisma());
    await expect(
      svc.create({ name: '!!!' } as CreateDestinationDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(p2002());
    const svc = makeService(makePrisma({ create }));
    await expect(
      svc.create({ name: 'X', slug: 'x' } as CreateDestinationDto),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces isActive=true and computes pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const count = jest.fn().mockResolvedValue(21);
    const svc = makeService(makePrisma({ findMany, count }));

    const res = await svc.findPublicList({ page: 2, pageSize: 10 });

    expect(findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(res.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('remove refuses an active destination (must deactivate first)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', isActive: true });
    const svc = makeService(makePrisma({ findUnique }));
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = makeService(makePrisma({ findFirst }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findDetailForAdmin flattens the M:N join rows to a tours list (no nested .tour) + attaches media', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'hoi-an',
      name: 'Hoi An',
      isActive: true,
      tours: [
        {
          isPrimary: true,
          tour: { slug: 't1', title: 'T1', isPublished: true },
        },
        {
          isPrimary: false,
          tour: { slug: 't2', title: 'T2', isPublished: false },
        },
      ],
    });
    const svc = makeService(makePrisma({ findUnique }));

    const res = await svc.findDetailForAdmin('hoi-an');

    expect(res.tours).toEqual([
      { slug: 't1', title: 'T1', isPublished: true, isPrimary: true },
      { slug: 't2', title: 'T2', isPublished: false, isPrimary: false },
    ]);
    expect(res.media).toEqual([]);
    expect(
      (res.tours[0] as unknown as Record<string, unknown>).tour,
    ).toBeUndefined();
    expect(res.toursCount).toBe(2);
  });

  it('findDetailForAdmin throws 404 when missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = makeService(makePrisma({ findUnique }));
    await expect(svc.findDetailForAdmin('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('list maps the tours count onto each row', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'd1', slug: 'hoi-an', _count: { tours: 4 } }]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = makeService(makePrisma({ findMany, count }));

    const res = await svc.findAll({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      _count: { select: { tours: true } },
    });
    expect(res.items[0].toursCount).toBe(4);
    expect(
      (res.items[0] as unknown as { _count?: unknown })._count,
    ).toBeUndefined();
  });
});
