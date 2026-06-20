import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MediaOwnerType, Tour, Wishlist } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaItemDto } from '../media/dto/media.dto';
import { MediaService } from '../media/media.service';

/** A wishlist row joined with its (partial) tour preview + delivery media. */
export type WishlistWithTour = Wishlist & {
  tour: Partial<Tour> & { media: MediaItemDto[] };
};

/**
 * Customer wishlist surface.
 *
 * Schema is a composite-PK join `(userId, tourId)` — no surrogate id. Add is an
 * upsert (idempotent: re-adding the same tour is a no-op, not 409); remove is an
 * idempotent `deleteMany` (removing an absent row is 204, not 404).
 *
 * `findMineWithTour` joins the tour preview so the FE renders the wishlist page
 * without a per-item fetch. EN-only: we select `title`/`summary` (single column)
 * and the M:N destinations are not part of the card, so no `destinationId`.
 */
@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** Upserts (userId, tourId). 404 if the tour is missing or unpublished. */
  async add(customerUserId: string, tourId: string): Promise<Wishlist> {
    const tour = await this.prisma.tour.findFirst({
      where: { id: tourId, isPublished: true },
      select: { id: true },
    });
    if (!tour) {
      throw new NotFoundException({
        code: 'TOUR_NOT_FOUND',
        message: `Tour "${tourId}" not found`,
      });
    }
    const row = await this.prisma.wishlist.upsert({
      where: { userId_tourId: { userId: customerUserId, tourId } },
      update: {},
      create: { userId: customerUserId, tourId },
    });
    this.logger.log(`User ${customerUserId} wished tour ${tourId}`);
    return row;
  }

  /** Idempotent delete — `deleteMany` returns `{ count }` without throwing. */
  async remove(customerUserId: string, tourId: string): Promise<void> {
    await this.prisma.wishlist.deleteMany({
      where: { userId: customerUserId, tourId },
    });
  }

  /**
   * Caller's wishlist, newest-first, capped at 100 (paginate later if a real
   * user exceeds it), with the joined tour preview + Cloudinary media (one
   * batched `attachToOwners` query — no N+1).
   */
  async findMineWithTour(customerUserId: string): Promise<WishlistWithTour[]> {
    const rows = await this.prisma.wishlist.findMany({
      where: { userId: customerUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        tour: {
          select: {
            id: true,
            slug: true,
            title: true,
            summary: true,
            basePrice: true,
            currency: true,
            durationDays: true,
            isPublished: true,
          },
        },
      },
    });

    const tours = rows.map((r) => r.tour);
    const toursWithMedia = await this.media.attachToOwners(
      MediaOwnerType.TOUR,
      tours,
    );
    const mediaById = new Map(toursWithMedia.map((t) => [t.id, t.media]));

    return rows.map((r) => ({
      ...r,
      tour: { ...r.tour, media: mediaById.get(r.tour.id) ?? [] },
    }));
  }
}
