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
  $queryRaw?: jest.Mock;
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
      count: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data })),
      update: jest.fn(),
      ...m.booking,
    },
    $queryRaw: m.$queryRaw ?? jest.fn().mockResolvedValue([{ id: 'bk-1' }]),
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

function makeStripe(over: Record<string, unknown> = {}) {
  return {
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/cs_1' }),
    createRefund: jest.fn().mockResolvedValue({ id: 're_1', status: 'succeeded' }),
    ...over,
  } as unknown as import('../payments/stripe.service').StripeService;
}

function makeConfig() {
  return {
    getOrThrow: jest.fn().mockReturnValue('https://app.test'),
  } as unknown as import('@nestjs/config').ConfigService;
}

function makePayPal(over: Record<string, unknown> = {}) {
  return {
    createOrder: jest.fn().mockResolvedValue({
      orderId: 'ord_1',
      approveUrl: 'https://paypal.test/approve/ord_1',
    }),
    captureOrder: jest
      .fn()
      .mockResolvedValue({ captureId: 'cap_1', status: 'COMPLETED' }),
    refundCapture: jest.fn().mockResolvedValue({ id: 'rf_1', status: 'COMPLETED' }),
    ...over,
  } as unknown as import('../payments/paypal.service').PayPalService;
}

function makePayments(over: Record<string, unknown> = {}) {
  return {
    claimSeatsForPaid: jest.fn().mockResolvedValue('paid'),
    ...over,
  } as unknown as import('../payments/payments.service').PaymentsService;
}

function svcWith(
  prisma: PrismaService,
  stripe = makeStripe(),
  paypal = makePayPal(),
  payments = makePayments(),
  config = makeConfig(),
): BookingsService {
  return new BookingsService(prisma, stripe, paypal, payments, config);
}

