import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailType, Prisma, Subscriber } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListSubscribersQueryDto } from './dto/list-subscribers-query.dto';
import { SubscribeDto } from './dto/subscribe.dto';

export interface PaginatedSubscribers {
  items: Subscriber[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Newsletter lead capture (blog v2 wave 5) — DB-backed only, no ESP.
 *
 * Anti-abuse (rate-limit + honeypot) is enforced at the controller; this service
 * stays a pure writer. Dedupe is **silent by design**: `subscribe` upserts by the
 * normalized email with a no-op update, so a repeat signup is indistinguishable
 * from a new one at the API surface (no email-exists oracle).
 */
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hard delete (admin remove/unsubscribe). The model has no soft-unsubscribe
   * field and the public subscribe silently upserts — re-opting-in later just
   * recreates the row. Atomic deleteMany: a concurrent delete loses with a
   * clean 404 instead of a P2025 500.
   */
  async deleteById(id: string): Promise<void> {
    const deleted = await this.prisma.subscriber.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new NotFoundException({
        code: 'SUBSCRIBER_NOT_FOUND',
        message: `Subscriber "${id}" not found`,
      });
    }
    this.logger.log(`Subscriber ${id} removed by admin`);
  }

  async subscribe(dto: SubscribeDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    // Upsert + welcome-email enqueue commit together (ADR-0007 short tx).
    // The email-scoped dedupeKey makes the welcome first-subscribe-only —
    // repeat signups hit ON CONFLICT DO NOTHING, so the endpoint's
    // silent-dedupe (no email-exists oracle) is preserved. Deliberate
    // consequence (reviewed 2026-07-13): the outbox row outlives an admin
    // removal, so a removed-then-resubscribed address is NOT re-welcomed —
    // one lifetime welcome per address, never spammy.
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriber.upsert({
        where: { email },
        update: {},
        create: { email, source: dto.source ?? null },
      });
      await tx.outbox.createMany({
        data: [
          {
            type: EmailType.NEWSLETTER_WELCOME,
            payload: { email } as Prisma.InputJsonValue,
            dedupeKey: `newsletter-welcome:${email}`,
          },
        ],
        skipDuplicates: true,
      });
    });
    this.logger.log(`Newsletter subscribe: ${email}`);
  }

  /** Admin list — paginated, newest-first, optional email search (insensitive). */
  async findAllForAdmin(
    query: ListSubscribersQueryDto,
  ): Promise<PaginatedSubscribers> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.SubscriberWhereInput = search
      ? { email: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.subscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subscriber.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
