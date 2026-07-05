import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Subscriber } from '@prisma/client';
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

  async subscribe(dto: SubscribeDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    await this.prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: { email, source: dto.source ?? null },
    });
    this.logger.log(`Newsletter subscribe: ${email}`);
  }

  /** Admin list — paginated, newest-first, optional email search (insensitive). */
  async findAllForAdmin(query: ListSubscribersQueryDto): Promise<PaginatedSubscribers> {
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
