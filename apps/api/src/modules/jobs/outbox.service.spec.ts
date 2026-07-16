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
  cancellationFindUnique?: jest.Mock;
  mediaFindFirst?: jest.Mock;
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
    cancellationRequest: {
      findUnique: parts.cancellationFindUnique ?? jest.fn(),
    },
    mediaAsset: {
      findFirst: parts.mediaFindFirst ?? jest.fn().mockResolvedValue(null),
    },
  };
}

function makeEmail() {
  return {
    sendBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    sendBookingRefunded: jest.fn().mockResolvedValue(undefined),
    sendReviewApproved: jest.fn().mockResolvedValue(undefined),
    sendEnquiryReceived: jest.fn().mockResolvedValue(undefined),
    sendCancellationRequested: jest.fn().mockResolvedValue(undefined),
    sendCancellationDenied: jest.fn().mockResolvedValue(undefined),
    sendNewsletterWelcome: jest.fn().mockResolvedValue(undefined),
    sendEmailChangedNotice: jest.fn().mockResolvedValue(undefined),
  };
}

/** Config stub: FRONTEND_URL for CTA links + Cloudinary cloud for hero URLs. */
function makeConfig() {
  const values: Record<string, string> = {
    'app.frontendUrl': 'https://web.example.com',
    'cloudinary.cloudName': 'demo-cloud',
  };
  return {
    getOrThrow: (key: string) => {
      const v = values[key];
      if (v === undefined) throw new Error(`missing ${key}`);
      return v;
    },
    get: (key: string) => values[key],
  };
}

function makeService(prisma: unknown, email: unknown) {
  return new OutboxService(
    prisma as never,
    email as never,
    makeConfig() as never,
  );
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
  refundedAmount: null,
  status: 'PAID',
  currency: 'USD',
  numAdults: 2,
  numChildren: 0,
  tour: { title: 'Hoi An Walk', slug: 'hoi-an-walk' },
  departure: {
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-03'),
  },
};

