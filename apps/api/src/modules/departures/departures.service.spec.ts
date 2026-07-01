import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DepartureStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { DeparturesService } from './departures.service';
import type { CreateDepartureDto } from './dto/create-departure.dto';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

/** A start date safely in the future (avoids DEPARTURE_IN_PAST in create tests). */
const FUTURE = '2999-01-10';
const FUTURE_END = '2999-01-12';

interface Mocks {
  tour?: Record<string, unknown>;
  tourDeparture?: Record<string, unknown>;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    tour: {
      findUnique: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      findFirst: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      ...m.tour,
    },
    tourDeparture: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...m.tourDeparture,
    },
  } as unknown as PrismaService;
}

function body(overrides: Partial<CreateDepartureDto> = {}): CreateDepartureDto {
  return {
    startDate: FUTURE,
    endDate: FUTURE_END,
    seatsTotal: 15,
    ...overrides,
  } as CreateDepartureDto;
}

describe('DeparturesService', () => {
  // ── create ────────────────────────────────────────────────────────────────

  it('create resolves the tour, connects it, and never sets seatsBooked', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'd-1', ...data }));
    const svc = new DeparturesService(makePrisma({ tourDeparture: { create } }));

    await svc.create('hoi-an', body({ priceOverride: 59, compareAtPrice: 79 }));

    const data = create.mock.calls[0][0].data;
    expect(data.tour.connect.id).toBe('tour-1');
    expect(data.seatsBooked).toBeUndefined();
    expect(data.priceOverride).toBeInstanceOf(Prisma.Decimal);
    expect(data.compareAtPrice).toBeInstanceOf(Prisma.Decimal);
  });

  it('create throws 404 when the tour slug is missing', async () => {
    const svc = new DeparturesService(
      makePrisma({ tour: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create('nope', body())).rejects.toThrow(NotFoundException);
  });

  it('create rejects an inverted date range (400)', async () => {
    const svc = new DeparturesService(makePrisma());
    await expect(
      svc.create('hoi-an', body({ startDate: FUTURE_END, endDate: FUTURE })),
    ).rejects.toThrow(BadRequestException);
  });

  it('create rejects a start date in the past (400)', async () => {
    const svc = new DeparturesService(makePrisma());
    await expect(
      svc.create('hoi-an', body({ startDate: '2000-01-01', endDate: '2000-01-02' })),
    ).rejects.toThrow(BadRequestException);
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('update rejects lowering seatsTotal below seatsBooked (400)', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'd-1', tourId: 'tour-1', seatsBooked: 8, startDate: new Date(FUTURE), endDate: new Date(FUTURE_END) });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst } }),
    );
    await expect(
      svc.update('hoi-an', 'd-1', { seatsTotal: 5 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update clears priceOverride when null is sent explicitly', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'd-1',
      tourId: 'tour-1',
      seatsBooked: 0,
      startDate: new Date(FUTURE),
      endDate: new Date(FUTURE_END),
    });
    const update = jest.fn().mockResolvedValue({ id: 'd-1' });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst, update } }),
    );

    await svc.update('hoi-an', 'd-1', { priceOverride: null });

    expect(update.mock.calls[0][0].data.priceOverride).toBeNull();
  });

  it('update throws 404 when the departure is missing under the tour', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst } }),
    );
    await expect(
      svc.update('hoi-an', 'd-x', { seatsTotal: 10 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('update rejects moving startDate into the past (400 DEPARTURE_IN_PAST)', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'd-1',
      tourId: 'tour-1',
      seatsBooked: 0,
      startDate: new Date(FUTURE),
      endDate: new Date(FUTURE_END),
    });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst } }),
    );
    await expect(
      svc.update('hoi-an', 'd-1', { startDate: '2000-01-01', endDate: '2000-01-02' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update allows editing an already-past departure when startDate is not sent', async () => {
    // A finished trip (past start) can still be tidied — e.g. marked CANCELLED —
    // as long as the caller does not move its startDate. The "startDate present"
    // gate is what keeps this legal.
    const findFirst = jest.fn().mockResolvedValue({
      id: 'd-1',
      tourId: 'tour-1',
      seatsBooked: 0,
      startDate: new Date('2000-01-01'),
      endDate: new Date('2000-01-02'),
    });
    const update = jest.fn().mockResolvedValue({ id: 'd-1' });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst, update } }),
    );

    await expect(
      svc.update('hoi-an', 'd-1', { status: DepartureStatus.CANCELLED }),
    ).resolves.toEqual({ id: 'd-1' });
    expect(update.mock.calls[0][0].data.status).toBe(DepartureStatus.CANCELLED);
  });

  it('update allows moving startDate to a future date', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'd-1',
      tourId: 'tour-1',
      seatsBooked: 0,
      startDate: new Date(FUTURE),
      endDate: new Date(FUTURE_END),
    });
    const update = jest.fn().mockResolvedValue({ id: 'd-1' });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst, update } }),
    );

    await expect(
      svc.update('hoi-an', 'd-1', { startDate: '2999-02-01', endDate: '2999-02-03' }),
    ).resolves.toEqual({ id: 'd-1' });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  it('remove refuses a departure that already has booked seats (409)', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'd-1', tourId: 'tour-1', seatsBooked: 3 });
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst } }),
    );
    await expect(svc.remove('hoi-an', 'd-1')).rejects.toThrow(ConflictException);
  });

  it('remove maps an FK violation (P2003) to 409', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'd-1', tourId: 'tour-1', seatsBooked: 0 });
    const del = jest.fn().mockRejectedValue(knownError('P2003'));
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findFirst, delete: del } }),
    );
    await expect(svc.remove('hoi-an', 'd-1')).rejects.toThrow(ConflictException);
  });

  // ── reads ─────────────────────────────────────────────────────────────────

  it('public list gates on isPublished and defaults status=OPEN', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'tour-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new DeparturesService(
      makePrisma({ tour: { findFirst }, tourDeparture: { findMany } }),
    );

    await svc.findPublicListForTour('hoi-an', {});

    expect(findFirst.mock.calls[0][0].where.isPublished).toBe(true);
    expect(findMany.mock.calls[0][0].where.status).toBe(DepartureStatus.OPEN);
  });

  it('public list throws 404 when the tour is unpublished/missing', async () => {
    const svc = new DeparturesService(
      makePrisma({ tour: { findFirst: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.findPublicListForTour('nope', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('admin list applies no status default (full history)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new DeparturesService(
      makePrisma({ tourDeparture: { findMany } }),
    );

    await svc.findAdminListForTour('hoi-an', {});

    expect(findMany.mock.calls[0][0].where.status).toBeUndefined();
  });
});
