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
  review?: Record<string, unknown>;
  tourDeparture?: Record<string, unknown>;
  booking?: Record<string, unknown>;
  wishlist?: Record<string, unknown>;
  enquiry?: Record<string, unknown>;
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
      findMany: jest.fn().mockResolvedValue([
        { id: 'd-1', slug: 'hoi-an' },
        { id: 'd-2', slug: 'da-nang' },
      ]),
      ...m.destination,
    },
    review: {
      groupBy: jest.fn().mockResolvedValue([]),
      ...m.review,
    },
    tourDeparture: {
      findMany: jest.fn().mockResolvedValue([]),
      ...m.tourDeparture,
    },
    booking: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: null } }),
      ...m.booking,
    },
    wishlist: {
      count: jest.fn().mockResolvedValue(0),
      ...m.wishlist,
    },
    enquiry: {
      count: jest.fn().mockResolvedValue(0),
      ...m.enquiry,
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
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 't-1', ...data }),
      );
    const svc = makeService(makePrisma({ tour: { create } }));

    await svc.create(body());

    const data = create.mock.calls[0][0].data;
    expect(data.slug).toBe('hoi-an-walking-tour');
    expect(data.category.connect.id).toBe('cat-1');
    const links = data.destinations.create;
    expect(links).toHaveLength(2);
    expect(
      links.find(
        (l: { isPrimary: boolean; destination: { connect: { id: string } } }) =>
          l.destination.connect.id === 'd-1',
      ).isPrimary,
    ).toBe(true);
    expect(
      links.find(
        (l: { isPrimary: boolean; destination: { connect: { id: string } } }) =>
          l.destination.connect.id === 'd-2',
      ).isPrimary,
    ).toBe(false);
  });

  it('create maps merchandising fields (suitableFor / badges), defaulting to []', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 't-1', ...data }),
      );
    const svc = makeService(makePrisma({ tour: { create } }));

    // defaults when omitted
    await svc.create(body());
    expect(create.mock.calls[0][0].data.suitableFor).toEqual([]);
    expect(create.mock.calls[0][0].data.badges).toEqual([]);

    // passed through when provided
    await svc.create(
      body({ suitableFor: ['FAMILY', 'COUPLE'], badges: ['BEST_VALUE'] }),
    );
    expect(create.mock.calls[1][0].data.suitableFor).toEqual([
      'FAMILY',
      'COUPLE',
    ]);
    expect(create.mock.calls[1][0].data.badges).toEqual(['BEST_VALUE']);
  });

  it('create rejects an unknown category slug (400)', async () => {
    const svc = makeService(
      makePrisma({
        tourCategory: { findUnique: jest.fn().mockResolvedValue(null) },
      }),
    );
    await expect(svc.create(body())).rejects.toThrow(BadRequestException);
  });

  it('create rejects an unknown destination slug (400)', async () => {
    const svc = makeService(
      makePrisma({
        destination: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'd-1', slug: 'hoi-an' }]),
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

  it('findPublicList attaches next-departure availability (soonest open upcoming)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 't-1' }]);
    const count = jest.fn().mockResolvedValue(1);
    const departureFindMany = jest.fn().mockResolvedValue([
      {
        tourId: 't-1',
        startDate: new Date('2026-08-15T00:00:00.000Z'),
        seatsTotal: 15,
        seatsBooked: 12,
      },
    ]);
    const svc = makeService(
      makePrisma({
        tour: { findMany, count },
        tourDeparture: { findMany: departureFindMany },
      }),
    );

    const res = await svc.findPublicList({ page: 1, pageSize: 10 });

    expect(departureFindMany.mock.calls[0][0].where.status).toBe('OPEN');
    expect(res.items[0]).toMatchObject({
      nextDepartureDate: '2026-08-15',
      nextDepartureSeatsLeft: 3,
    });
  });

  it('next-departure fields are null when a tour has no open upcoming departure', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 't-1' }]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = makeService(makePrisma({ tour: { findMany, count } }));

    const res = await svc.findPublicList({ page: 1, pageSize: 10 });

    expect(res.items[0]).toMatchObject({
      nextDepartureDate: null,
      nextDepartureSeatsLeft: null,
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
    const svc = makeService(makePrisma({ tour: { findUnique, delete: del } }));
    await expect(svc.remove('x')).rejects.toThrow(ConflictException);
  });

  it('findPublicBySlug throws 404 when missing', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = makeService(makePrisma({ tour: { findFirst } }));
    await expect(svc.findPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findBySlug (admin) attaches media; 404 when missing', async () => {
    const ok = makeService(
      makePrisma({
        tour: {
          findUnique: jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' }),
        },
      }),
    );
    await expect(ok.findBySlug('x')).resolves.toMatchObject({
      slug: 'x',
      media: [],
    });

    const missing = makeService(
      makePrisma({ tour: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(missing.findBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('findAll (admin) returns items + pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 't-1', slug: 'x' }]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = makeService(makePrisma({ tour: { findMany, count } }));
    const res = await svc.findAll({});
    expect(res.items).toHaveLength(1);
    expect(res.meta.total).toBe(1);
  });

  it('setMedia syncs + returns the set; 404 when missing', async () => {
    const media = makeMedia({
      attachToOwner: jest
        .fn()
        .mockResolvedValue({ id: 't-1', media: [{ url: 'u', role: 'hero' }] }),
    });
    const svc = makeService(
      makePrisma({
        tour: { findUnique: jest.fn().mockResolvedValue({ id: 't-1' }) },
      }),
      media,
    );
    const out = await svc.setMedia('x', []);
    expect(out).toHaveLength(1);
    expect(media.syncAssets).toHaveBeenCalledTimes(1);

    const missing = makeService(
      makePrisma({ tour: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(missing.setMedia('nope', [])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update applies a partial change and re-attaches media', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' });
    const update = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', title: 'New' });
    const svc = makeService(makePrisma({ tour: { findUnique, update } }));
    const res = await svc.update('x', { title: 'New' });
    expect(res).toMatchObject({ slug: 'x', media: [] });
    const call = update.mock.calls[0][0] as { data: { title?: string } };
    expect(call.data.title).toBe('New');
  });

  it('update rejects replacing destinations without a primary (400)', async () => {
    const svc = makeService(
      makePrisma({
        tour: {
          findUnique: jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' }),
        },
      }),
    );
    await expect(
      svc.update('x', { destinationSlugs: ['hoi-an'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update blocks unpublish while future PAID bookings exist (API-W2)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: true });
    const count = jest.fn().mockResolvedValue(3);
    const update = jest.fn();
    const svc = makeService(
      makePrisma({ tour: { findUnique, update }, booking: { count } }),
    );

    await expect(svc.update('x', { isPublished: false })).rejects.toThrow(
      ConflictException,
    );
    expect(update).not.toHaveBeenCalled();
    const where = (
      count.mock.calls[0][0] as {
        where: {
          tourId: string;
          status: { in: string[] };
          departure: Record<string, unknown>;
        };
      }
    ).where;
    expect(where.tourId).toBe('t-1');
    expect(where.status.in).toEqual(
      expect.arrayContaining(['PAID', 'PARTIALLY_REFUNDED']),
    );
    // Boundary = start-of-today UTC: a departure leaving TODAY still counts
    // (startDate is @db.Date — comparing with `new Date()` would miss it).
    const gte = (where.departure as { startDate: { gte: Date } }).startDate.gte;
    expect(gte.getUTCHours()).toBe(0);
    expect(gte.getUTCMinutes()).toBe(0);
    expect(gte.getUTCDate()).toBe(new Date().getUTCDate());
  });

  it('update allows unpublish when no active bookings remain (API-W2)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: true });
    const count = jest.fn().mockResolvedValue(0);
    const update = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: false });
    const svc = makeService(
      makePrisma({ tour: { findUnique, update }, booking: { count } }),
    );

    await expect(
      svc.update('x', { isPublished: false }),
    ).resolves.toBeDefined();
  });

  it('update skips the unpublish guard for non-unpublish patches (API-W2)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: true });
    const count = jest.fn();
    const update = jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' });
    const svc = makeService(
      makePrisma({ tour: { findUnique, update }, booking: { count } }),
    );

    await svc.update('x', { title: 'New title' });
    expect(count).not.toHaveBeenCalled();
  });

  it('update maps a unique-constraint (P2002) to 409', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' });
    const update = jest.fn().mockRejectedValue(knownError('P2002'));
    const svc = makeService(makePrisma({ tour: { findUnique, update } }));
    await expect(svc.update('x', { slug: 'taken' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('remove deletes an unpublished tour (happy path)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 't-1', slug: 'x', isPublished: false });
    const del = jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' });
    const media = makeMedia();
    const svc = makeService(
      makePrisma({ tour: { findUnique, delete: del } }),
      media,
    );
    await expect(svc.remove('x')).resolves.toMatchObject({ slug: 'x' });
    expect(media.deleteForOwner).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
  });

  describe('findDetailForAdmin (ops aggregates)', () => {
    it('attaches ops aggregates', async () => {
      const svc = makeService(
        makePrisma({
          tour: {
            findUnique: jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' }),
          },
          booking: {
            count: jest
              .fn()
              .mockResolvedValueOnce(30) // bookingsTotal
              .mockResolvedValueOnce(24), // bookingsPaid
            aggregate: jest.fn().mockResolvedValue({
              _sum: { totalAmount: new Prisma.Decimal(4500) },
            }),
          },
          wishlist: { count: jest.fn().mockResolvedValue(42) },
          enquiry: { count: jest.fn().mockResolvedValue(7) },
        }),
      );

      const res = await svc.findDetailForAdmin('x');

      expect(res.ops).toEqual({
        bookingsTotal: 30,
        bookingsPaid: 24,
        revenue: '4500',
        wishlistCount: 42,
        enquiriesCount: 7,
      });
    });

    it('ops are zero-safe (no bookings)', async () => {
      const svc = makeService(
        makePrisma({
          tour: {
            findUnique: jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' }),
          },
        }),
      );

      const res = await svc.findDetailForAdmin('x');

      expect(res.ops).toEqual({
        bookingsTotal: 0,
        bookingsPaid: 0,
        revenue: '0',
        wishlistCount: 0,
        enquiriesCount: 0,
      });
    });
  });

  describe('review stats', () => {
    it('attaches averageRating (1-dp) + reviewsCount from approved reviews', async () => {
      const svc = makeService(
        makePrisma({
          tour: {
            findUnique: jest.fn().mockResolvedValue({ id: 't-1', slug: 'x' }),
          },
          review: {
            groupBy: jest.fn().mockResolvedValue([
              {
                tourId: 't-1',
                _avg: { rating: 4.6667 },
                _count: { _all: 3 },
              },
            ]),
          },
        }),
      );
      const r = await svc.findBySlug('x');
      expect(r.averageRating).toBe(4.7);
      expect(r.reviewsCount).toBe(3);
    });

    it('defaults to 0 / 0 when a tour has no approved reviews', async () => {
      const svc = makeService(
        makePrisma({
          tour: {
            findUnique: jest.fn().mockResolvedValue({ id: 't-2', slug: 'y' }),
          },
        }),
      );
      const r = await svc.findBySlug('y');
      expect(r.averageRating).toBe(0);
      expect(r.reviewsCount).toBe(0);
    });
  });

  describe('findSummariesByIds', () => {
    it('returns summaries in input order, dropping unpublished/missing ids', async () => {
      const findMany = jest.fn().mockResolvedValue([
        { id: 'b', slug: 'tour-b', title: 'B' },
        { id: 'a', slug: 'tour-a', title: 'A' },
      ]);
      const svc = makeService(makePrisma({ tour: { findMany } }));

      const out = await svc.findSummariesByIds(['a', 'x', 'b']);

      expect(out.map((t) => t.id)).toEqual(['a', 'b']); // input order, 'x' dropped
      expect(out[0]).toHaveProperty('averageRating');
      expect(out[0]).toHaveProperty('nextDepartureDate');
    });

    it('short-circuits on an empty id list without querying', async () => {
      const findMany = jest.fn();
      const svc = makeService(makePrisma({ tour: { findMany } }));

      await expect(svc.findSummariesByIds([])).resolves.toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