describe('BookingsService', () => {
  it('create computes totalAmount, mints a code, and stores PENDING + provider', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data }));
    const svc = svcWith(makePrisma({ booking: { create } }));

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
    const svc = svcWith(
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
    const svc = svcWith(
      makePrisma({ tour: { findFirst: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(NotFoundException);
  });

  it('create throws 404 when the departure is missing under the tour', async () => {
    const svc = svcWith(
      makePrisma({ tourDeparture: { findFirst: jest.fn().mockResolvedValue(null) } }),
    );
    await expect(svc.create('user-1', body())).rejects.toThrow(NotFoundException);
  });

  it('create rejects a non-OPEN departure (400)', async () => {
    const svc = svcWith(
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
    const svc = svcWith(
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
    const svc = svcWith(
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
    const svc = svcWith(makePrisma({ booking: { findMany } }));
    await svc.findOwnList('user-1');
    expect(findMany.mock.calls[0][0].where.userId).toBe('user-1');
  });

  it('findByCodeForCaller returns the booking for its owner', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ code: 'BK-1', userId: 'user-1' });
    const svc = svcWith(makePrisma({ booking: { findUnique } }));
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
    const svc = svcWith(makePrisma({ booking: { findUnique } }));
    await expect(
      svc.findByCodeForCaller('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findByCodeForCaller allows an admin on any booking', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ code: 'BK-1', userId: 'someone-else' });
    const svc = svcWith(makePrisma({ booking: { findUnique } }));
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
    const svc = svcWith(makePrisma({ booking: { findUnique, update } }));

    await svc.cancelOwnPending('BK-1', { id: 'user-1', role: UserRole.CUSTOMER });

    expect(update.mock.calls[0][0].data.status).toBe(BookingStatus.CANCELLED);
  });

  it('cancelOwnPending refuses a non-PENDING booking (409)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ id: 'bk-1', code: 'BK-1', userId: 'user-1', status: BookingStatus.PAID });
    const svc = svcWith(makePrisma({ booking: { findUnique } }));
    await expect(
      svc.cancelOwnPending('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(ConflictException);
  });

  // ── startCheckout ───────────────────────────────────────────────────────────

  const pendingForCheckout = {
    id: 'bk-1',
    code: 'BK-1',
    status: BookingStatus.PENDING,
    userId: 'user-1',
    paymentProvider: PaymentProvider.STRIPE,
    currency: 'USD',
    totalAmount: new Prisma.Decimal('150.00'),
    contactEmail: 'a@x.com',
    numAdults: 2,
    numChildren: 1,
    tour: { title: 'Hoi An' },
  };

  it('startCheckout mints a session and persists providerSessionId', async () => {
    const update = jest.fn().mockResolvedValue({});
    const stripe = makeStripe();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue(pendingForCheckout),
          update,
        },
      }),
      stripe,
    );

    const res = await svc.startCheckout('BK-1', {
      id: 'user-1',
      role: UserRole.CUSTOMER,
    });

    expect(res.checkoutUrl).toBe('https://stripe.test/cs_1');
    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1);
    // The Stripe success_url must carry the booking code so /checkout/success
    // knows which booking to confirm even before the webhook lands (inc-2).
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'https://app.test/checkout/success?session_id={CHECKOUT_SESSION_ID}&code=BK-1',
      }),
    );
    expect(update.mock.calls[0][0].data.providerSessionId).toBe('cs_1');
  });

  it('startCheckout hides a non-owned booking as 404', async () => {
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...pendingForCheckout, userId: 'other' }),
        },
      }),
    );
    await expect(
      svc.startCheckout('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(NotFoundException);
  });

  it('startCheckout refuses a non-PENDING booking (409)', async () => {
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...pendingForCheckout, status: BookingStatus.PAID }),
        },
      }),
    );
    await expect(
      svc.startCheckout('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(ConflictException);
  });

  // ── refundByAdmin ─────────────────────────────────────────────────────────────

  const paidBooking = {
    id: 'bk-1',
    code: 'BK-1',
    status: BookingStatus.PAID,
    paymentProvider: PaymentProvider.STRIPE,
    providerPaymentId: 'pi_1',
    departureId: 'dep-1',
    numAdults: 2,
    numChildren: 0,
    totalAmount: new Prisma.Decimal('99.00'),
    currency: 'USD',
  };

  it('refundByAdmin refunds via Stripe then releases seats + flips REFUNDED', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'bk-1' }]);
    const stripe = makeStripe();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(paidBooking)
            .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.REFUNDED }),
        },
        $queryRaw: queryRaw,
      }),
      stripe,
    );

    await svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' });

    expect(stripe.createRefund).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    // The refund email is enqueued atomically in the same CTE (ADR-0007).
    const sql = (queryRaw.mock.calls[0][0] as { strings: string[] }).strings.join('');
    expect(sql).toContain('INSERT INTO outbox');
    expect(sql).toContain('BOOKING_REFUNDED');
  });

  it('refundByAdmin rejects a non-PAID booking (400)', async () => {
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...paidBooking, status: BookingStatus.PENDING }),
        },
      }),
    );
    await expect(
      svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refundByAdmin rejects a booking with no captured payment (400)', async () => {
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...paidBooking, providerPaymentId: null }),
        },
      }),
    );
    await expect(
      svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refundByAdmin converges when Stripe says already refunded', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'bk-1' }]);
    const stripe = makeStripe({
      createRefund: jest
        .fn()
        .mockRejectedValue({ code: 'charge_already_refunded' }),
    });
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(paidBooking)
            .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.REFUNDED }),
        },
        $queryRaw: queryRaw,
      }),
      stripe,
    );

    await expect(
      svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' }),
    ).resolves.toBeDefined();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('refundByAdmin surfaces REFUND_FAILED on a generic Stripe error (400)', async () => {
    const stripe = makeStripe({
      createRefund: jest.fn().mockRejectedValue(new Error('network down')),
    });
    const svc = svcWith(
      makePrisma({
        booking: { findUnique: jest.fn().mockResolvedValue(paidBooking) },
      }),
      stripe,
    );
    await expect(
      svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refundByAdmin uses PayPal for a PayPal booking', async () => {
    const paypal = makePayPal();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ ...paidBooking, paymentProvider: PaymentProvider.PAYPAL })
            .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.REFUNDED }),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'bk-1' }]),
      }),
      makeStripe(),
      paypal,
    );

    await svc.refundByAdmin({ code: 'BK-1', adminUserId: 'admin-1' });
    expect(paypal.refundCapture).toHaveBeenCalledWith('pi_1', undefined);
  });

  it('rejects an amount above the booking total with INVALID_REFUND_AMOUNT', async () => {
    const stripe = makeStripe();
    const svc = svcWith(
      makePrisma({
        booking: { findUnique: jest.fn().mockResolvedValue(paidBooking) },
      }),
      stripe,
    );

    await expect(
      svc.refundByAdmin({ code: 'BK-1', amount: 150, adminUserId: 'admin-1' }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_REFUND_AMOUNT' } });
    expect(stripe.createRefund).not.toHaveBeenCalled();
  });

  it('full refund (amount omitted) refunds the whole PI and releases seats', async () => {
    const stripe = makeStripe();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(paidBooking)
            .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.REFUNDED }),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'bk-1' }]),
      }),
      stripe,
    );

    await svc.refundByAdmin({ code: 'BK-1', reason: 'x', adminUserId: 'admin-1' });
    expect(stripe.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: 'pi_1' }),
    );
    // amountMinorUnits NOT passed on a full refund:
    expect(stripe.createRefund).toHaveBeenCalledWith(
      expect.not.objectContaining({ amountMinorUnits: expect.anything() }),
    );
  });

  it('treats amount === total as a full refund (no amountMinorUnits)', async () => {
    const stripe = makeStripe();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(paidBooking)
            .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.REFUNDED }),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'bk-1' }]),
      }),
      stripe,
    );

    await svc.refundByAdmin({ code: 'BK-1', amount: 99, adminUserId: 'admin-1' });
    expect(stripe.createRefund).toHaveBeenCalledWith(
      expect.not.objectContaining({ amountMinorUnits: expect.anything() }),
    );
  });

  // ── startCheckout (PayPal) + capturePayPal ─────────────────────────────────────

  const paypalPending = {
    id: 'bk-1',
    code: 'BK-1',
    status: BookingStatus.PENDING,
    userId: 'user-1',
    paymentProvider: PaymentProvider.PAYPAL,
    providerSessionId: 'ord_1',
  };

  it('startCheckout (PayPal) creates an order and returns the approve url', async () => {
    const update = jest.fn().mockResolvedValue({});
    const paypal = makePayPal();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            ...pendingForCheckout,
            paymentProvider: PaymentProvider.PAYPAL,
          }),
          update,
        },
      }),
      makeStripe(),
      paypal,
    );

    const res = await svc.startCheckout('BK-1', {
      id: 'user-1',
      role: UserRole.CUSTOMER,
    });

    expect(res.checkoutUrl).toBe('https://paypal.test/approve/ord_1');
    expect(paypal.createOrder).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.providerSessionId).toBe('ord_1');
  });

  it('capturePayPal captures, claims seats, and returns the booking', async () => {
    const paypal = makePayPal();
    const payments = makePayments({
      claimSeatsForPaid: jest.fn().mockResolvedValue('paid'),
    });
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(paypalPending)
            .mockResolvedValueOnce({ code: 'BK-1', userId: 'user-1' }),
        },
      }),
      makeStripe(),
      paypal,
      payments,
    );

    await svc.capturePayPal('BK-1', { id: 'user-1', role: UserRole.CUSTOMER });

    expect(paypal.captureOrder).toHaveBeenCalledWith('ord_1');
    expect(payments.claimSeatsForPaid).toHaveBeenCalled();
  });

  it('capturePayPal refunds and raises 409 when overbooked', async () => {
    const paypal = makePayPal();
    const payments = makePayments({
      claimSeatsForPaid: jest.fn().mockResolvedValue('overbooked'),
    });
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue(paypalPending),
          update: jest.fn().mockResolvedValue({}),
        },
      }),
      makeStripe(),
      paypal,
      payments,
    );

    await expect(
      svc.capturePayPal('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(ConflictException);
    expect(paypal.refundCapture).toHaveBeenCalledWith('cap_1');
  });

  it('capturePayPal rejects a non-PayPal booking (400)', async () => {
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            ...paypalPending,
            paymentProvider: PaymentProvider.STRIPE,
          }),
        },
      }),
    );
    await expect(
      svc.capturePayPal('BK-1', { id: 'user-1', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(BadRequestException);
  });

  it('capturePayPal is idempotent when already PAID (no capture call)', async () => {
    const paypal = makePayPal();
    const svc = svcWith(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ ...paypalPending, status: BookingStatus.PAID })
            .mockResolvedValueOnce({ code: 'BK-1', userId: 'user-1' }),
        },
      }),
      makeStripe(),
      paypal,
    );

    await svc.capturePayPal('BK-1', { id: 'user-1', role: UserRole.CUSTOMER });
    expect(paypal.captureOrder).not.toHaveBeenCalled();
  });

  describe('findAllForAdmin', () => {
    it('returns paginated items + meta', async () => {
      const prisma = makePrisma({
        booking: {
          findMany: jest.fn().mockResolvedValue([{ id: 'bk-1' }, { id: 'bk-2' }]),
          count: jest.fn().mockResolvedValue(2),
        },
      });
      const result = await svcWith(prisma).findAllForAdmin({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(2);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it('applies status filter + case-insensitive search to the where clause', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        booking: { findMany, count: jest.fn().mockResolvedValue(0) },
      });
      await svcWith(prisma).findAllForAdmin({ status: BookingStatus.PAID, search: 'hoi' });
      const where = findMany.mock.calls[0][0].where;
      expect(where.status).toBe(BookingStatus.PAID);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: { contains: 'hoi', mode: 'insensitive' } }),
          expect.objectContaining({ contactEmail: { contains: 'hoi', mode: 'insensitive' } }),
        ]),
      );
    });

    it('AND-composes departure/tour filters with status', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        booking: { findMany, count: jest.fn().mockResolvedValue(0) },
      });
      await svcWith(prisma).findAllForAdmin({
        status: BookingStatus.PAID,
        departureId: 'dep-1',
        tourId: 'tour-1',
      } as never);
      const where = findMany.mock.calls[0][0].where;
      expect(where.status).toBe(BookingStatus.PAID);
      expect(where.departureId).toBe('dep-1');
      expect(where.tourId).toBe('tour-1');
    });

    it('AND-composes the userId filter with status', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        booking: { findMany, count: jest.fn().mockResolvedValue(0) },
      });
      await svcWith(prisma).findAllForAdmin({
        status: BookingStatus.PAID,
        userId: 'user-1',
      } as never);
      const where = findMany.mock.calls[0][0].where;
      expect(where.status).toBe(BookingStatus.PAID);
      expect(where.userId).toBe('user-1');
    });

    it('computes totalPages from total + pageSize', async () => {
      const prisma = makePrisma({
        booking: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(45),
        },
      });
      const result = await svcWith(prisma).findAllForAdmin({ page: 2, pageSize: 20 });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findByCodeForAdmin', () => {
    it('maps the enriched detail (audit fields) when found (no owner check)', async () => {
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-1',
            code: 'BK-1',
            status: 'REFUNDED',
            numAdults: 2,
            numChildren: 1,
            totalAmount: { toString: () => '99.00' },
            currency: 'USD',
            paymentProvider: 'STRIPE',
            contactName: 'Jane',
            contactEmail: 'jane@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-1',
            providerSessionId: 'cs_abc123',
            user: {
              id: 'user-1',
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              createdAt: new Date('2026-01-05T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 12,
              seatsBooked: 7,
            },
            paidAt: new Date('2026-07-01T10:00:00Z'),
            cancelledAt: new Date('2026-07-02T09:00:00Z'),
            providerPaymentId: 'pi_123',
            refundReason: 'Customer request',
            refundedBy: { fullName: 'Admin One', email: 'admin@example.com' },
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-07-02T09:00:00Z'),
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      });
      const result = await svcWith(prisma).findByCodeForAdmin('BK-1');
      expect(result.code).toBe('BK-1');
      expect(result.totalAmount).toBe('99.00');
      expect(result.paidAt).toBe('2026-07-01T10:00:00.000Z');
      expect(result.providerPaymentId).toBe('pi_123');
      expect(result.refundReason).toBe('Customer request');
      expect(result.refundedBy).toEqual({ fullName: 'Admin One', email: 'admin@example.com' });
    });

    it('maps refundedBy to null when the booking was never refunded', async () => {
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-2',
            code: 'BK-2',
            status: 'PAID',
            numAdults: 1,
            numChildren: 0,
            totalAmount: { toString: () => '39.00' },
            currency: 'USD',
            paymentProvider: 'STRIPE',
            contactName: 'Bob',
            contactEmail: 'bob@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-1',
            providerSessionId: 'cs_abc123',
            user: {
              id: 'user-1',
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              createdAt: new Date('2026-01-05T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 12,
              seatsBooked: 7,
            },
            paidAt: new Date('2026-07-01T10:00:00Z'),
            cancelledAt: null,
            providerPaymentId: 'pi_999',
            refundReason: null,
            refundedBy: null,
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-07-01T10:00:00Z'),
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      });
      const result = await svcWith(prisma).findByCodeForAdmin('BK-2');
      expect(result.refundedBy).toBeNull();
      expect(result.cancelledAt).toBeNull();
    });

    it('throws 404 when the code is missing', async () => {
      const prisma = makePrisma({
        booking: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(svcWith(prisma).findByCodeForAdmin('BK-NOPE')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps customer, seats, session id, other bookings and payment events', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          code: 'BK-OTHER',
          status: 'PAID',
          createdAt: new Date('2026-05-01T00:00:00Z'),
          totalAmount: { toString: () => '150.00' },
          currency: 'USD',
          tour: { title: 'Mekong Delta Day Trip' },
        },
      ]);
      const count = jest.fn().mockResolvedValue(7);
      const $queryRaw = jest.fn().mockResolvedValue([
        {
          id: 'evt-row-1',
          provider: 'STRIPE',
          type: 'checkout.session.completed',
          eventId: 'evt_1',
          receivedAt: new Date('2026-07-01T10:00:00Z'),
          processedAt: null,
        },
      ]);
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-1',
            code: 'BK-1',
            status: 'PAID',
            numAdults: 2,
            numChildren: 0,
            totalAmount: { toString: () => '99.00' },
            currency: 'USD',
            paymentProvider: 'STRIPE',
            contactName: 'Jane',
            contactEmail: 'jane@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-1',
            providerSessionId: 'cs_abc123',
            user: {
              id: 'user-1',
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              createdAt: new Date('2026-01-05T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 12,
              seatsBooked: 7,
            },
            paidAt: new Date('2026-07-01T10:00:00Z'),
            cancelledAt: null,
            providerPaymentId: 'pi_123',
            refundReason: null,
            refundedBy: null,
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-07-01T10:00:00Z'),
          }),
          findMany,
          count,
        },
        $queryRaw,
      });

      const result = await svcWith(prisma).findByCodeForAdmin('BK-1');

      expect(result.providerSessionId).toBe('cs_abc123');
      expect(result.departure.seatsTotal).toBe(12);
      expect(result.departure.seatsBooked).toBe(7);
      expect(result.customer).toEqual({
        id: 'user-1',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        createdAt: '2026-01-05T00:00:00.000Z',
      });
      expect(result.otherBookings.total).toBe(7);
      expect(result.otherBookings.items).toEqual([
        {
          code: 'BK-OTHER',
          status: 'PAID',
          createdAt: '2026-05-01T00:00:00.000Z',
          tourTitle: 'Mekong Delta Day Trip',
          totalAmount: '150.00',
          currency: 'USD',
        },
      ]);
      expect(result.paymentEvents).toEqual([
        {
          id: 'evt-row-1',
          provider: 'STRIPE',
          type: 'checkout.session.completed',
          eventId: 'evt_1',
          receivedAt: '2026-07-01T10:00:00.000Z',
          processedAt: null,
        },
      ]);
      // Other-bookings query excludes the current booking + caps at 5, newest first.
      const otherArgs = findMany.mock.calls[0][0];
      expect(otherArgs.where).toEqual({ userId: 'user-1', id: { not: 'bk-1' } });
      expect(otherArgs.take).toBe(5);
      expect(otherArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('returns empty otherBookings/paymentEvents when the customer has no history', async () => {
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-2',
            code: 'BK-2',
            status: 'PENDING',
            numAdults: 1,
            numChildren: 0,
            totalAmount: { toString: () => '39.00' },
            currency: 'USD',
            paymentProvider: 'PAYPAL',
            contactName: 'Bob',
            contactEmail: 'bob@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-2',
            providerSessionId: null,
            user: {
              id: 'user-2',
              fullName: null,
              email: 'bob@example.com',
              createdAt: new Date('2026-06-01T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 10,
              seatsBooked: 0,
            },
            paidAt: null,
            cancelledAt: null,
            providerPaymentId: null,
            refundReason: null,
            refundedBy: null,
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-06-30T08:00:00Z'),
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      });

      const result = await svcWith(prisma).findByCodeForAdmin('BK-2');

      expect(result.providerSessionId).toBeNull();
      expect(result.customer.fullName).toBeNull();
      expect(result.otherBookings).toEqual({ total: 0, items: [] });
      expect(result.paymentEvents).toEqual([]);
    });
  });
});
