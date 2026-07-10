import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmailType, OutboxStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminOutboxService } from './admin-outbox.service';

interface Mocks {
  outbox?: Record<string, unknown>;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    outbox: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      ...m.outbox,
    },
  } as unknown as PrismaService;
}

function svcWith(prisma: PrismaService): AdminOutboxService {
  return new AdminOutboxService(prisma);
}

const OUTBOX_ROW = {
  id: 'outbox-1',
  type: EmailType.BOOKING_CONFIRMATION,
  status: OutboxStatus.FAILED,
  attempts: 3,
  lastError: 'SMTP timeout',
  createdAt: new Date('2026-07-02T12:00:00Z'),
  processedAt: null,
};

describe('AdminOutboxService', () => {
  describe('list', () => {
    it('maps rows with ISO dates, no payload key, newest first, status filter AND-composed', async () => {
      const findMany = jest.fn().mockResolvedValue([OUTBOX_ROW]);
      const count = jest.fn().mockResolvedValue(1);
      const prisma = makePrisma({ outbox: { findMany, count } });

      const res = await svcWith(prisma).list({
        status: OutboxStatus.FAILED,
      } as never);

      expect(res.meta.total).toBe(1);
      expect(res.items[0]).toEqual({
        id: 'outbox-1',
        type: EmailType.BOOKING_CONFIRMATION,
        status: OutboxStatus.FAILED,
        attempts: 3,
        lastError: 'SMTP timeout',
        createdAt: '2026-07-02T12:00:00.000Z',
        processedAt: null,
      });
      expect(res.items[0]).not.toHaveProperty('payload');
      expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
      expect(findMany.mock.calls[0][0].where.status).toBe(OutboxStatus.FAILED);
    });
  });

  describe('retry', () => {
    it('resets a FAILED row to PENDING, attempts untouched', async () => {
      const findUnique = jest.fn().mockResolvedValue(OUTBOX_ROW);
      const update = jest
        .fn()
        .mockResolvedValue({ ...OUTBOX_ROW, status: OutboxStatus.PENDING });
      const prisma = makePrisma({ outbox: { findUnique, update } });

      const res = await svcWith(prisma).retry('outbox-1');

      expect(update.mock.calls[0][0]).toEqual({
        where: { id: 'outbox-1' },
        data: { status: OutboxStatus.PENDING },
      });
      expect(res.status).toBe(OutboxStatus.PENDING);
      expect(res.attempts).toBe(3);
    });

    it('rejects retrying a non-FAILED row with 409', async () => {
      const prisma = makePrisma({
        outbox: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...OUTBOX_ROW, status: OutboxStatus.PENDING }),
        },
      });

      await expect(svcWith(prisma).retry('outbox-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('404s on an unknown id', async () => {
      const prisma = makePrisma();

      await expect(svcWith(prisma).retry('outbox-nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
