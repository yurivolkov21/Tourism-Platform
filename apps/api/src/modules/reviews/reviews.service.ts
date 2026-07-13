import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  EmailType,
  Prisma,
  Review,
  ReviewSource,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCuratedReviewDto } from './dto/create-curated-review.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews-query.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { UpdateCuratedReviewDto } from './dto/update-curated-review.dto';

/**
 * Public review item — strips `bookingId`/`userId` so the customer's purchase
 * history isn't probeable from the marketing page. `reviewer` exposes only the
 * public-safe display name.
 */
export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
  reviewer: { fullName: string };
}

/** `{ page, pageSize, total, totalPages }` + the tour's mean approved rating. */
export interface ReviewPageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  averageRating: number | null;
}

export interface PaginatedPublicReviews {
  items: PublicReview[];
  meta: ReviewPageMeta;
}

/** Admin moderation-queue item — full row + reviewer name + tour slug. */
export interface AdminReviewItem {
  id: string;
  tourId: string | null;
  tourSlug: string | null;
  tourTitle: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  authorName: string;
  authorLocation: string | null;
  bookingId: string | null;
  bookingCode: string | null;
  source: ReviewSource;
  isFeatured: boolean;
  rating: number;
  title: string | null;
  tripLabel: string | null;
  body: string;
  isApproved: boolean;
  /** Moderation audit (API-W3): last decision-maker + timestamp. */
  moderatedBy: { fullName: string | null; email: string } | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One row of the caller's own reviews (API-W3 — `GET /reviews/mine`). */
export interface MyReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  isApproved: boolean;
  createdAt: Date;
  tour: { slug: string; title: string } | null;
}

export interface PaginatedAdminReviews {
  items: AdminReviewItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorLocation: string | null;
  tripLabel: string | null;
  createdAt: Date;
}

