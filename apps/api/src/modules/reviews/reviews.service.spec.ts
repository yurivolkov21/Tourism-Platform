import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, ReviewSource } from '@prisma/client';
import { ReviewsService } from './reviews.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const baseDto = {
  bookingCode: 'BK-ABCDEFGH',
  rating: 5,
  title: 'Great',
  body: 'Loved the trip, guide was excellent.',
};

const paidBooking = {
  id: 'b-1',
  code: 'BK-ABCDEFGH',
  userId: 'u-customer',
  tourId: 't-1',
  status: BookingStatus.PAID,
  user: { fullName: 'Alice Nguyen' },
};

function makePrisma(overrides: {
  bookingFindUnique?: jest.Mock;
  reviewCreate?: jest.Mock;
}) {
  return {
    booking: { findUnique: overrides.bookingFindUnique ?? jest.fn() },
    review: { create: overrides.reviewCreate ?? jest.fn() },
  };
}

describe('ReviewsService.createForCustomer', () => {
  it('throws BOOKING_NOT_FOUND when code missing', async () => {
    const svc = new ReviewsService(
      makePrisma({
        bookingFindUnique: jest.fn().mockResolvedValue(null),
      }) as never,
    );
    await expect(
      svc.createForCustomer('u-customer', baseDto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BOOKING_FORBIDDEN when caller is not the owner', async () => {
    const svc = new ReviewsService(
      makePrisma({
        bookingFindUnique: jest.fn().mockResolvedValue(paidBooking),
      }) as never,
    );
    await expect(
      svc.createForCustomer('u-someone-else', baseDto),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects REVIEW_NOT_ELIGIBLE for non-PAID bookings', async () => {
    const svc = new ReviewsService(
      makePrisma({
        bookingFindUnique: jest
          .fn()
          .mockResolvedValue({ ...paidBooking, status: BookingStatus.PENDING }),
      }) as never,
    );
    await expect(
      svc.createForCustomer('u-customer', baseDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates the review with denormalised tourId on the happy path', async () => {
    const reviewCreate = jest
      .fn()
      .mockResolvedValue({ id: 'r-1', isApproved: false });
    const svc = new ReviewsService(
      makePrisma({
        bookingFindUnique: jest.fn().mockResolvedValue(paidBooking),
        reviewCreate,
      }) as never,
    );

    await svc.createForCustomer('u-customer', baseDto);

    type CreateCall = {
      data: {
        rating: number;
        tourId: string;
        bookingId: string;
        authorName: string;
        source: string;
      };
    };
    const calls = reviewCreate.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.rating).toBe(5);
    expect(calls[0][0].data.tourId).toBe('t-1');
    expect(calls[0][0].data.bookingId).toBe('b-1');
    // Snapshots the booking owner's name + marks the source VERIFIED.
    expect(calls[0][0].data.authorName).toBe('Alice Nguyen');
    expect(calls[0][0].data.source).toBe('VERIFIED');
  });

  it('translates P2002 (UNIQUE booking_id) into REVIEW_ALREADY_EXISTS', async () => {
    const reviewCreate = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    const svc = new ReviewsService(
      makePrisma({
        bookingFindUnique: jest.fn().mockResolvedValue(paidBooking),
        reviewCreate,
      }) as never,
    );
    await expect(
      svc.createForCustomer('u-customer', baseDto),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ReviewsService.findApprovedForTour', () => {
  function makeListPrisma(opts: {
    tour?: { id: string } | null;
    rows?: Array<{
      id: string;
      rating: number;
      title: string | null;
      body: string;
      createdAt: Date;
      authorName: string;
    }>;
    total?: number;
    avg?: number | null;
  }) {
    return {
      tour: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opts.tour === undefined ? { id: 't-1' } : opts.tour,
          ),
      },
      review: {
        findMany: jest.fn().mockResolvedValue(opts.rows ?? []),
        count: jest.fn().mockResolvedValue(opts.total ?? 0),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _avg: { rating: opts.avg ?? null } }),
      },
    };
  }

  it('throws TOUR_NOT_FOUND when slug is missing or unpublished', async () => {
    const svc = new ReviewsService(makeListPrisma({ tour: null }) as never);
    await expect(svc.findApprovedForTour('ghost', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns paginated approved reviews + average rating, querying isApproved=true', async () => {
    const prisma = makeListPrisma({
      rows: [
        {
          id: 'r-1',
          rating: 5,
          title: 'Good',
          body: 'great',
          createdAt: new Date('2026-05-01'),
          authorName: 'Alice',
        },
      ],
      total: 1,
      avg: 4.5,
    });
    const svc = new ReviewsService(prisma as never);

    const result = await svc.findApprovedForTour('hoi-an-walking-tour', {});

    expect(result.items).toHaveLength(1);
    expect(result.items[0].reviewer.fullName).toBe('Alice');
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.averageRating).toBe(4.5);
    type WhereCall = { where: { isApproved: boolean } };
    const calls = prisma.review.findMany.mock.calls as unknown as WhereCall[][];
    expect(calls[0][0].where.isApproved).toBe(true);
  });

  it('surfaces the snapshot authorName (e.g. "Anonymous") as the reviewer name', async () => {
    const svc = new ReviewsService(
      makeListPrisma({
        rows: [
          {
            id: 'r-2',
            rating: 4,
            title: null,
            body: 'nice',
            createdAt: new Date('2026-05-02'),
            authorName: 'Anonymous',
          },
        ],
        total: 1,
        avg: 4,
      }) as never,
    );

    const result = await svc.findApprovedForTour('hoi-an-walking-tour', {});
    expect(result.items[0].reviewer.fullName).toBe('Anonymous');
  });

  it('returns empty items + null average when nothing is approved yet', async () => {
    const svc = new ReviewsService(
      makeListPrisma({ rows: [], total: 0, avg: null }) as never,
    );

    const result = await svc.findApprovedForTour('hoi-an-walking-tour', {});

    expect(result.items).toEqual([]);
    expect(result.meta.averageRating).toBeNull();
    expect(result.meta.totalPages).toBe(1);
  });
});

describe('ReviewsService.findAllForAdmin', () => {
  function makeAdminPrisma(rows: unknown[], total: number) {
    return {
      review: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
  }

  it('maps rows to admin items (reviewer name + tour slug) and paginates', async () => {
    const prisma = makeAdminPrisma(
      [
        {
          id: 'r-1',
          tourId: 't-1',
          userId: 'u-1',
          authorName: 'Alice',
          authorLocation: null,
          bookingId: 'b-1',
          source: 'VERIFIED',
          isFeatured: false,
          rating: 5,
          title: 'Good',
          body: 'great',
          isApproved: false,
          createdAt: new Date('2026-05-01'),
          updatedAt: new Date('2026-05-01'),
          tour: { slug: 'hoi-an-walking-tour' },
        },
      ],
      1,
    );
    const svc = new ReviewsService(prisma as never);

    const result = await svc.findAllForAdmin({ isApproved: false });

    expect(result.items[0].tourSlug).toBe('hoi-an-walking-tour');
    expect(result.items[0].authorName).toBe('Alice');
    expect(result.meta.total).toBe(1);
    type WhereCall = { where: { isApproved?: boolean } };
    const calls = prisma.review.findMany.mock.calls as unknown as WhereCall[][];
    expect(calls[0][0].where.isApproved).toBe(false);
  });

  it('omits the isApproved filter when not provided', async () => {
    const prisma = makeAdminPrisma([], 0);
    const svc = new ReviewsService(prisma as never);

    await svc.findAllForAdmin({});

    type WhereCall = { where: Record<string, unknown> };
    const calls = prisma.review.findMany.mock.calls as unknown as WhereCall[][];
    expect('isApproved' in calls[0][0].where).toBe(false);
  });
});

describe('ReviewsService.findFeatured', () => {
  it('queries approved+featured and resolves tripLabel (explicit wins, else tour title)', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'f-1',
        rating: 5,
        title: null,
        body: 'great',
        authorName: 'Emily',
        authorLocation: 'Sydney, Australia',
        tripLabel: null,
        createdAt: new Date('2026-06-01'),
        tour: { title: 'Ha Long Bay Cruise' },
      },
      {
        id: 'f-2',
        rating: 4,
        title: 't',
        body: 'nice',
        authorName: 'Sam',
        authorLocation: null,
        tripLabel: 'Custom trip',
        createdAt: new Date('2026-06-02'),
        tour: null,
      },
    ]);
    const svc = new ReviewsService({ review: { findMany } } as never);

    const result = await svc.findFeatured();

    type WhereCall = { where: { isApproved: boolean; isFeatured: boolean } };
    const calls = findMany.mock.calls as unknown as WhereCall[][];
    expect(calls[0][0].where).toEqual({ isApproved: true, isFeatured: true });
    expect(result[0].tripLabel).toBe('Ha Long Bay Cruise'); // fell back to tour title
    expect(result[1].tripLabel).toBe('Custom trip'); // explicit wins
    expect(result[0].authorLocation).toBe('Sydney, Australia');
  });
});

describe('ReviewsService.moderateById', () => {
  it('throws REVIEW_NOT_FOUND when id missing', async () => {
    const update = jest.fn();
    const prisma = {
      review: { findUnique: jest.fn().mockResolvedValue(null), update },
    };
    const svc = new ReviewsService(prisma as never);
    await expect(
      svc.moderateById('missing', true, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects moderation without a synced admin id (400 — API-W3 audit)', async () => {
    const update = jest.fn();
    const prisma = {
      review: { findUnique: jest.fn(), update },
    };
    const svc = new ReviewsService(prisma as never);
    await expect(svc.moderateById('r-1', true, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  function makeModeratePrisma(currentlyApproved: boolean) {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'r-1', isApproved: !currentlyApproved });
    const outboxCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    const review = {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'r-1', isApproved: currentlyApproved }),
      update,
    };
    const outbox = { createMany: outboxCreateMany };
    const prisma = {
      review,
      outbox,
      $transaction: jest.fn(
        (
          cb: (tx: { review: typeof review; outbox: typeof outbox }) => unknown,
        ) => cb({ review, outbox }),
      ),
    };
    return { prisma, update, outboxCreateMany };
  }

  it('flips isApproved and enqueues an email on the false→true transition', async () => {
    const { prisma, update, outboxCreateMany } = makeModeratePrisma(false);
    const svc = new ReviewsService(prisma as never);

    await svc.moderateById('r-1', true, 'admin-1');

    type UpdCall = {
      where: { id: string };
      data: { isApproved: boolean; moderatedById: string; moderatedAt: Date };
    };
    const calls = update.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].where.id).toBe('r-1');
    expect(calls[0][0].data.isApproved).toBe(true);
    // Audit trail (API-W3): every moderation write records who + when.
    expect(calls[0][0].data.moderatedById).toBe('admin-1');
    expect(calls[0][0].data.moderatedAt).toBeInstanceOf(Date);

    type OutboxCall = { data: Array<{ type: string; dedupeKey: string }> };
    const obCalls = outboxCreateMany.mock.calls as unknown as OutboxCall[][];
    expect(obCalls[0][0].data[0].type).toBe('REVIEW_APPROVED');
    expect(obCalls[0][0].data[0].dedupeKey).toBe('review-approved:r-1');
  });

  it('does not re-enqueue when approving an already-approved review', async () => {
    const { prisma, outboxCreateMany } = makeModeratePrisma(true);
    const svc = new ReviewsService(prisma as never);

    await svc.moderateById('r-1', true, 'admin-1');

    expect(outboxCreateMany).not.toHaveBeenCalled();
  });

  it('can re-draft an approved review (isApproved=false) without an email — audit still written', async () => {
    const { prisma, update, outboxCreateMany } = makeModeratePrisma(true);
    const svc = new ReviewsService(prisma as never);

    await svc.moderateById('r-1', false, 'admin-2');

    type UpdCall = {
      data: { isApproved: boolean; moderatedById: string };
    };
    const calls = update.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.isApproved).toBe(false);
    expect(calls[0][0].data.moderatedById).toBe('admin-2');
    expect(outboxCreateMany).not.toHaveBeenCalled();
  });
});

