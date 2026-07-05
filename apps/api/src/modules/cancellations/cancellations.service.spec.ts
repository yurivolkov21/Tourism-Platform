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
  outboxCreateMany?: jest.Mock;
  transaction?: jest.Mock;
}) {
  const booking = { findUnique: opts.findUnique ?? jest.fn() };
  const cancellationRequest = { upsert: opts.upsert ?? jest.fn() };
  const outbox = { createMany: opts.outboxCreateMany ?? jest.fn().mockResolvedValue({ count: 1 }) };
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

    await expect(svc.createRequest('BK-MISSING', caller, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BOOKING_NOT_FOUND (404) when the booking is not owned by the caller', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(makeBookingRow({ userId: 'other-user' })),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws CANCELLATION_NOT_ALLOWED (409) when the booking is not PAID', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(makeBookingRow({ status: 'PENDING' })),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws DEPARTURE_ALREADY_STARTED (409) when the departure has already started', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(
          makeBookingRow({ departure: { startDate: PAST_DEPARTURE } }),
        ),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws CANCELLATION_ALREADY_REQUESTED (409) when an open REQUESTED row exists', async () => {
    const svc = new CancellationsService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(
          makeBookingRow({ cancellationRequest: { status: CancellationRequestStatus.REQUESTED } }),
        ),
      }) as never,
    );

    await expect(svc.createRequest('BK-1', caller, {})).rejects.toBeInstanceOf(ConflictException);
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

    const result = await svc.createRequest('BK-1', caller, { reason: 'Change of travel plans' });

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
          makeBookingRow({ cancellationRequest: { status: CancellationRequestStatus.DENIED } }),
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
