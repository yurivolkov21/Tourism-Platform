import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, Review } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListAdminReviewsQueryDto } from './dto/list-admin-reviews-query.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

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
  tourId: string;
  tourSlug: string;
  userId: string;
  reviewerName: string | null;
  bookingId: string;
  rating: number;
  title: string | null;
  body: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedAdminReviews {
  items: AdminReviewItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
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
      select: { id: true, code: true, userId: true, tourId: true, status: true },
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
          user: { select: { fullName: true } },
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
      reviewer: { fullName: row.user?.fullName ?? 'Anonymous' },
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
   * Admin moderation queue — paginated, optional `isApproved` filter, newest
   * first. Admins are trusted with PII, so this keeps `userId`/`bookingId` and
   * joins the reviewer name + tour slug for context.
   */
  async findAllForAdmin(
    query: ListAdminReviewsQueryDto,
  ): Promise<PaginatedAdminReviews> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReviewWhereInput =
      query.isApproved !== undefined ? { isApproved: query.isApproved } : {};

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tour: { select: { slug: true } },
          user: { select: { fullName: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const items: AdminReviewItem[] = rows.map((row) => ({
      id: row.id,
      tourId: row.tourId,
      tourSlug: row.tour.slug,
      userId: row.userId,
      reviewerName: row.user.fullName,
      bookingId: row.bookingId,
      rating: row.rating,
      title: row.title,
      body: row.body,
      isApproved: row.isApproved,
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
   * Admin moderation toggle. Idempotent — flipping to the current value is a
   * no-op write. The boolean shape (vs separate approve/reject endpoints) lets
   * the admin re-draft a review later if it gets flagged after going public.
   */
  async moderateById(reviewId: string, isApproved: boolean): Promise<Review> {
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

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved },
    });
    this.logger.log(
      `Admin moderated review ${reviewId} → isApproved=${isApproved}`,
    );
    return updated;
  }
}