describe('OutboxService.drainOutbox', () => {
  it('sends a PENDING booking confirmation (with CTA + hero) then marks the row SENT', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    const mediaFindFirst = jest.fn().mockResolvedValue({
      publicId: 'tourism/tours/hero/hoi-an',
      type: 'IMAGE',
      posterId: null,
      alt: 'Lanterns at dusk',
    });
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([bookingRow]),
      updateMany,
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
      mediaFindFirst,
    });
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    // IMAGE-only: a VIDEO hero must never land in the email's <img src>.
    expect(mediaFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'IMAGE' }),
      }),
    );

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendBookingConfirmation).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: expect.objectContaining({
        code: 'BK-1',
        totalAmount: '249.00',
        manageUrl: 'https://web.example.com/account/bookings',
        tourImageUrl:
          'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/tourism/tours/hero/hoi-an',
        tourImageAlt: 'Lanterns at dusk',
      }),
    });
    type UpdCall = { data: { status: OutboxStatus } };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.status).toBe(OutboxStatus.SENT);
  });

  it('sends the confirmation without a hero when the tour has no media', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([bookingRow]),
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendBookingConfirmation).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: expect.objectContaining({
        tourImageUrl: null,
        tourImageAlt: null,
      }),
    });
  });

  it('routes a partial BOOKING_REFUNDED with the refunded amount', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest
        .fn()
        .mockResolvedValue([
          { ...bookingRow, type: EmailType.BOOKING_REFUNDED },
        ]),
      bookingFindUnique: jest.fn().mockResolvedValue({
        ...seededBooking,
        status: 'PARTIALLY_REFUNDED',
        refundedAmount: { toFixed: (): string => '100.00' },
        refundReason: 'Departure cancelled by the operator',
      }),
    });
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendBookingRefunded).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: expect.objectContaining({
        refundedAmount: '100.00',
        isPartial: true,
        totalAmount: '249.00',
        reason: 'Departure cancelled by the operator',
      }),
    });
  });

  it('routes a full BOOKING_REFUNDED falling back to the total when refundedAmount is null', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest
        .fn()
        .mockResolvedValue([
          { ...bookingRow, type: EmailType.BOOKING_REFUNDED },
        ]),
      bookingFindUnique: jest.fn().mockResolvedValue({
        ...seededBooking,
        status: 'REFUNDED',
        refundedAmount: null,
      }),
    });
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendBookingRefunded).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: expect.objectContaining({
        refundedAmount: '249.00',
        isPartial: false,
      }),
    });
  });

  it('routes REVIEW_APPROVED with reviewer name + rating + tour link', async () => {
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
        tour: { title: 'Hoi An Walk', slug: 'hoi-an-walk' },
      }),
    });
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendReviewApproved).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: {
        reviewerName: 'Jane',
        tourTitle: 'Hoi An Walk',
        rating: 5,
        tourUrl: 'https://web.example.com/tours/hoi-an-walk',
      },
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
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendEnquiryReceived).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: {
        name: 'Jane',
        message: 'Available in July?',
        tourTitle: null,
        browseUrl: 'https://web.example.com/tours',
      },
    });
  });

  it('routes CANCELLATION_REQUESTED to the booking contact (API-W1)', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.CANCELLATION_REQUESTED,
          payload: { bookingId: 'bk-1' },
        },
      ]),
      bookingFindUnique: jest.fn().mockResolvedValue(seededBooking),
    });
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendCancellationRequested).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: {
        code: 'BK-1',
        tourTitle: 'Hoi An Walk',
        contactName: 'Jane',
      },
    });
  });

  it('routes CANCELLATION_DENIED with the decision note (API-W1)', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.CANCELLATION_DENIED,
          payload: { requestId: 'cr-1' },
        },
      ]),
      cancellationFindUnique: jest.fn().mockResolvedValue({
        decisionNote: 'Too close to departure.',
        booking: {
          code: 'BK-1',
          contactName: 'Jane',
          contactEmail: 'jane@example.com',
        },
      }),
    });
    const svc = makeService(prisma, email);

    await svc.drainOutbox();

    expect(email.sendCancellationDenied).toHaveBeenCalledWith({
      to: 'jane@example.com',
      vars: {
        code: 'BK-1',
        contactName: 'Jane',
        decisionNote: 'Too close to departure.',
        manageUrl: 'https://web.example.com/account/bookings',
      },
    });
  });

  it('consumes a CANCELLATION_DENIED row whose request vanished', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.CANCELLATION_DENIED,
          payload: { requestId: 'cr-gone' },
        },
      ]),
      updateMany,
      cancellationFindUnique: jest.fn().mockResolvedValue(null),
    });
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendCancellationDenied).not.toHaveBeenCalled();
  });

  it('routes NEWSLETTER_WELCOME straight from the payload (API-W1)', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.NEWSLETTER_WELCOME,
          payload: { email: 'sub@example.com' },
        },
      ]),
    });
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendNewsletterWelcome).toHaveBeenCalledWith({
      to: 'sub@example.com',
      vars: { journalUrl: 'https://web.example.com/blog' },
    });
  });

  it('routes EMAIL_CHANGED to the OLD address straight from the payload', async () => {
    const email = makeEmail();
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        {
          ...bookingRow,
          type: EmailType.EMAIL_CHANGED,
          payload: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
        },
      ]),
    });
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendEmailChangedNotice).toHaveBeenCalledWith({
      to: 'old@example.com',
      vars: {
        newEmail: 'new@example.com',
        supportUrl: 'https://web.example.com/contact',
        manageUrl: 'https://web.example.com/account',
      },
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
    const svc = makeService(prisma, email);

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
    const svc = makeService(prisma, email);

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
    const svc = makeService(prisma, email);

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    type UpdCall = { data: { status: OutboxStatus } };
    const calls = updateMany.mock.calls as unknown as UpdCall[][];
    expect(calls[0][0].data.status).toBe(OutboxStatus.SENT);
  });

  it('is a no-op when nothing is PENDING', async () => {
    const email = makeEmail();
    const svc = makeService(
      makePrisma({ findMany: jest.fn().mockResolvedValue([]) }),
      email,
    );

    const result = await svc.drainOutbox();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
  });
});