describe('ReviewsService.findMine (API-W3)', () => {
  it('lists the caller reviews newest-first, capped at 50, with tour context', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'r-1',
        rating: 5,
        title: 'Great',
        body: 'Loved it',
        isApproved: true,
        createdAt: new Date('2026-07-01'),
        tour: { slug: 'hoi-an', title: 'Hoi An Walk' },
      },
      {
        id: 'r-2',
        rating: 4,
        title: null,
        body: 'Nice',
        isApproved: false,
        createdAt: new Date('2026-06-01'),
        tour: null,
      },
    ]);
    const svc = new ReviewsService({ review: { findMany } } as never);

    const res = await svc.findMine('user-1');

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.take).toBe(50);
    expect(res[0]).toMatchObject({
      id: 'r-1',
      isApproved: true,
      tour: { slug: 'hoi-an', title: 'Hoi An Walk' },
    });
    expect(res[1].tour).toBeNull();
  });
});

describe('ReviewsService.setFeatured', () => {
  it('throws REVIEW_NOT_FOUND when the id is missing', async () => {
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const svc = new ReviewsService(prisma as never);
    await expect(svc.setFeatured('missing', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('updates isFeatured when the review exists', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'r-1', isFeatured: true });
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r-1' }),
        update,
      },
    };
    const svc = new ReviewsService(prisma as never);
    await svc.setFeatured('r-1', true);
    type UpdCall = { where: { id: string }; data: { isFeatured: boolean } };
    const calls = update.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.isFeatured).toBe(true);
    expect(calls[0][0].where.id).toBe('r-1');
  });
});

