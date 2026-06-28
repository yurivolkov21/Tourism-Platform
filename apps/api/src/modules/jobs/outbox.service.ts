import { Injectable, Logger } from '@nestjs/common';
import { EmailType, OutboxStatus, type Outbox } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** How many PENDING rows one drain pass dispatches (oldest-first). */
const DRAIN_BATCH_SIZE = 50;
/** After this many failed attempts a row is parked FAILED for an operator. */
const MAX_ATTEMPTS = 5;
/** `last_error` column cap (VarChar(1000)). */
const LAST_ERROR_MAX = 1000;

export interface DrainResult {
  sent: number;
  failed: number;
}

/**
 * Drains the transactional-email outbox (ADR-0007). The state change that
 * announces an email writes a PENDING `outbox` row atomically (the PAID
 * confirmation inside the seat-claim CTE; review/enquiry in a short tx); this
 * service is the consumer the pg-boss worker invokes on a schedule.
 *
 * Each row carries a thin reference payload (`{ bookingId }` / `{ reviewId }` /
 * `{ enquiryId }`); the entity is re-read here at send time so the email always
 * reflects current data and the CTE stays a single cheap statement. A send that
 * throws bumps `attempts` and re-queues until `MAX_ATTEMPTS`, then parks FAILED.
 * Idempotency is upstream (`dedupeKey` UNIQUE → one row per event).
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async drainOutbox(): Promise<DrainResult> {
    const rows = await this.prisma.outbox.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: DRAIN_BATCH_SIZE,
    });

    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.dispatch(row);
        await this.prisma.outbox.update({
          where: { id: row.id },
          data: { status: OutboxStatus.SENT, processedAt: new Date() },
        });
        sent += 1;
      } catch (err) {
        const attempts = row.attempts + 1;
        const status =
          attempts >= MAX_ATTEMPTS ? OutboxStatus.FAILED : OutboxStatus.PENDING;
        const lastError = (
          err instanceof Error ? err.message : 'unknown error'
        ).slice(0, LAST_ERROR_MAX);
        await this.prisma.outbox.update({
          where: { id: row.id },
          data: { attempts, status, lastError },
        });
        failed += 1;
        this.logger.warn(
          `Outbox ${row.id} (${row.type}) send failed (attempt ${attempts}/${MAX_ATTEMPTS}, now ${status}): ${lastError}`,
        );
      }
    }

    if (sent || failed) {
      this.logger.log(`Outbox drain: ${sent} sent, ${failed} failed`);
    }
    return { sent, failed };
  }

  /** Route a row to the right email, hydrating the referenced entity. */
  private dispatch(row: Outbox): Promise<void> {
    switch (row.type) {
      case EmailType.BOOKING_CONFIRMATION:
        return this.sendBookingEmail(row, 'confirmation');
      case EmailType.BOOKING_REFUNDED:
        return this.sendBookingEmail(row, 'refund');
      case EmailType.REVIEW_APPROVED:
        return this.sendReviewApproved(row);
      case EmailType.ENQUIRY_RECEIVED:
        return this.sendEnquiryReceived(row);
      default:
        // Exhaustive on the enum; an unknown type is consumed (warn, no-op).
        this.logger.warn(`Outbox ${row.id}: unknown type ${String(row.type)}`);
        return Promise.resolve();
    }
  }

  private async sendBookingEmail(
    row: Outbox,
    kind: 'confirmation' | 'refund',
  ): Promise<void> {
    const { bookingId } = row.payload as { bookingId: string };
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        code: true,
        contactName: true,
        contactEmail: true,
        totalAmount: true,
        currency: true,
        numAdults: true,
        numChildren: true,
        tour: { select: { title: true } },
        departure: { select: { startDate: true, endDate: true } },
      },
    });
    if (!booking) {
      // The booking is gone — retrying can't help; consume the row.
      this.logger.warn(`Outbox ${row.id}: booking ${bookingId} not found`);
      return;
    }

    const vars = {
      code: booking.code,
      tourTitle: booking.tour.title,
      contactName: booking.contactName,
      totalAmount: booking.totalAmount.toFixed(2),
      currency: booking.currency,
      numAdults: booking.numAdults,
      numChildren: booking.numChildren,
      startDate: booking.departure.startDate,
      endDate: booking.departure.endDate,
    };
    if (kind === 'confirmation') {
      await this.email.sendBookingConfirmation({ to: booking.contactEmail, vars });
    } else {
      await this.email.sendBookingRefunded({ to: booking.contactEmail, vars });
    }
  }

  private async sendReviewApproved(row: Outbox): Promise<void> {
    const { reviewId } = row.payload as { reviewId: string };
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        rating: true,
        user: { select: { email: true, fullName: true } },
        tour: { select: { title: true } },
      },
    });
    if (!review) {
      this.logger.warn(`Outbox ${row.id}: review ${reviewId} not found`);
      return;
    }
    if (!review.user || !review.tour) {
      // CURATED testimonials have no customer/tour to notify — nothing to send.
      this.logger.warn(
        `Outbox ${row.id}: review ${reviewId} has no user/tour (curated) — skipping email`,
      );
      return;
    }
    await this.email.sendReviewApproved({
      to: review.user.email,
      vars: {
        reviewerName: review.user.fullName ?? 'there',
        tourTitle: review.tour.title,
        rating: review.rating,
      },
    });
  }

  private async sendEnquiryReceived(row: Outbox): Promise<void> {
    const { enquiryId } = row.payload as { enquiryId: string };
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id: enquiryId },
      select: {
        name: true,
        email: true,
        message: true,
        tour: { select: { title: true } },
      },
    });
    if (!enquiry) {
      this.logger.warn(`Outbox ${row.id}: enquiry ${enquiryId} not found`);
      return;
    }
    await this.email.sendEnquiryReceived({
      to: enquiry.email,
      vars: {
        name: enquiry.name,
        message: enquiry.message,
        tourTitle: enquiry.tour?.title ?? null,
      },
    });
  }
}
