import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { TourCategoriesService } from './tour-categories.service';
import type { CreateTourCategoryDto } from './dto/create-tour-category.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: 'x',
  });

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    tourCategory: {
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

describe('TourCategoriesService', () => {
  it('create generates a slug from name and defaults order/isActive', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));
    const svc = new TourCategoriesService(makePrisma({ create }));

    await svc.create({ name: 'Adventure Tours' } as CreateTourCategoryDto);

    expect(create.mock.calls[0][0].data.slug).toBe('adventure-tours');
    expect(create.mock.calls[0][0].data.order).toBe(0);
    expect(create.mock.calls[0][0].data.isActive).toBe(true);
  });

  it('create rejects a symbol-only slug source (400)', async () => {
    const svc = new TourCategoriesService(makePrisma());
    await expect(
      svc.create({ name: '!!!' } as CreateTourCategoryDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('create maps a unique-constraint (P2002) to 409', async () => {
    const create = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = new TourCategoriesService(makePrisma({ create }));
    await expect(
      svc.create({ name: 'X', slug: 'x' } as CreateTourCategoryDto),
    ).rejects.toThrow(ConflictException);
  });

  it('findPublicList forces isActive=true and computes pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: '1' }]);
    const count = jest.fn().mockResolvedValue(21);
    const svc = new TourCategoriesService(makePrisma({ findMany, count }));

    const res = await svc.findPublicList({ page: 2, pageSize: 10 });

    expect(findMany.mock.calls[0][0].where.isActive).toBe(true);
    expect(res.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('remove refuses an active category (must deactivate first)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', isActive: true });
    const svc = new TourCategoriesService(makePrisma({ findUnique }));
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('remove maps an FK violation (P2003 — has tours) to 409', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: '1', slug: 'x', isActive: false });
    const del = jest.fn().mockRejectedValue(knownError('P2003'));
    const svc = new TourCategoriesService(
      makePrisma({ findUnique, delete: del }),
    );
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new TourCategoriesService(makePrisma({ findFirst }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findDetailForAdmin returns the category with its tours (1:N)', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'adventure',
      name: 'Adventure',
      tours: [{ slug: 't1', title: 'T1', isPublished: true }],
    });
    const svc = new TourCategoriesService(makePrisma({ findUnique }));

    const res = await svc.findDetailForAdmin('adventure');

    expect(findUnique.mock.calls[0][0].include.tours.select).toEqual({
      slug: true,
      title: true,
      isPublished: true,
    });
    expect(res.tours).toEqual([{ slug: 't1', title: 'T1', isPublished: true }]);
    expect(res.toursCount).toBe(1);
  });

  it('findDetailForAdmin throws 404 when missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new TourCategoriesService(makePrisma({ findUnique }));
    await expect(svc.findDetailForAdmin('nope')).rejects.toThrow(NotFoundException);
  });

  it('list maps the tours count onto each row', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'c1', slug: 'day-trips', _count: { tours: 7 } },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new TourCategoriesService(makePrisma({ findMany, count }));

    const res = await svc.findAll({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      _count: { select: { tours: true } },
    });
    expect(res.items[0].toursCount).toBe(7);
  });
});