describe('ReviewsService.createCurated', () => {
  it('creates a CURATED review, approved + featured, with null booking/user/tour', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c-1' });
    const svc = new ReviewsService({ review: { create } } as never);
    await svc.createCurated({
      authorName: 'Emily Carter',
      authorLocation: 'Sydney, Australia',
      tripLabel: 'Ha Long Bay Cruise',
      rating: 5,
      body: 'Flawless from start to finish, would book again.',
    });
    type CreateCall = {
      data: {
        authorName: string;
        authorLocation: string | null;
        source: string;
        isApproved: boolean;
        isFeatured: boolean;
      };
    };
    const calls = create.mock.calls as unknown as CreateCall[][];
    expect(calls[0][0].data.authorName).toBe('Emily Carter');
    expect(calls[0][0].data.authorLocation).toBe('Sydney, Australia');
    expect(calls[0][0].data.source).toBe('CURATED');
    expect(calls[0][0].data.isApproved).toBe(true);
    expect(calls[0][0].data.isFeatured).toBe(true);
  });
});

describe('ReviewsService — admin surfacing + curated delete', () => {
  it('findAllForAdmin maps tripLabel and the tour title', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'r1',
        tourId: 't1',
        userId: null,
        bookingId: null,
        authorName: 'Ana',
        authorLocation: null,
        source: ReviewSource.CURATED,
        isFeatured: true,
        rating: 5,
        title: 'Great',
        body: 'Lovely trip',
        isApproved: true,
        tripLabel: 'Hạ Long Bay Cruise',
        createdAt: new Date(),
        updatedAt: new Date(),
        tour: { slug: 'ha-long', title: 'Hạ Long Bay Cruise 2D1N' },
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new ReviewsService({ review: { findMany, count } } as never);

    const res = await svc.findAllForAdmin({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      tour: { select: { slug: true, title: true } },
      user: { select: { fullName: true, email: true } },
      booking: { select: { code: true } },
      moderatedBy: { select: { fullName: true, email: true } },
    });
    expect(res.items[0].tripLabel).toBe('Hạ Long Bay Cruise');
    expect(res.items[0].tourTitle).toBe('Hạ Long Bay Cruise 2D1N');
    // API-W3 audit fields surface (null when never moderated).
    expect(res.items[0].moderatedBy).toBeNull();
    expect(res.items[0].moderatedAt).toBeNull();
  });

  it('deleteCuratedById deletes a curated review', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'r1', source: ReviewSource.CURATED });
    const del = jest.fn().mockResolvedValue({ id: 'r1' });
    const svc = new ReviewsService({
      review: { findUnique, delete: del },
    } as never);

    await svc.deleteCuratedById('r1');

    expect(del).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('deleteCuratedById 404s when the review is missing', async () => {
    const svc = new ReviewsService({
      review: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never);
    await expect(svc.deleteCuratedById('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deleteCuratedById 409s for a verified review (audit trail protected)', async () => {
    const del = jest.fn();
    const svc = new ReviewsService({
      review: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'r1', source: ReviewSource.VERIFIED }),
        delete: del,
      },
    } as never);
    await expect(svc.deleteCuratedById('r1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(del).not.toHaveBeenCalled();
  });
});

describe('ReviewsService.summarize', () => {
  it('returns site-wide approved count + rounded average', async () => {
    const prisma = {
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.375 },
          _count: { _all: 26 },
        }),
      },
    };
    const svc = new ReviewsService(prisma as never);

    const result = await svc.summarize();

    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    expect(result).toEqual({ count: 26, averageRating: 4.4 });
  });

  it('returns null averageRating and 0 count when there are no approved reviews', async () => {
    const prisma = {
      review: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: null },
          _count: { _all: 0 },
        }),
      },
    };
    const svc = new ReviewsService(prisma as never);

    const result = await svc.summarize();

    expect(result).toEqual({ count: 0, averageRating: null });
  });
});

