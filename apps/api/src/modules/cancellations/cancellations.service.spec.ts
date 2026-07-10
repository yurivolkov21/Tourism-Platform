import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CancellationRequestStatus, UserRole } from '@prisma/client';
import { CancellationsService } from './cancellations.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const caller = { id: 'user-1', role: UserRole.CUSTOMER };

const FUTURE_DEPARTURE = new Date('2999-01-01');
const PAST_DEPARTURE = new Date('2000-01-01');

function makeBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'booking-1',
    userId: 'user-1',
    status: 'PAID',
    departure: { startDate: FUTURE_DEPARTURE },
    cancellationRequest: null,
    ...overrides,
  };
}

function makePrisma(opts: {
  findUnique?: jest.Mock;
  upsert?: jest.Mock;
  crFindUnique?: jest.Mock;
  updateMany?: jest.Mock;
  update?: jest.Mock;
  findMany?: jest.Mock;
  count?: jest.Mock;
  outboxCreateMany?: jest.Mock;
  transaction?: jest.Mock;
}) {
  const booking = { findUnique: opts.findUnique ?? jest.fn() };
  const cancellationRequest = {
    upsert: opts.upsert ?? jest.fn(),
    findUnique: opts.crFindUnique ?? jest.fn(),
    updateMany: opts.updateMany ?? jest.fn().mockResolvedValue({ count: 1 }),
    update: opts.update ?? jest.fn(),
    findMany: opts.findMany ?? jest.fn(),
    count: opts.count ?? jest.fn(),
  };
  const outbox = {
    createMany:
      opts.outboxCreateMany ?? jest.fn().mockResolvedValue({ count: 1 }),
  };
  return {
    booking,
    cancellationRequest,
    outbox,
    // Batch transaction (array form) — matches admin-media.service.spec.ts idiom.
    $transaction: opts.transaction ?? jest.fn().mockResolvedValue([]),
  };
}

describe('CancellationsService.createRequest', () => {
  it('throws BOOKING_NOT_FOUND (404) when the booking is missing', async () => {
    const svc = new CancellationsService(
      makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }) as never,
    );

    await expect(
      svc.createRequest('BK-MISSING', caller, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BOOKING_NOT_FOUND (404) when the booking is not owned by the caller', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest
          .fn()
          .mockResolvedValue(makeBookingRow({ userId: 'other-user' })),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws CANCELLATION_NOT_ALLOWED (409) when the booking is not PAID', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest
          .fn()
          .mockResolvedValue(makeBookingRow({ status: 'PENDING' })),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws DEPARTURE_ALREADY_STARTED (409) when the departure has already started', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest
          .fn()
          .mockResolvedValue(
            makeBookingRow({ departure: { startDate: PAST_DEPARTURE } }),
          ),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws CANCELLATION_ALREADY_REQUESTED (409) when an open REQUESTED row exists', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(
          makeBookingRow({
            cancellationRequest: {
              status: CancellationRequestStatus.REQUESTED,
            },
          }),
        ),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('happy path: PAID + future departure + no open request → upserts REQUESTED + enqueues outbox', async () => {
    const upsert = jest.fn();
    const outboxCreateMany = jest.fn();
    const createdAt = new Date('2026-07-01T00:00:00.000Z');
    const transaction = jest.fn().mockResolvedValue([
      {
        status: CancellationRequestStatus.REQUESTED,
        reason: 'Change of travel plans',
        createdAt,
        decisionNote: null,
        decidedAt: null,
      },
      { count: 1 },
    ]);
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(makeBookingRow()),
        upsert,
        outboxCreateMany,
        transaction,
      }) as never,
    );

    const result = await svc.createRequest('BK-1', caller, {
      reason: 'Change of travel plans',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    const opsArg = transaction.mock.calls[0][0];
    expect(Array.isArray(opsArg)).toBe(true);
    expect(result).toEqual({
      status: CancellationRequestStatus.REQUESTED,
      reason: 'Change of travel plans',
      createdAt: createdAt.toISOString(),
      decisionNote: null,
      decidedAt: null,
    });
  });

  it('re-request after DENIED: upsert resets the row back to REQUESTED (update branch)', async () => {
    const upsert = jest.fn().mockReturnValue('upsert-call');
    const outboxCreateMany = jest.fn().mockReturnValue('outbox-call');
    const createdAt = new Date('2026-07-01T00:00:00.000Z');
    const transaction = jest.fn().mockResolvedValue([
      {
        status: CancellationRequestStatus.REQUESTED,
        reason: '',
        createdAt,
        decisionNote: null,
        decidedAt: null,
      },
      { count: 1 },
    ]);
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(
          makeBookingRow({
            cancellationRequest: { status: CancellationRequestStatus.DENIED },
          }),
        ),
        upsert,
        outboxCreateMany,
        transaction,
      }) as never,
    );

    await svc.createRequest('BK-1', caller, {});

    expect(upsert.mock.calls[0][0]).toMatchObject({
      where: { bookingId: 'booking-1' },
      update: {
        status: CancellationRequestStatus.REQUESTED,
        decisionNote: null,
        decidedById: null,
        decidedAt: null,
      },
    });
  });
});

function makeQueueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    status: CancellationRequestStatus.REQUESTED,
    reason: 'Change of travel plans',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    decidedAt: null,
    decisionNote: null,
    booking: {
      code: 'BK-7Q2KX9AB',
      contactName: 'Nguyen Van A',
      contactEmail: 'guest@example.com',
      tour: { title: 'Hoi An Walking Tour' },
      departure: { startDate: new Date('2026-08-15T00:00:00.000Z') },
    },
    ...overrides,
  };
}

describe('CancellationsService.findAllForAdmin', () => {
  it('defaults the status filter to REQUESTED and maps a row to AdminCancellationRequestDto', async () => {
    const findMany = jest.fn().mockResolvedValue([makeQueueRow()]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new CancellationsService(
      makePrisma({ findMany, count }) as never,
    );

    const result = await svc.findAllForAdmin({});

    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { status: CancellationRequestStatus.REQUESTED },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(count.mock.calls[0][0]).toMatchObject({
      where: { status: CancellationRequestStatus.REQUESTED },
    });
    expect(result).toEqual({
      data: [
        {
          id: 'req-1',
          status: CancellationRequestStatus.REQUESTED,
          reason: 'Change of travel plans',
          createdAt: new Date('2026-07-01T00:00:00.000Z').toISOString(),
          decidedAt: null,
          decisionNote: null,
          booking: {
            code: 'BK-7Q2KX9AB',
            tourTitle: 'Hoi An Walking Tour',
            departureStartDate: '2026-08-15',
            customerName: 'Nguyen Van A',
            customerEmail: 'guest@example.com',
          },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });

  it('honors an explicit status filter, page and pageSize', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const svc = new CancellationsService(
      makePrisma({ findMany, count }) as never,
    );

    await svc.findAllForAdmin({
      status: CancellationRequestStatus.DENIED,
      page: 2,
      pageSize: 10,
    });

    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { status: CancellationRequestStatus.DENIED },
      skip: 10,
      take: 10,
    });
  });
});

describe('CancellationsService.denyRequest', () => {
  it('happy path: updateMany claims the open request atomically, enqueues outbox, returns mapped row', async () => {
    const decidedAt = new Date('2026-07-05T12:00:00.000Z');
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const outboxCreateMany = jest.fn();
    const crFindUnique = jest.fn().mockResolvedValue(
      makeQueueRow({
        status: CancellationRequestStatus.DENIED,
        decidedAt,
        decisionNote: 'Outside the free-cancellation window',
      }),
    );
    const svc = new CancellationsService(
      makePrisma({ updateMany, outboxCreateMany, crFindUnique }) as never,
    );

    const result = await svc.denyRequest('req-1', 'admin-1', {
      decisionNote: 'Outside the free-cancellation window',
    });

    expect(updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'req-1', status: CancellationRequestStatus.REQUESTED },
      data: {
        status: CancellationRequestStatus.DENIED,
        decisionNote: 'Outside the free-cancellation window',
        decidedById: 'admin-1',
      },
    });
    expect(outboxCreateMany.mock.calls[0][0]).toMatchObject({
      data: [
        expect.objectContaining({
          type: 'CANCELLATION_DENIED',
          dedupeKey: 'cancellation-denied:req-1',
        }),
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      id: 'req-1',
      status: CancellationRequestStatus.DENIED,
      reason: 'Change of travel plans',
      createdAt: new Date('2026-07-01T00:00:00.000Z').toISOString(),
      decidedAt: decidedAt.toISOString(),
      decisionNote: 'Outside the free-cancellation window',
      booking: {
        code: 'BK-7Q2KX9AB',
        tourTitle: 'Hoi An Walking Tour',
        departureStartDate: '2026-08-15',
        customerName: 'Nguyen Van A',
        customerEmail: 'guest@example.com',
      },
    });
  });

  it('lost the race / already resolved: updateMany count 0 + a non-REQUESTED row → 409, outbox NOT enqueued', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const crFindUnique = jest
      .fn()
      .mockResolvedValue({ status: CancellationRequestStatus.REFUNDED });
    const outboxCreateMany = jest.fn();
    const svc = new CancellationsService(
      makePrisma({ updateMany, crFindUnique, outboxCreateMany }) as never,
    );

    await expect(
      svc.denyRequest('req-1', 'admin-1', {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(outboxCreateMany).not.toHaveBeenCalled();
  });

  it('missing request: updateMany count 0 + findUnique null → 404', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const crFindUnique = jest.fn().mockResolvedValue(null);
    const outboxCreateMany = jest.fn();
    const svc = new CancellationsService(
      makePrisma({ updateMany, crFindUnique, outboxCreateMany }) as never,
    );

    await expect(
      svc.denyRequest('req-missing', 'admin-1', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(outboxCreateMany).not.toHaveBeenCalled();
  });
});
