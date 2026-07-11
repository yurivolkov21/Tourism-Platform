import { PaymentProvider } from '@prisma/client';
import { AdminPaymentEventsService } from './admin-payment-events.service';

const STRIPE_ROW = {
  id: 'pe-1',
  provider: PaymentProvider.STRIPE,
  eventId: 'evt_123',
  type: 'checkout.session.completed',
  payload: {
    data: { object: { metadata: { bookingId: 'b-1' } } },
  },
  processedAt: new Date('2026-07-01T10:00:00Z'),
  receivedAt: new Date('2026-07-01T09:59:59Z'),
};

const PAYPAL_ROW = {
  id: 'pe-2',
  provider: PaymentProvider.PAYPAL,
  eventId: 'WH-456',
  type: 'PAYMENT.CAPTURE.COMPLETED',
  payload: { resource: { custom_id: 'b-2' } },
  processedAt: null,
  receivedAt: new Date('2026-07-02T08:00:00Z'),
};

const ORPHAN_ROW = {
  id: 'pe-3',
  provider: PaymentProvider.STRIPE,
  eventId: 'evt_789',
  type: 'charge.refunded',
  payload: { data: { object: {} } },
  processedAt: null,
  receivedAt: new Date('2026-07-03T08:00:00Z'),
};

function makePrisma(rows: unknown[], bookings: unknown[] = []) {
  return {
    paymentEvent: {
      findMany: jest.fn().mockResolvedValue(rows),
      count: jest.fn().mockResolvedValue(rows.length),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue(bookings),
    },
  };
}

describe('AdminPaymentEventsService.findAllForAdmin', () => {
  it('derives the booking id per provider payload path and joins the code', async () => {
    const prisma = makePrisma(
      [STRIPE_ROW, PAYPAL_ROW, ORPHAN_ROW],
      [
        { id: 'b-1', code: 'BK-STRIPE1' },
        { id: 'b-2', code: 'BK-PAYPAL2' },
      ],
    );
    const svc = new AdminPaymentEventsService(prisma as never);

    const res = await svc.findAllForAdmin({});

    expect(res.items[0].bookingId).toBe('b-1');
    expect(res.items[0].bookingCode).toBe('BK-STRIPE1');
    expect(res.items[1].bookingId).toBe('b-2');
    expect(res.items[1].bookingCode).toBe('BK-PAYPAL2');
    expect(res.items[2].bookingId).toBeNull();
    expect(res.items[2].bookingCode).toBeNull();
    // One IN query over the distinct derived ids.
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['b-1', 'b-2'] } },
      select: { id: true, code: true },
    });
  });

  it('skips the booking join when no row derives an id', async () => {
    const prisma = makePrisma([ORPHAN_ROW]);
    const svc = new AdminPaymentEventsService(prisma as never);

    const res = await svc.findAllForAdmin({});

    expect(res.items[0].bookingCode).toBeNull();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('builds the where from provider, type, and eventId search', async () => {
    const prisma = makePrisma([]);
    const svc = new AdminPaymentEventsService(prisma as never);

    await svc.findAllForAdmin({
      provider: PaymentProvider.STRIPE,
      type: 'checkout',
      search: 'evt_1',
    });

    const where = prisma.paymentEvent.findMany.mock.calls[0][0].where;
    expect(where.provider).toBe(PaymentProvider.STRIPE);
    expect(where.type).toEqual({ contains: 'checkout', mode: 'insensitive' });
    expect(where.eventId).toEqual({ contains: 'evt_1', mode: 'insensitive' });
  });

  it('paginates newest-first and returns the payload for the drawer', async () => {
    const prisma = makePrisma([STRIPE_ROW]);
    const svc = new AdminPaymentEventsService(prisma as never);

    const res = await svc.findAllForAdmin({ page: 2, pageSize: 10 });

    const args = prisma.paymentEvent.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ receivedAt: 'desc' });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(res.items[0].payload).toEqual(STRIPE_ROW.payload);
    expect(res.meta.page).toBe(2);
  });
});
