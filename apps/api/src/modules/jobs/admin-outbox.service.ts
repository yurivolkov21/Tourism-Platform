import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailType, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAdminOutboxQueryDto } from './dto/admin-outbox.dto';

/** One outbox row — metadata only (`payload` carries entity refs; never exposed). */
export interface AdminOutboxRow {
  id: string;
  type: EmailType;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PaginatedAdminOutbox {
  items: AdminOutboxRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Admin visibility over the transactional-email outbox (ADR-0007). Retry does
 * NOT send inline — it resets a FAILED row to PENDING so the next drain tick
 * (1m cron) picks it up; `attempts` is preserved, so the drain's
 * `attempts >= MAX → FAILED` rule grants exactly one extra attempt per click.
 */
@Injectable()
export class AdminOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminOutboxQueryDto): Promise<PaginatedAdminOutbox> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.OutboxWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.outbox.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          processedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.outbox.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        attempts: r.attempts,
        lastError: r.lastError,
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async retry(id: string): Promise<AdminOutboxRow> {
    const row = await this.prisma.outbox.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        code: 'OUTBOX_NOT_FOUND',
        message: `Outbox row "${id}" not found`,
      });
    }
    if (row.status !== OutboxStatus.FAILED) {
      throw new ConflictException({
        code: 'OUTBOX_NOT_FAILED',
        message: 'Only FAILED emails can be retried',
      });
    }
    const updated = await this.prisma.outbox.update({
      where: { id },
      data: { status: OutboxStatus.PENDING },
    });
    return {
      id: updated.id,
      type: updated.type,
      status: updated.status,
      attempts: updated.attempts,
      lastError: updated.lastError,
      createdAt: updated.createdAt.toISOString(),
      processedAt: updated.processedAt
        ? updated.processedAt.toISOString()
        : null,
    };
  }
  /**
   * Deletes a queued/poisoned row (cancel an email before the drain sends it).
   * SENT rows are the delivery audit trail — protected (409). Conditional
   * deleteMany (not check-then-delete) so a concurrent drain tick can't defeat
   * the SENT guard; a row the drain has already picked up in the current tick
   * may still send once — a true cancel-in-flight would need a claim state.
   */
  async deleteById(id: string): Promise<void> {
    const deleted = await this.prisma.outbox.deleteMany({
      where: {
        id,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      },
    });
    if (deleted.count === 0) {
      const row = await this.prisma.outbox.findUnique({ where: { id } });
      if (!row) {
        throw new NotFoundException({
          code: 'OUTBOX_NOT_FOUND',
          message: `Outbox row "${id}" not found`,
        });
      }
      throw new ConflictException({
        code: 'OUTBOX_ROW_SENT',
        message: 'Sent emails are delivery history and cannot be deleted.',
      });
    }
  }
}
