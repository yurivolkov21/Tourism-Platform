import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  DepartureStatus,
  MediaOwnerType,
  Prisma,
  Tour,
} from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaItemDto, MediaInputDto } from '../media/dto/media.dto';
import { MediaService } from '../media/media.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { ListToursQueryDto } from './dto/list-tours-query.dto';
import { TourFaqInput } from './dto/nested/tour-faq.input';
import { TourItineraryDayInput } from './dto/nested/tour-itinerary-day.input';
import { TourPolicyInput } from './dto/nested/tour-policy.input';
import { UpdateTourDto } from './dto/update-tour.dto';
import {
  nextDepartureInfo,
  type NextDepartureInfo,
} from './next-departure.util';

/** Lean relations for list rows — category + destination links (with primary flag). */
const LIST_INCLUDE: Prisma.TourInclude = {
  category: { select: { slug: true, name: true } },
  destinations: {
    select: {
      isPrimary: true,
      destination: { select: { slug: true, name: true } },
    },
  },
};

/** Enriched relations for detail — list relations + ordered sub-entities. */
const DETAIL_INCLUDE: Prisma.TourInclude = {
  ...LIST_INCLUDE,
  itinerary: { orderBy: { dayNumber: 'asc' } },
  faqs: { orderBy: { order: 'asc' } },
  policies: { orderBy: { order: 'asc' } },
};

/** A tour row enriched with its media set (delivery URLs built at read time). */
export type TourWithMedia = Tour & { media: MediaItemDto[] };