describe('ReviewsService.findAllForAdmin — B2 filters + joins', () => {
  function makeAdminPrisma(rows: unknown[], total: number) {
    return {
      review: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(total),
      },
    };
  }

  it('builds the where for source, rating, and insensitive search', async () => {
    const prisma = makeAdminPrisma([], 0);
    const svc = new ReviewsService(prisma as never);

    await svc.findAllForAdmin({
      source: ReviewSource.CURATED,
      rating: 5,
      search: 'lantern',
    });

    type Call = {
      where: {
        source?: string;
        rating?: number;
        OR?: { [k: string]: { contains: string; mode: string } }[];
      };
    };
    const calls = prisma.review.findMany.mock.calls as unknown as Call[][];
    const where = calls[0][0].where;
    expect(where.source).toBe('CURATED');
    expect(where.rating).toBe(5);
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toEqual({
      authorName: { contains: 'lantern', mode: 'insensitive' },
    });
    expect(where.OR?.[1]).toEqual({
      title: { contains: 'lantern', mode: 'insensitive' },
    });
    expect(where.OR?.[2]).toEqual({
      body: { contains: 'lantern', mode: 'insensitive' },
    });
  });

  it('omits all filters when none are provided', async () => {
    const prisma = makeAdminPrisma([], 0);
    const svc = new ReviewsService(prisma as never);

    await svc.findAllForAdmin({});

    type Call = { where: Record<string, unknown> };
    const calls = prisma.review.findMany.mock.calls as unknown as Call[][];
    expect(Object.keys(calls[0][0].where)).toEqual([]);
  });

  it('maps userName/userEmail/bookingCode from the joined relations', async () => {
    const prisma = makeAdminPrisma(
      [
        {
          id: 'r-1',
          tourId: 't-1',
          userId: 'u-1',
          authorName: 'Alice',
          authorLocation: null,
          bookingId: 'b-1',
          source: 'VERIFIED',
          isFeatured: false,
          rating: 5,
          title: 'Good',
          tripLabel: null,
          body: 'great',
          isApproved: true,
          createdAt: new Date('2026-05-01'),
          updatedAt: new Date('2026-05-01'),
          tour: { slug: 'hoi-an-walking-tour', title: 'Hoi An Walking Tour' },
          user: { fullName: 'Alice Nguyen', email: 'alice@example.com' },
          booking: { code: 'BK-ABCDEFGH' },
        },
      ],
      1,
    );
    const svc = new ReviewsService(prisma as never);

    const result = await svc.findAllForAdmin({});

    expect(result.items[0].userName).toBe('Alice Nguyen');
    expect(result.items[0].userEmail).toBe('alice@example.com');
    expect(result.items[0].bookingCode).toBe('BK-ABCDEFGH');
  });

  it('maps null user/booking fields for curated rows', async () => {
    const prisma = makeAdminPrisma(
      [
        {
          id: 'r-2',
          tourId: null,
          userId: null,
          authorName: 'Marketing',
          authorLocation: 'Hanoi',
          bookingId: null,
          source: 'CURATED',
          isFeatured: true,
          rating: 5,
          title: null,
          tripLabel: 'Family trip',
          body: 'wonderful',
          isApproved: true,
          createdAt: new Date('2026-05-01'),
          updatedAt: new Date('2026-05-01'),
          tour: null,
          user: null,
          booking: null,
        },
      ],
      1,
    );
    const svc = new ReviewsService(prisma as never);

    const result = await svc.findAllForAdmin({});

    expect(result.items[0].userName).toBeNull();
    expect(result.items[0].userEmail).toBeNull();
    expect(result.items[0].bookingCode).toBeNull();
  });
});

