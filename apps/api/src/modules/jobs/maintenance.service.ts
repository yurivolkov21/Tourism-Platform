import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../media/cloudinary.service';

/** A PENDING booking older than this (minutes) is treated as abandoned. */
const DEFAULT_TTL_MINUTES = 30;
/** How many garbage rows one reconcile pass destroys. */
const RECONCILE_BATCH_SIZE = 100;
/** `last_error` column cap (VarChar(1000)). */
const LAST_ERROR_MAX = 1000;

export interface ReconcileResult {
  destroyed: number;
  failed: number;
}

/**
 * Scheduled maintenance (ADR-0007, P1.x-b), invoked by pg-boss crons:
 *
 * - {@link cancelAbandonedBookings}: a backstop for checkout that never
 *   completed (a missed Stripe `expired` event, an abandoned PayPal return).
 *   PENDING bookings hold **no** seat inventory (seats are claimed only at PAID),
 *   so this just flips stale PENDING → CANCELLED — atomic, idempotent.
 * - {@link reconcileMedia}: destroys Cloudinary assets whose `MediaAsset` row was
 *   dropped (recorded in `media_garbage`). Destroy is idempotent, so a row is
 *   removed on success and retried (attempts bumped) on failure.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async cancelAbandonedBookings(
    ttlMinutes: number = DEFAULT_TTL_MINUTES,
  ): Promise<number> {
    const cutoff = new Date(Date.now() - ttlMinutes * 60_000);
    const { count } = await this.prisma.booking.updateMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: cutoff } },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (count) {
      this.logger.log(
        `Cancelled ${count} abandoned PENDING booking(s) older than ${ttlMinutes}m`,
      );
    }
    return count;
  }

  async reconcileMedia(): Promise<ReconcileResult> {
    const rows = await this.prisma.mediaGarbage.findMany({
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_BATCH_SIZE,
    });

    let destroyed = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.cloudinary.destroy(row.publicId, row.resourceType);
        await this.prisma.mediaGarbage.delete({ where: { id: row.id } });
        destroyed += 1;
      } catch (err) {
        const lastError = (
          err instanceof Error ? err.message : 'unknown error'
        ).slice(0, LAST_ERROR_MAX);
        await this.prisma.mediaGarbage.update({
          where: { id: row.id },
          data: { attempts: row.attempts + 1, lastError },
        });
        failed += 1;
        this.logger.warn(
          `Cloudinary destroy failed for ${row.publicId} (attempt ${row.attempts + 1}): ${lastError}`,
        );
      }
    }

    if (destroyed || failed) {
      this.logger.log(`Media reconcile: ${destroyed} destroyed, ${failed} failed`);
    }
    return { destroyed, failed };
  }
}
