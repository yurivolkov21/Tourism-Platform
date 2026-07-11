import { Injectable } from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListPaymentEventsQueryDto } from './dto/admin-payment-event.dto';

/** One webhook row for the admin viewer — payload included (debugging is the point). */
export interface AdminPaymentEventItem {
  id: string;
  provider: PaymentProvider;
  eventId: string;
  type: string;
  payload: unknown;
  processedAt: Date | null;
  receivedAt: Date;
  /** Derived from the provider payload path (no FK exists) — null when absent. */
  bookingId: string | null;
  bookingCode: string | null;
}

export interface PaginatedPaymentEvents {
  items: AdminPaymentEventItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Reads the `payment_events` webhook idempotency log for the admin viewer.
 * PaymentEvent has NO FK to Booking — the booking is derived per row from the
 * SAME payload paths the webhook handlers route by (Stripe
 * `data.object.metadata.bookingId` · PayPal `resource.custom_id`), then codes
 * are joined with one IN query.
 */
@Injectable()
export class AdminPaymentEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForAdmin(
    query: ListPaymentEventsQueryDto,
  ): Promise<PaginatedPaymentEvents> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const type = query.type?.trim();
    const search = query.search?.trim();
    const where: Prisma.PaymentEventWhereInput = {
      ...(query.provider ? { provider: query.provider } : {}),
      ...(type ? { type: { contains: type, mode: 'insensitive' } } : {}),
      ...(search ? { eventId: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.paymentEvent.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentEvent.count({ where }),
    ]);

    const derived = rows.map((row) => ({
      row,
      bookingId: extractBookingId(row.provider, row.payload),
    }));
    const ids = [
      ...new Set(derived.map((d) => d.bookingId).filter(Boolean)),
    ] as string[];
    const codeById = new Map<string, string>();
    if (ids.length > 0) {
      const bookings = await this.prisma.booking.findMany({
        where: { id: { in: ids } },
        select: { id: true, code: true },
      });
      for (const b of bookings) codeById.set(b.id, b.code);
    }

    return {
      items: derived.map(({ row, bookingId }) => ({
        id: row.id,
        provider: row.provider,
        eventId: row.eventId,
        type: row.type,
        payload: row.payload,
        processedAt: row.processedAt,
        receivedAt: row.receivedAt,
        bookingId,
        bookingCode: bookingId ? (codeById.get(bookingId) ?? null) : null,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}

/** Best-effort booking id from the provider-specific payload path. */
function extractBookingId(
  provider: PaymentProvider,
  payload: unknown,
): string | null {
  const value =
    provider === PaymentProvider.STRIPE
      ? pick(payload, 'data', 'object', 'metadata', 'bookingId')
      : pick(payload, 'resource', 'custom_id');
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Null-safe deep read of an unknown JSON payload. */
function pick(obj: unknown, ...path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}
