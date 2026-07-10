import { BadRequestException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

function completedEvent() {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        metadata: { bookingId: 'bk-1', bookingCode: 'BK-1' },
        payment_intent: 'pi_1',
      },
    },
  };
}

function makeStripe(over: Record<string, unknown> = {}) {
  return {
    constructEvent: jest.fn().mockReturnValue(completedEvent()),
    createRefund: jest
      .fn()
      .mockResolvedValue({ id: 're_1', status: 'succeeded' }),
    ...over,
  } as unknown as import('./stripe.service').StripeService;
}

function makeConfig() {
  return {
    getOrThrow: jest.fn().mockReturnValue('whsec_test'),
  } as unknown as import('@nestjs/config').ConfigService;
}

interface PrismaOver {
  paymentEvent?: Record<string, unknown>;
  booking?: Record<string, unknown>;
  $queryRaw?: jest.Mock;
}

function makePrisma(o: PrismaOver = {}): PrismaService {
  return {
    paymentEvent: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      ...o.paymentEvent,
    },
    booking: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      ...o.booking,
    },
    $queryRaw: o.$queryRaw ?? jest.fn().mockResolvedValue([{ id: 'bk-1' }]),
  } as unknown as PrismaService;
}

function makePayPal(over: Record<string, unknown> = {}) {
  return {
    verifyWebhookSignature: jest.fn().mockResolvedValue(true),
    refundCapture: jest
      .fn()
      .mockResolvedValue({ id: 'rf_1', status: 'COMPLETED' }),
    ...over,
  } as unknown as import('./paypal.service').PayPalService;
}

function svc(
  prisma: PrismaService,
  stripe = makeStripe(),
  paypal = makePayPal(),
): PaymentsService {
  return new PaymentsService(prisma, stripe, paypal, makeConfig());
}

const RAW = Buffer.from('{}');