describe('ReviewsService.updateCuratedById', () => {
  const curated = { id: 'r-9', source: ReviewSource.CURATED };

  it('throws REVIEW_NOT_FOUND for an unknown id', async () => {
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const svc = new ReviewsService(prisma as never);

    await expect(
      svc.updateCuratedById('nope', { rating: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('throws REVIEW_NOT_CURATED for a verified review', async () => {
    const prisma = {
      review: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'r-1', source: ReviewSource.VERIFIED }),
        update: jest.fn(),
      },
    };
    const svc = new ReviewsService(prisma as never);

    await expect(
      svc.updateCuratedById('r-1', { body: 'edited' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('updates only the provided fields on a curated review', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'r-9', rating: 4 });
    const prisma = {
      review: {
        findUnique: jest.fn().mockResolvedValue(curated),
        update,
      },
    };
    const svc = new ReviewsService(prisma as never);

    await svc.updateCuratedById('r-9', { rating: 4, body: 'polished copy' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'r-9' },
      data: { rating: 4, body: 'polished copy' },
    });
  });
});

describe('ReviewsService.updateCuratedById — null clears nullable fields', () => {
  it('writes null through for authorLocation/tripLabel/title', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'r-9' });
    const prisma = {
      review: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'r-9', source: ReviewSource.CURATED }),
        update,
      },
    };
    const svc = new ReviewsService(prisma as never);

    await svc.updateCuratedById('r-9', {
      authorLocation: null,
      tripLabel: null,
      title: null,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'r-9' },
      data: { authorLocation: null, tripLabel: null, title: null },
    });
  });
});
