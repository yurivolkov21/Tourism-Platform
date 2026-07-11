import { Logger } from '@nestjs/common';
import { EmailType, OutboxStatus } from '@prisma/client';
import { OutboxService } from './outbox.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

interface PrismaParts {
  findMany?: jest.Mock;
  updateMany?: jest.Mock;
  bookingFindUnique?: jest.Mock;
  reviewFindUnique?: jest.Mock;
  enquiryFindUnique?: jest.Mock;
}

function makePrisma(parts: PrismaParts) {
  return {
    outbox: {
      findMany: parts.findMany ?? jest.fn().mockResolvedValue([]),
      updateMany: parts.updateMany ?? jest.fn().mockResolvedValue({ count: 1 }),
    },
    booking: { findUnique: parts.bookingFindUnique ?? jest.fn() },
    review: { findUnique: parts.reviewFindUnique ?? jest.fn() },
    enquiry: { findUnique: parts.enquiryFindUnique ?? jest.fn() },
  };
}

function makeEmail() {
  return {
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    sendBookingRefunded: jest.fn().mockResolvedValue(undefined),
    sendReviewApproved: jest.fn().mockResolvedValue(undefined),
    sendEnquiryReceived: jest.fn().mockResolvedValue(undefined),
  };
}

const bookingRow = {
  id: 'ob-1',
  type: EmailType.BOOKING_CONFIRMATION,
  payload: { bookingId: 'bk-1' },
  status: OutboxStatus.PENDING,
  attempts: 0,
};

const seededBooking = {
  code: 'BK-1',
  contactName: 'Jane',
  contactEmail: 'jane@example.com',
  totalAmount: { toFixed: (): string => '249.00' },
  currency: 'USD',
  numAdults: 2,
  numChildren: 0,
  tour: { title: 'Hoi An Walk' },
  departure: {
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-03'),
  },
};

describe('OutboxService.drainOutbox', () => {
  it('sends a PENDING booking confirmation then marks the row SENT', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([bookingRow]),
      updateMany,
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
    });
    const svc = new OutboxService(prisma as never, email as never);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendBookingConfirmation).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: expect.objectContaining({ code: 'BK-1', totalAmount: '249.00' }),
    });
    type UpdCall = { data: { status: OutboxStatus } };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.status).toBe(OutboxStatus.SENT);
  });

  it('routes BOOKING_REFUNDED to the refund email', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest
        .fn()
        .mockResolvedValue([
          { ...bookingRow, type: EmailType.BOOKING_REFUNDED },
        ]),
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
    });
    const svc = new OutboxService(prisma as never, email as never);

    await svc.drainOutbox();

    expect(email.sendBookingRefunded).toHaveBeenCalledTimes(1);
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
  });

  it('routes REVIEW_APPROVED with reviewer name + rating', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.REVIEW_APPROVED,
          payload: { reviewId: 'rv-1' },
        },
      ]),
      reviewFindUnique: jest.fn().mockResolvedValue({
        rating: 5,
        user: { email: 'jane@example.com', fullName: 'Jane' },
        tour: { title: 'Hoi An Walk' },
      }),
    });
    const svc = new OutboxService(prisma as never, email as never);

    await svc.drainOutbox();

    expect(email.sendReviewApproved).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: { reviewerName: 'Jane', tourTitle: 'Hoi An Walk', rating: 5 },
    });
  });

  it('routes ENQUIRY_RECEIVED and tolerates a null tour', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.ENQUIRY_RECEIVED,
          payload: { enquiryId: 'en-1' },
        },
      ]),
      enquiryFindUnique: jest.fn().mockResolvedValue({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'Available in July?',
        tour: null,
      }),
    });
    const svc = new OutboxService(prisma as never, email as never);

    await svc.drainOutbox();

    expect(email.sendEnquiryReceived).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: { name: 'Jane', message: 'Available in July?', tourTitle: null },
    });
  });

  it('bumps attempts and keeps the row PENDING when a send fails below the cap', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    email.sendBookingConfirmation.mockRejectedValue(new Error('Resend down'));
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([{ ...bookingRow, attempts: 1 }]),
      updateMany,
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
    });
    const svc = new OutboxService(prisma as never, email as never);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 0, failed: 1 });
    type UpdCall = {
      data: { status: OutboxStatus; attempts: number; lastError: string };
    };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.attempts).toBe(2);
    expect(calls[0][0].data.status).toBe(OutboxStatus.PENDING);
    expect(calls[0][0].data.lastError).toContain('Resend down');
  });

  it('parks the row FAILED once attempts reach the cap', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    email.sendBookingConfirmation.mockRejectedValue(new Error('still down'));
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([{ ...bookingRow, attempts: 4 }]),
      updateMany,
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
    });
    const svc = new OutboxService(prisma as never, email as never);

    await svc.drainOutbox();

    type UpdCall = { data: { status: OutboxStatus } };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.status).toBe(OutboxStatus.FAILED);
  });

  it('consumes a row whose entity no longer exists without sending', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([bookingRow]),
      updateMany,
      bookingFindUnique: jest.fn().mockResolvedValue(null),
    });
    const svc = new OutboxService(prisma as never, email as never);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    type UpdCall = { data: { status: OutboxStatus } };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.status).toBe(OutboxStatus.SENT);
  });

  it('is a no-op when nothing is PENDING', async () => {
    const email = makeEmail();
    const svc = new OutboxService(
      makePrisma({ findMany: jest.fn().mockResolvedValue([]) }) as never,
      email as never,
    );

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
  });
});