/** Read-path tour: media + computed review stats + next-departure availability (catalog cards / detail). */
export type TourWithStats = TourWithMedia & {
  averageRating: number;
  reviewsCount: number;
} & NextDepartureInfo;

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedTours {
  items: TourWithStats[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Commercial signals for one tour — admin detail only. */
export interface TourOps {
  bookingsTotal: number;
  bookingsPaid: number;
  revenue: string;
  wishlistCount: number;
  enquiriesCount: number;
}

/** `TourWithStats` + commercial ops aggregates — the admin detail read. */
export type AdminTourDetail = TourWithStats & { ops: TourOps };

/**
 * CRUD + catalog for `Tour`. Adapts the donor's `modules/tours` to our clean
 * schema: **M:N destinations** (`destinationSlugs[]` + `primaryDestinationSlug`),
 * `TourCategory` **lookup** (by `categorySlug`), nested sub-entities (itinerary /
 * FAQs / policies, replace-all), EN-only. Media + departure stats are out of
 * scope here (P1.6 / P1.4c).
 *
 * Refs are validated upfront so a bad `categorySlug` / `destinationSlugs` yields
 * a clear `400` rather than a downstream `P2003`. Slug uniqueness `P2002` → 409;
 * the `onDelete: Restrict` from bookings surfaces as `P2003` → 409.
 */
@Injectable()
export class ToursService {
  private readonly logger = new Logger(ToursService.name);

  /** DB column cap for `Tour.slug` (`@db.VarChar(120)`). */
  private static readonly SLUG_MAX = 120;

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /**
   * Replace-all the tour's media set (admin). Resolves slug→id, syncs in a
   * transaction (admin, low-concurrency → pooler-safe), and returns the new set
   * with built delivery URLs.
   */
  async setMedia(
    slug: string,
    media: MediaInputDto[],
  ): Promise<MediaItemDto[]> {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tour) throw this.notFound(slug);
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.TOUR, tour.id, media),
    );
    const withMedia = await this.media.attachToOwner(MediaOwnerType.TOUR, {
      id: tour.id,
    });
    this.logger.log(`Set ${media.length} media on tour ${slug}`);
    return withMedia.media;
  }

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(query: ListToursQueryDto): Promise<PaginatedTours> {
    return this.list(query, true);
  }

  async findPublicBySlug(slug: string): Promise<TourWithStats> {
    const tour = await this.prisma.tour.findFirst({
      where: { slug, isPublished: true },
      include: DETAIL_INCLUDE,
    });
    if (!tour) throw this.notFound(slug);
    const withMedia = await this.media.attachToOwner(MediaOwnerType.TOUR, tour);
    return (
      await this.attachNextDeparture(await this.attachRatings([withMedia]))
    )[0];
  }

  /**
   * Published tour summaries for an explicit id set (blog "related tours"). Preserves the
   * input order (= the admin's pick order); silently drops unpublished/missing ids. Reuses
   * the exact list pipeline (media → ratings → next departure) — no second summary shape.
   */
  async findSummariesByIds(ids: string[]): Promise<TourWithStats[]> {
    if (ids.length === 0) return [];
    const items = await this.prisma.tour.findMany({
      where: { id: { in: ids }, isPublished: true },
      include: LIST_INCLUDE,
    });
    const withMedia = await this.media.attachToOwners(
      MediaOwnerType.TOUR,
      items,
    );
    const enriched = await this.attachNextDeparture(
      await this.attachRatings(withMedia),
    );
    const byId = new Map(enriched.map((t) => [t.id, t]));
    return ids
      .map((id) => byId.get(id))
      .filter((t): t is (typeof enriched)[number] => Boolean(t));
  }

  // ── Admin reads + mutations ───────────────────────────────────────────────

  findAll(query: ListToursQueryDto): Promise<PaginatedTours> {
    return this.list(query, false);
  }

  async findBySlug(slug: string): Promise<TourWithStats> {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      include: DETAIL_INCLUDE,
    });
    if (!tour) throw this.notFound(slug);
    const withMedia = await this.media.attachToOwner(MediaOwnerType.TOUR, tour);
    return (
      await this.attachNextDeparture(await this.attachRatings([withMedia]))
    )[0];
  }

  /** Admin detail: the enriched tour + commercial ops aggregates. Public reads stay ops-free. */
  async findDetailForAdmin(slug: string): Promise<AdminTourDetail> {
    const tour = await this.findBySlug(slug);
    const [
      bookingsTotal,
      bookingsPaid,
      revenueAgg,
      wishlistCount,
      enquiriesCount,
    ] = await Promise.all([
      this.prisma.booking.count({ where: { tourId: tour.id } }),
      this.prisma.booking.count({
        where: { tourId: tour.id, status: BookingStatus.PAID },
      }),
      this.prisma.booking.aggregate({
        where: { tourId: tour.id, status: BookingStatus.PAID },
        _sum: { totalAmount: true },
      }),
      this.prisma.wishlist.count({ where: { tourId: tour.id } }),
      this.prisma.enquiry.count({ where: { tourId: tour.id } }),
    ]);
    return {
      ...tour,
      ops: {
        bookingsTotal,
        bookingsPaid,
        revenue: (
          revenueAgg._sum.totalAmount ?? new Prisma.Decimal(0)
        ).toString(),
        wishlistCount,
        enquiriesCount,
      },
    };
  }

  /**
   * Merges computed review stats onto tour rows: `averageRating` (1-dp, approved
   * reviews only) + `reviewsCount`. One `groupBy` for the whole batch; tours with
   * no approved reviews get `0` / `0`.
   */
  private async attachRatings<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & { averageRating: number; reviewsCount: number })[]> {
    if (rows.length === 0) return [];
    const grouped = await this.prisma.review.groupBy({
      by: ['tourId'],
      where: { tourId: { in: rows.map((r) => r.id) }, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byTour = new Map(grouped.map((g) => [g.tourId, g]));
    return rows.map((r) => {
      const g = byTour.get(r.id);
      const avg = g?._avg.rating ?? 0;
      return {
        ...r,
        averageRating: Math.round(avg * 10) / 10,
        reviewsCount: g?._count._all ?? 0,
      };
    });
  }

  /**
   * Attaches each tour's **next departure** availability (soonest OPEN, upcoming departure → date +
   * seats left) for the card "Only N seats left" / "Next: …" badge. One batched query for the whole
   * page (the rows arrive earliest-first, so the first per tour is the soonest); tours with no open
   * upcoming departure get `null`/`null`.
   */
  private async attachNextDeparture<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & NextDepartureInfo)[]> {
    if (rows.length === 0) return [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const departures = await this.prisma.tourDeparture.findMany({
      where: {
        tourId: { in: rows.map((r) => r.id) },
        status: DepartureStatus.OPEN,
        startDate: { gte: today },
      },
      orderBy: { startDate: 'asc' },
      select: {
        tourId: true,
        startDate: true,
        seatsTotal: true,
        seatsBooked: true,
      },
    });
    const soonestByTour = new Map<string, (typeof departures)[number]>();
    for (const d of departures) {
      if (!soonestByTour.has(d.tourId)) soonestByTour.set(d.tourId, d);
    }
    return rows.map((r) => ({
      ...r,
      ...nextDepartureInfo(soonestByTour.get(r.id)),
    }));
  }

  /** Create. Resolves refs (400 on bad ones), slugifies, nested-writes children. */
  async create(body: CreateTourDto): Promise<TourWithMedia> {
    const categoryId = await this.resolveCategory(body.categorySlug);
    const destinations = await this.resolveDestinationLinks(
      body.destinationSlugs,
      body.primaryDestinationSlug,
    );
    const slug = this.normalizeSlug(body.slug, body.title);

    try {
      const tour = await this.prisma.tour.create({
        data: {
          slug,
          title: body.title,
          summary: body.summary,
          category: { connect: { id: categoryId } },
          durationDays: body.durationDays,
          maxGroupSize: body.maxGroupSize ?? 20,
          basePrice: new Prisma.Decimal(body.basePrice),
          compareAtPrice:
            body.compareAtPrice !== undefined
              ? new Prisma.Decimal(body.compareAtPrice)
              : undefined,
          currency: (body.currency ?? 'USD').toUpperCase(),
          difficulty: body.difficulty,
          isPublished: body.isPublished ?? false,
          isFeatured: body.isFeatured ?? false,
          suitableFor: body.suitableFor ?? [],
          badges: body.badges ?? [],
          included: body.included ?? [],
          excluded: body.excluded ?? [],
          highlights: body.highlights ?? [],
          meetingPoint: body.meetingPoint,
          destinations: { create: destinations },
          ...(body.itinerary
            ? { itinerary: { create: mapItinerary(body.itinerary) } }
            : {}),
          ...(body.faqs ? { faqs: { create: mapFaqs(body.faqs) } } : {}),
          ...(body.policies
            ? { policies: { create: mapPolicies(body.policies) } }
            : {}),
        },
        include: DETAIL_INCLUDE,
      });
      this.logger.log(`Created tour ${tour.slug}`);
      return this.media.attachToOwner(MediaOwnerType.TOUR, tour);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) throw this.slugConflict(slug);
      throw err;
    }
  }

  /**
   * Partial update. 404 early; refs re-validated when present. Any sub-entity
   * array (or `destinationSlugs`) **replaces** that whole set via a nested
   * `deleteMany` + `create` (atomic implicit transaction — pooler-safe).
   */
  async update(slug: string, body: UpdateTourDto): Promise<TourWithMedia> {
    const existing = await this.findBySlug(slug); // 404 early

    // Unpublish guard (API-W2, A-TUR-4): a published tour with paying
    // customers on upcoming departures must not become a 404 for them.
    // Cancel the departures (auto-refund) or refund manually first.
    if (body.isPublished === false && existing.isPublished) {
      // startDate is @db.Date (midnight UTC) — compare against start-of-today
      // UTC so a departure leaving TODAY still counts as active (walk-in
      // parity, same calendar-date rule as the booking-create guard).
      const now = new Date();
      const startOfTodayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const activeBookings = await this.prisma.booking.count({
        where: {
          tourId: existing.id,
          status: {
            in: [BookingStatus.PAID, BookingStatus.PARTIALLY_REFUNDED],
          },
          departure: {
            startDate: { gte: startOfTodayUtc },
            status: { not: DepartureStatus.CANCELLED },
          },
        },
      });
      if (activeBookings > 0) {
        throw new ConflictException({
          code: 'TOUR_HAS_ACTIVE_BOOKINGS',
          message:
            `Cannot unpublish "${slug}" — ${activeBookings} paid booking(s) on upcoming departures. ` +
            'Cancel those departures (auto-refund) or refund the bookings first.',
        });
      }
    }

    const data: Prisma.TourUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.summary !== undefined) data.summary = body.summary;
    if (body.categorySlug !== undefined) {
      data.category = {
        connect: { id: await this.resolveCategory(body.categorySlug) },
      };
    }
    if (body.durationDays !== undefined) data.durationDays = body.durationDays;
    if (body.maxGroupSize !== undefined) data.maxGroupSize = body.maxGroupSize;
    if (body.basePrice !== undefined) {
      data.basePrice = new Prisma.Decimal(body.basePrice);
    }
    if (body.compareAtPrice !== undefined) {
      data.compareAtPrice = new Prisma.Decimal(body.compareAtPrice);
    }
    if (body.currency !== undefined)
      data.currency = body.currency.toUpperCase();
    if (body.difficulty !== undefined) data.difficulty = body.difficulty;
    if (body.isPublished !== undefined) data.isPublished = body.isPublished;
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
    if (body.suitableFor !== undefined) data.suitableFor = body.suitableFor;
    if (body.badges !== undefined) data.badges = body.badges;
    if (body.included !== undefined) data.included = body.included;
    if (body.excluded !== undefined) data.excluded = body.excluded;
    if (body.highlights !== undefined) data.highlights = body.highlights;
    if (body.meetingPoint !== undefined) data.meetingPoint = body.meetingPoint;
    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug, body.title);
    }
    if (body.destinationSlugs !== undefined) {
      if (body.primaryDestinationSlug === undefined) {
        throw new BadRequestException({
          code: 'PRIMARY_DESTINATION_REQUIRED',
          message:
            'primaryDestinationSlug is required when replacing destinationSlugs',
        });
      }
      const links = await this.resolveDestinationLinks(
        body.destinationSlugs,
        body.primaryDestinationSlug,
      );
      data.destinations = { deleteMany: {}, create: links };
    }
    if (body.itinerary !== undefined) {
      data.itinerary = { deleteMany: {}, create: mapItinerary(body.itinerary) };
    }
    if (body.faqs !== undefined) {
      data.faqs = { deleteMany: {}, create: mapFaqs(body.faqs) };
    }
    if (body.policies !== undefined) {
      data.policies = { deleteMany: {}, create: mapPolicies(body.policies) };
    }

    try {
      const updated = await this.prisma.tour.update({
        where: { slug },
        data,
        include: DETAIL_INCLUDE,
      });
      this.logger.log(`Updated tour ${updated.slug}`);
      return this.media.attachToOwner(MediaOwnerType.TOUR, updated);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw this.slugConflict(String(data.slug ?? slug));
      }
      throw err;
    }
  }

  /**
   * Hard delete. Two-tier: must be unpublished first (one mis-click can't erase
   * live content); children cascade, but the FK Restrict from bookings → 409.
   */
  async remove(slug: string): Promise<Tour> {
    const tour = await this.findBySlug(slug);
    if (tour.isPublished) {
      throw new ConflictException({
        code: 'TOUR_IS_PUBLISHED',
        message: 'Unpublish the tour (isPublished=false) before deleting it.',
      });
    }
    try {
      // Polymorphic media has no FK cascade — delete it in the same tx as the
      // tour so a failed delete (P2003) rolls media back too.
      const deleted = await this.prisma.$transaction(async (tx) => {
        await this.media.deleteForOwner(tx, MediaOwnerType.TOUR, tour.id);
        return tx.tour.delete({ where: { slug } });
      });
      this.logger.log(`Deleted tour ${deleted.slug}`);
      return deleted;
    } catch (err) {
      if (this.isForeignKeyError(err)) {
        throw new ConflictException({
          code: 'TOUR_HAS_BOOKINGS',
          message:
            'Cannot delete while bookings reference it — cancel or refund them first.',
        });
      }
      throw err;
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Shared list. `count` + `findMany` via `Promise.all` (NOT `$transaction`) —
   * the Supabase transaction-mode pooler (connection_limit=1) can't batch reads
   * under concurrency; pagination needs no cross-query snapshot. Slug filters
   * (category/destination) resolve to ids first; an unknown slug short-circuits
   * to an empty page rather than silently broadening the result set.
   */
  private async list(
    query: ListToursQueryDto,
    forcePublished: boolean,
  ): Promise<PaginatedTours> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const search = query.search?.trim();

    const categoryId = await this.resolveCategoryFilter(query.category);
    const destinationId = await this.resolveDestinationFilter(
      query.destination,
    );
    if (
      (query.category && categoryId === null) ||
      (query.destination && destinationId === null)
    ) {
      return { items: [], meta: { page, pageSize, total: 0, totalPages: 1 } };
    }

    const where: Prisma.TourWhereInput = {
      ...(forcePublished
        ? { isPublished: true }
        : query.isPublished !== undefined
          ? { isPublished: query.isPublished }
          : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(destinationId ? { destinations: { some: { destinationId } } } : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tour.count({ where }),
    ]);

    const withMedia = await this.media.attachToOwners(
      MediaOwnerType.TOUR,
      items,
    );
    return {
      items: await this.attachNextDeparture(
        await this.attachRatings(withMedia),
      ),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Resolve `categorySlug` → id; missing → 400 (clearer than a downstream FK). */
  private async resolveCategory(slug: string): Promise<string> {
    const category = await this.prisma.tourCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: `Tour category "${slug}" does not exist`,
      });
    }
    return category.id;
  }

  /**
   * Resolve destination slugs → `TourDestination` create rows, flagging the
   * primary. Primary must be one of the slugs; every slug must exist — both
   * checked upfront with a 400 (listing the offenders).
   */
  private async resolveDestinationLinks(
    slugs: string[],
    primarySlug: string,
  ): Promise<Prisma.TourDestinationCreateWithoutTourInput[]> {
    const unique = [...new Set(slugs)];
    if (!unique.includes(primarySlug)) {
      throw new BadRequestException({
        code: 'INVALID_PRIMARY_DESTINATION',
        message: 'primaryDestinationSlug must be one of destinationSlugs',
      });
    }
    const rows = await this.prisma.destination.findMany({
      where: { slug: { in: unique } },
      select: { id: true, slug: true },
    });
    if (rows.length !== unique.length) {
      const found = new Set(rows.map((r) => r.slug));
      const missing = unique.filter((s) => !found.has(s));
      throw new BadRequestException({
        code: 'INVALID_DESTINATIONS',
        message: `Unknown destination slug(s): ${missing.join(', ')}`,
      });
    }
    const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
    return unique.map((slug) => {
      const id = idBySlug.get(slug);
      if (!id) {
        throw new BadRequestException({
          code: 'INVALID_DESTINATIONS',
          message: `Unknown destination slug: ${slug}`,
        });
      }
      return {
        destination: { connect: { id } },
        isPrimary: slug === primarySlug,
      };
    });
  }

  /** List filter: slug → id, or `null` when the slug matches nothing. */
  private async resolveCategoryFilter(
    slug: string | undefined,
  ): Promise<string | null | undefined> {
    if (!slug) return undefined;
    const row = await this.prisma.tourCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private async resolveDestinationFilter(
    slug: string | undefined,
  ): Promise<string | null | undefined> {
    if (!slug) return undefined;
    const row = await this.prisma.destination.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /** Normalize/generate the slug (cap 120 = DB VarChar(120)); empty → 400. */
  private normalizeSlug(
    provided: string | undefined,
    fallback?: string,
  ): string {
    const source = provided?.trim() ? provided : (fallback ?? '');
    const normalized = slugify(source)
      .slice(0, ToursService.SLUG_MAX)
      .replace(/-+$/, '');
    if (!normalized) {
      throw new BadRequestException({
        code: 'INVALID_SLUG',
        message: 'Slug (or title fallback) has no usable characters',
      });
    }
    return normalized;
  }

  private notFound(slug: string): NotFoundException {
    return new NotFoundException({
      code: 'TOUR_NOT_FOUND',
      message: `Tour "${slug}" not found`,
    });
  }

  private slugConflict(slug: string): ConflictException {
    return new ConflictException({
      code: 'TOUR_SLUG_EXISTS',
      message: `Slug "${slug}" is already in use`,
    });
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    );
  }

  private isForeignKeyError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2003'
    );
  }
}

// ── Sub-entity mappers (DTO → Prisma nested-create rows) ─────────────────────

function mapItinerary(
  days: TourItineraryDayInput[],
): Prisma.TourItineraryDayCreateWithoutTourInput[] {
  return days.map((d) => ({
    dayNumber: d.dayNumber,
    title: d.title,
    description: d.description,
  }));
}

function mapFaqs(faqs: TourFaqInput[]): Prisma.TourFaqCreateWithoutTourInput[] {
  return faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
    order: f.order ?? 0,
  }));
}

function mapPolicies(
  policies: TourPolicyInput[],
): Prisma.TourPolicyCreateWithoutTourInput[] {
  return policies.map((p) => ({
    kind: p.kind,
    title: p.title,
    body: p.body,
    order: p.order ?? 0,
  }));
}
