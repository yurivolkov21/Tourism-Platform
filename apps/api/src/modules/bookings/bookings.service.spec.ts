import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  DepartureStatus,
  PaymentProvider,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { BookingsService } from './bookings.service';
import type { CreateBookingDto } from './dto/create-booking.dto';

const FUTURE = new Date('2999-01-10');

interface Mocks {
  tour?: Record<string, unknown>;
  tourDeparture?: Record<string, unknown>;
  booking?: Record<string, unknown>;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    tour: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'tour-1',
        slug: 'hoi-an',
        title: 'Hoi An',
        currency: 'USD',
        basePrice: new Prisma.Decimal('50.00'),
      }),
      ...m.tour,
    },
    tourDeparture: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'dep-1',
        tourId: 'tour-1',
        startDate: FUTURE,
        status: DepartureStatus.OPEN,
        priceOverride: null,
        seatsTotal: 10,
        seatsBooked: 2,
      }),
      ...m.tourDeparture,
    },
    booking: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data })),
      update: jest.fn(),
      ...m.booking,
    },
  } as unknown as PrismaService;
}

function body(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  return {
    tourSlug: 'hoi-an',
    departureId: 'dep-1',
    numAdults: 2,
    paymentProvider: PaymentProvider.STRIPE,
    contactName: 'A',
    contactEmail: 'a@x.com',
    ...overrides,
  } as CreateBookingDto;
}

describe('BookingsService', () => {
  it('create computes totalAmount, mints a code, and stores PENDING + provider', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data }));
    const svc = new BookingsService(makePrisma({ booking: { create } }));

    await svc.create('user-1', body({ numAdults: 2, numChildren: 1 }));

    const data = create.mock.calls[0][0].data;
    // 3 seats × 50.00 (priceOverride null → tour.basePrice)
    expect(new Prisma.Decimal(data.totalAmount).toString()).toBe('150');
    expect(data.status).toBe(BookingStatus.PENDING);
    expect(data.paymentProvider).toBe(PaymentProvider.STRIPE);
    expect(data.code).toMatch(/^BK-[A-Z0-9]{8}$/);
    expect(data.currency).toBe('USD');
  });

  it('create uses departure.priceOverride when present', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data }));
    const svc = new BookingsService(
      makePrisma({
        tourDeparture: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'dep-1',
            tourId: 'tour-1',
            startDate: FUTURE,
            status: DepartureStatus.OPEN,
            priceOverride: new Prisma.Decimal('40.00'),
            seatsTotal: 10,
            seatsBooked: 0,
          }),
        },
        booking: { create },
      }),
    );

    await svc.create('user-1', body({ numAdults: 2 }));
    expect(new Prisma.Decimal(create.mock.calls[0][0].data.totalAmount).toString()).toBe('80');
  });

  it('create throws 404 when the tour is missing/unpublished', async () => {
    const svc = new BookingsService(
      makePrisma({ tour: { findFirst: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(NotFoundException);
  });

  it('create throws 404 when the departure is missing under the tour', async () => {
    const svc = new BookingsService(
      makePrisma({ tourDeparture: { findFirst: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(NotFoundException);
  });

  it('create rejects a non-OPEN departure (400)', async () => {
    const svc = new BookingsService(
      makePrisma({
        tourDeparture: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'dep-1',
            tourId: 'tour-1',
            startDate: FUTURE,
            status: DepartureStatus.CLOSED,
            priceOverride: null,
            seatsTotal: 10,
            seatsBooked: 0,
          }),
        },
      }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(BadRequestException);
  });

  it('create rejects a departed (past) departure (400)', async () => {
    const svc = new BookingsService(
      makePrisma({
        tourDeparture: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'dep-1',
            tourId: 'tour-1',
            startDate: new Date('2000-01-01'),
            status: DepartureStatus.OPEN,
            priceOverride: null,
            seatsTotal: 10,
            seatsBooked: 0,
          }),
        },
      }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(BadRequestException);
  });

  it('create rejects when not enough seats remain (409)', async () => {
    const svc = new BookingsService(
      makePrisma({
        tourDeparture: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'dep-1',
            tourId: 'tour-1',
            startDate: FUTURE,
            status: DepartureStatus.OPEN,
            priceOverride: null,
            seatsTotal: 10,
            seatsBooked: 9,
          }),
        },
      }),
    );
    await expect(svc.create('user-1', body({ numAdults: 2 }))).rejects.toThrow(
      ConflictException,
    );
  });

  it('findOwnList scopes the query by the caller user id', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new BookingsService(makePrisma({ booking: { findMany } }));
    await svc.findOwnList('user-1');
    expect(findMany.mock.calls[0][0].where.userId).toBe('user-1');
  });

  it('findByCodeForCaller returns the booking for its owner', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ code: 'BK-1', userId: 'user-1' });
    const svc = new BookingsService(makePrisma({ booking: { findUnique } }));
    const res = await svc.findByCodeForCaller('BK-1', {
      id: 'user-1',
      role: UserRole.CUSTOMER,
    });
    expect(res.code).toBe('BK-1');
  });

  it('findByCodeForCaller hides a non-owned booking as 404', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ code: 'BK-1', userId: 'someone-else' });
    const svc = new BookingsService(makePrisma({ booking: { findUnique } }));
    await expect(
      svc.findByCodeForCaller('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findByCodeForCaller allows an admin on any booking', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ code: 'BK-1', userId: 'someone-else' });
    const svc = new BookingsService(makePrisma({ booking: { findUnique } }));
    const res = await svc.findByCodeForCaller('BK-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    expect(res.code).toBe('BK-1');
  });

  it('cancelOwnPending flips a PENDING booking to CANCELLED', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'bk-1', code: 'BK-1', userId: 'user-1', status: BookingStatus.PENDING });
    const update = jest.fn().mockResolvedValue({ id: 'bk-1', status: BookingStatus.CANCELLED });
    const svc = new BookingsService(makePrisma({ booking: { findUnique, update } }));

    await svc.cancelOwnPending('BK-1', { id: 'user-1', role: UserRole.CUSTOMER });

    expect(update.mock.calls[0][0].data.status).toBe(BookingStatus.CANCELLED);
  });

  it('cancelOwnPending refuses a non-PENDING booking (409)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'bk-1', code: 'BK-1', userId: 'user-1', status: BookingStatus.PAID });
    const svc = new BookingsService(makePrisma({ booking: { findUnique } }));
    await expect(
      svc.cancelOwnPending('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(ConflictException);
  });
});