describe('PaymentsService.handleStripeEvent', () => {
  it('rejects an invalid signature with 400', async () => {
    const stripe = makeStripe({
      constructEvent: jest.fn(() => {
        throw new Error('bad sig');
      }),
    });
    await expect(
      svc(makePrisma(), stripe).handleStripeEvent(RAW, 'sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('skips a duplicate already-processed event without side effects', async () => {
    const update = jest.fn();
    const queryRaw = jest.fn();
    const service = svc(
      makePrisma({
        paymentEvent: {
          create: jest.fn().mockRejectedValue(knownError('P2002')),
          findUnique: jest.fn().mockResolvedValue({ processedAt: new Date() }),
          update,
        },
        $queryRaw: queryRaw,
      }),
    );

    const res = await service.handleStripeEvent(RAW, 'sig');

    expect(res).toEqual({
      received: true,
      eventId: 'evt_1',
      type: 'checkout.session.completed',
    });
    expect(queryRaw).not.toHaveBeenCalled(); // no dispatch
    expect(update).not.toHaveBeenCalled(); // no processedAt write
  });

  it('on completed: claims seats atomically and marks the event processed', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'bk-1' }]);
    const evtUpdate = jest.fn().mockResolvedValue({});
    const stripe = makeStripe();
    const service = svc(
      makePrisma({ $queryRaw: queryRaw, paymentEvent: { update: evtUpdate } }),
      stripe,
    );

    await service.handleStripeEvent(RAW, 'sig');

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(stripe.createRefund).not.toHaveBeenCalled();
    expect(evtUpdate.mock.calls[0][0].data.processedAt).toBeInstanceOf(Date);
    // The confirmation email is enqueued atomically in the same CTE (ADR-0007).
    const sql = (
      queryRaw.mock.calls[0][0] as { strings: string[] }
    ).strings.join('');
    expect(sql).toContain('INSERT INTO outbox');
    expect(sql).toContain('BOOKING_CONFIRMATION');
  });

  it('on completed but overbooked: auto-refunds and marks REFUNDED', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]); // no seat claimed
    const bookingUpdate = jest.fn().mockResolvedValue({});
    const stripe = makeStripe();
    const service = svc(
      makePrisma({
        $queryRaw: queryRaw,
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ status: BookingStatus.PENDING }),
          update: bookingUpdate,
        },
      }),
      stripe,
    );

    await service.handleStripeEvent(RAW, 'sig');

    expect(stripe.createRefund).toHaveBeenCalledTimes(1);
    expect(bookingUpdate.mock.calls[0][0].data.status).toBe(
      BookingStatus.REFUNDED,
    );
  });

  it('on completed but already terminal: no refund, no seat change', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    const stripe = makeStripe();
    const service = svc(
      makePrisma({
        $queryRaw: queryRaw,
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ status: BookingStatus.PAID }),
        },
      }),
      stripe,
    );

    await service.handleStripeEvent(RAW, 'sig');
    expect(stripe.createRefund).not.toHaveBeenCalled();
  });

  it('on expired: cancels a PENDING booking', async () => {
    const bookingUpdate = jest.fn().mockResolvedValue({});
    const stripe = makeStripe({
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_2',
        type: 'checkout.session.expired',
        data: { object: { id: 'cs_2', metadata: { bookingId: 'bk-1' } } },
      }),
    });
    const service = svc(
      makePrisma({
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ code: 'BK-1', status: BookingStatus.PENDING }),
          update: bookingUpdate,
        },
      }),
      stripe,
    );

    await service.handleStripeEvent(RAW, 'sig');
    expect(bookingUpdate.mock.calls[0][0].data.status).toBe(
      BookingStatus.CANCELLED,
    );
  });

  it('ignores an unhandled event type but still acks 200', async () => {
    const queryRaw = jest.fn();
    const stripe = makeStripe({
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_3',
        type: 'payment_intent.created',
        data: { object: {} },
      }),
    });
    const service = svc(makePrisma({ $queryRaw: queryRaw }), stripe);

    const res = await service.handleStripeEvent(RAW, 'sig');
    expect(res.type).toBe('payment_intent.created');
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('PaymentsService.claimSeatsForPaid (shared)', () => {
  it('returns "paid" when the atomic CTE claims a row', async () => {
    const service = svc(
      makePrisma({ $queryRaw: jest.fn().mockResolvedValue([{ id: 'bk-1' }]) }),
    );
    await expect(service.claimSeatsForPaid('bk-1', 'pay_1')).resolves.toBe(
      'paid',
    );
  });

  it('returns "overbooked" when nothing claimed but booking still PENDING', async () => {
    const service = svc(
      makePrisma({
        $queryRaw: jest.fn().mockResolvedValue([]),
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ status: BookingStatus.PENDING }),
        },
      }),
    );
    await expect(service.claimSeatsForPaid('bk-1', 'pay_1')).resolves.toBe(
      'overbooked',
    );
  });

  it('returns "already_processed" for a terminal-state booking', async () => {
    const service = svc(
      makePrisma({
        $queryRaw: jest.fn().mockResolvedValue([]),
        booking: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ status: BookingStatus.PAID }),
        },
      }),
    );
    await expect(service.claimSeatsForPaid('bk-1', 'pay_1')).resolves.toBe(
      'already_processed',
    );
  });
});

describe('PaymentsService.handlePayPalEvent', () => {
  const headers = {
    'paypal-transmission-id': 't',
    'paypal-transmission-sig': 's',
  };
  const captureEvent = {
    id: 'wh_1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: { id: 'cap_1', custom_id: 'bk-1' },
  };

  it('rejects an invalid signature with 400', async () => {
    const paypal = makePayPal({
      verifyWebhookSignature: jest.fn().mockResolvedValue(false),
    });
    await expect(
      svc(makePrisma(), makeStripe(), paypal).handlePayPalEvent(
        headers,
        captureEvent,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a malformed payload with 400', async () => {
    await expect(
      svc(makePrisma()).handlePayPalEvent(headers, { foo: 'bar' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('on CAPTURE.COMPLETED claims seats and marks the event processed', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'bk-1' }]);
    const evtUpdate = jest.fn().mockResolvedValue({});
    const service = svc(
      makePrisma({ $queryRaw: queryRaw, paymentEvent: { update: evtUpdate } }),
    );

    await service.handlePayPalEvent(headers, captureEvent);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(evtUpdate.mock.calls[0][0].data.processedAt).toBeInstanceOf(Date);
  });

  it('skips a duplicate already-processed PayPal event', async () => {
    const queryRaw = jest.fn();
    const service = svc(
      makePrisma({
        paymentEvent: {
          create: jest.fn().mockRejectedValue(knownError('P2002')),
          findUnique: jest.fn().mockResolvedValue({ processedAt: new Date() }),
        },
        $queryRaw: queryRaw,
      }),
    );

    const res = await service.handlePayPalEvent(headers, captureEvent);
    expect(res.eventId).toBe('wh_1');
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