/**
 * Customer review surface.
 *
 * Eligibility: booking must be PAID, caller must own it, one review per booking
 * (`Review.bookingId UNIQUE` → P2002 → 409). Reviews land `isApproved=false` and
 * only surface on `GET /tours/:slug/reviews` after an admin approves them.
 *
 * `tourId` is denormalised onto the review (derivable from `bookingId`) because
 * the hot public read filters by `tourId` + `isApproved`; the value is immutable
 * for the life of the booking, so the denormalisation avoids a join per hit.
 */
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createForCustomer(
    customerUserId: string,
    body: CreateReviewDto,
  ): Promise<Review> {
    const booking = await this.prisma.booking.findUnique({
      where: { code: body.bookingCode },
      select: {
        id: true,
        code: true,
        userId: true,
        tourId: true,
        status: true,
        user: { select: { fullName: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${body.bookingCode}" not found`,
      });
    }
    if (booking.userId !== customerUserId) {
      // 403 (not 404) — the user can already see the code in their own list,
      // so denying ownership is the honest signal.
      throw new ForbiddenException({
        code: 'BOOKING_FORBIDDEN',
        message: 'You can only review your own bookings',
      });
    }
    if (booking.status !== BookingStatus.PAID) {
      throw new BadRequestException({
        code: 'REVIEW_NOT_ELIGIBLE',
        message: `Only PAID bookings can be reviewed (current: ${booking.status})`,
      });
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          tourId: booking.tourId,
          userId: customerUserId,
          bookingId: booking.id,
          rating: body.rating,
          title: body.title,
          body: body.body,
          // Snapshot the display name so it survives a later user rename/delete.
          authorName: booking.user?.fullName ?? 'Anonymous',
          source: ReviewSource.VERIFIED,
        },
      });
      this.logger.log(
        `Customer ${customerUserId} created review ${review.id} for booking ${booking.code} (pending approval)`,
      );
      return review;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: `Booking "${body.bookingCode}" already has a review`,
        });
      }
      throw err;
    }
  }

  /**
   * Public, approved-only reviews for one tour. Strips PII and projects only the
   * display name. Looks the slug up (not just `tourId`) so an unknown/unpublished
   * slug returns a clean 404 instead of "200 with empty array" (which would hide
   * FE routing bugs). `Promise.all` (NOT `$transaction`) — pooler-safe.
   */
  async findApprovedForTour(
    slug: string,
    query: ListReviewsQueryDto,
  ): Promise<PaginatedPublicReviews> {
    const tour = await this.prisma.tour.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!tour) {
      throw new NotFoundException({
        code: 'TOUR_NOT_FOUND',
        message: `Tour "${slug}" not found`,
      });
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = { tourId: tour.id, isApproved: true } as const;

    const [rows, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          authorName: true,
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    const items: PublicReview[] = rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
      reviewer: { fullName: row.authorName },
    }));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        averageRating: aggregate._avg.rating ?? null,
      },
    };
  }

  /**
   * Featured testimonials for the homepage — approved + featured, CURATED first (admin's marketing
   * picks), then newest. `tripLabel` falls back to the linked tour's title.
   */
  async findFeatured(limit = 12): Promise<FeaturedReview[]> {
    const rows = await this.prisma.review.findMany({
      where: { isApproved: true, isFeatured: true },
      // 'CURATED' < 'VERIFIED' alphabetically, so source asc puts curated picks first.
      orderBy: [{ source: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        authorName: true,
        authorLocation: true,
        tripLabel: true,
        createdAt: true,
        tour: { select: { title: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      body: row.body,
      authorName: row.authorName,
      authorLocation: row.authorLocation,
      tripLabel: row.tripLabel ?? row.tour?.title ?? null,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Admin moderation queue — paginated; filters on moderation state, source,
   * rating, and free text (author/title/body), newest first. Admins are
   * trusted with PII, so this keeps `userId`/`bookingId` and joins the
   * customer (name/email), booking code, and tour slug for real links.
   */
  async findAllForAdmin(
    query: ListAdminReviewsQueryDto,
  ): Promise<PaginatedAdminReviews> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.ReviewWhereInput = {
      ...(query.isApproved !== undefined
        ? { isApproved: query.isApproved }
        : {}),
      ...(query.source !== undefined ? { source: query.source } : {}),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
      ...(search
        ? {
            OR: [
              { authorName: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { body: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tour: { select: { slug: true, title: true } },
          user: { select: { fullName: true, email: true } },
          booking: { select: { code: true } },
          moderatedBy: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const items: AdminReviewItem[] = rows.map((row) => ({
      id: row.id,
      tourId: row.tourId,
      tourSlug: row.tour?.slug ?? null,
      tourTitle: row.tour?.title ?? null,
      userId: row.userId,
      userName: row.user?.fullName ?? null,
      userEmail: row.user?.email ?? null,
      authorName: row.authorName,
      authorLocation: row.authorLocation,
      bookingId: row.bookingId,
      bookingCode: row.booking?.code ?? null,
      source: row.source,
      isFeatured: row.isFeatured,
      rating: row.rating,
      title: row.title,
      tripLabel: row.tripLabel,
      body: row.body,
      isApproved: row.isApproved,
      moderatedBy: row.moderatedBy
        ? { fullName: row.moderatedBy.fullName, email: row.moderatedBy.email }
        : null,
      moderatedAt: row.moderatedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

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

  /**
   * The caller's own reviews (API-W3) — newest first, capped at 50 (mirrors
   * the bookings own-list posture; pagination when real volume demands it).
   * Includes unapproved rows: the author may always see their own submission.
   */
  async findMine(userId: string): Promise<MyReviewItem[]> {
    const rows = await this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isApproved: true,
        createdAt: true,
        tour: { select: { slug: true, title: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isApproved: r.isApproved,
      createdAt: r.createdAt,
      tour: r.tour ? { slug: r.tour.slug, title: r.tour.title } : null,
    }));
  }

  /**
   * Admin moderation toggle. Idempotent — flipping to the current value is a
   * no-op write. The boolean shape (vs separate approve/reject endpoints) lets
   * the admin re-draft a review later if it gets flagged after going public.
   * Every write records the audit pair `moderatedById`/`moderatedAt` (API-W3)
   * — re-moderation overwrites: latest decision wins.
   */
  async moderateById(
    reviewId: string,
    isApproved: boolean,
    adminUserId: string | null,
  ): Promise<Review> {
    if (!adminUserId) {
      throw new BadRequestException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before moderating reviews',
      });
    }
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, isApproved: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: `Review "${reviewId}" not found`,
      });
    }

    // Notify the reviewer only on the false→true transition. The update + outbox
    // enqueue commit together in a short tx (ADR-0007); `dedupeKey` UNIQUE +
    // `skipDuplicates` keep re-approval after un-approval from double-emailing.
    const justApproved = isApproved && !existing.isApproved;
    const updated = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id: reviewId },
        data: {
          isApproved,
          moderatedById: adminUserId,
          moderatedAt: new Date(),
        },
      });
      if (justApproved) {
        await tx.outbox.createMany({
          data: [
            {
              type: EmailType.REVIEW_APPROVED,
              payload: { reviewId },
              dedupeKey: `review-approved:${reviewId}`,
            },
          ],
          skipDuplicates: true,
        });
      }
      return review;
    });
    this.logger.log(
      `Admin moderated review ${reviewId} → isApproved=${isApproved}`,
    );
    return updated;
  }

  /** Pin/unpin a review on the homepage carousel (admin). */
  async setFeatured(reviewId: string, isFeatured: boolean): Promise<Review> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: `Review "${reviewId}" not found`,
      });
    }
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isFeatured },
    });
  }

  /**
   * Hard-delete a curated testimonial (admin). VERIFIED reviews are protected — deleting one
   * would erase a real customer's audit trail; unapprove it to hide it instead (409).
   */
  async deleteCuratedById(reviewId: string): Promise<Review> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, source: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: `Review "${reviewId}" not found`,
      });
    }
    if (existing.source !== ReviewSource.CURATED) {
      throw new ConflictException({
        code: 'REVIEW_NOT_CURATED',
        message:
          'Only curated testimonials can be deleted — unapprove a verified review to hide it.',
      });
    }
    const deleted = await this.prisma.review.delete({
      where: { id: reviewId },
    });
    this.logger.log(`Deleted curated review ${reviewId}`);
    return deleted;
  }

  /**
   * Partial edit of a curated testimonial (admin). VERIFIED reviews are a real
   * customer's words — immutable here (409), same guard as delete. Only the
   * provided fields are written.
   */
  async updateCuratedById(
    reviewId: string,
    dto: UpdateCuratedReviewDto,
  ): Promise<Review> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, source: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: `Review "${reviewId}" not found`,
      });
    }
    if (existing.source !== ReviewSource.CURATED) {
      throw new ConflictException({
        code: 'REVIEW_NOT_CURATED',
        message:
          'Only curated testimonials can be edited — verified reviews are customer words.',
      });
    }
    const data: Prisma.ReviewUpdateInput = {
      ...(dto.authorName !== undefined ? { authorName: dto.authorName } : {}),
      ...(dto.authorLocation !== undefined
        ? { authorLocation: dto.authorLocation }
        : {}),
      ...(dto.tripLabel !== undefined ? { tripLabel: dto.tripLabel } : {}),
      ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
    };
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data,
    });
    this.logger.log(`Updated curated review ${reviewId}`);
    return updated;
  }

  /** Site-wide approved-review count + mean rating (1 dp), for the marketing trust band. */
  async summarize(): Promise<{ count: number; averageRating: number | null }> {
    const aggregate = await this.prisma.review.aggregate({
      where: { isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const avg = aggregate._avg.rating;
    return {
      count: aggregate._count._all,
      averageRating: avg === null ? null : Math.round(avg * 10) / 10,
    };
  }

  /** Create an admin-authored testimonial (CURATED) — approved + featured immediately. */
  async createCurated(dto: CreateCuratedReviewDto): Promise<Review> {
    return this.prisma.review.create({
      data: {
        authorName: dto.authorName,
        authorLocation: dto.authorLocation ?? null,
        tripLabel: dto.tripLabel ?? null,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body,
        source: ReviewSource.CURATED,
        isApproved: true,
        isFeatured: true,
      },
    });
  }
}
