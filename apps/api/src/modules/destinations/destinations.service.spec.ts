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
  return {
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
  } as unknown as PrismaService;
}

describe('DestinationsService', () => {
  it('create generates a slug from name and defaults country', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new DestinationsService(makePrisma({ create }));

    await svc.create({ name: 'Hội An' } as CreateDestinationDto);

    expect(create.mock.calls[0][0].data.slug).toBe('hoi-an');
    expect(create.mock.calls[0][0].data.country).toBe('Vietnam');
  });

  it('create rejects a symbol-only slug source (400)', async () => {
    const svc = new DestinationsService(makePrisma());
    await expect(
      svc.create({ name: '!!!' } as CreateDestinationDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(p2002());
    const svc = new DestinationsService(makePrisma({ create }));
    await expect(
      svc.create({ name: 'X', slug: 'x' } as CreateDestinationDto),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces isActive=true and computes pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const count = jest.fn().mockResolvedValue(21);
    const svc = new DestinationsService(makePrisma({ findMany, count }));

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
    const svc = new DestinationsService(makePrisma({ findUnique }));
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new DestinationsService(makePrisma({ findFirst }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
