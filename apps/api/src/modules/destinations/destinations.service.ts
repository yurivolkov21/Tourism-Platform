import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Destination, MediaOwnerType, Prisma } from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaItemDto, MediaInputDto } from '../media/dto/media.dto';
import { MediaService } from '../media/media.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { ListDestinationsQueryDto } from './dto/list-destinations-query.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

/** A destination row enriched with its media set (delivery URLs built at read). */
export type DestinationWithMedia = Destination & { media: MediaItemDto[] };

/** A tour that uses a destination (via the M:N join) — for the admin detail "used by" list. */
export interface LinkedDestinationTour {
  slug: string;
  title: string;
  isPublished: boolean;
  isPrimary: boolean;
}

/** Admin destination detail — the media-enriched row plus the tours that use it. */
export type AdminDestinationDetail = DestinationWithMedia & {
  tours: LinkedDestinationTour[];
  toursCount: number;
};

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedDestinations {
  items: (DestinationWithMedia & { toursCount: number })[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * CRUD + search for `Destination`. Public reads force `isActive: true`; admin
 * reads see drafts. Slug uniqueness is a DB constraint — `P2002` → 409; the
 * `onDelete: Restrict` from tours surfaces as `P2003` → 409. (Adapted from the
 * donor: EN-only, media wired in P1.6.)
 */
@Injectable()
export class DestinationsService {
  private readonly logger = new Logger(DestinationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /**
   * Replace-all the destination's media set (admin). Resolves slug→id, syncs in a
   * transaction, returns the new set with built delivery URLs.
   */
  async setMedia(slug: string, media: MediaInputDto[]): Promise<MediaItemDto[]> {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!destination) throw this.notFound(slug);
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.DESTINATION, destination.id, media),
    );
    const withMedia = await this.media.attachToOwner(
      MediaOwnerType.DESTINATION,
      { id: destination.id },
    );
    this.logger.log(`Set ${media.length} media on destination ${slug}`);
    return withMedia.media;
  }

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(
    query: ListDestinationsQueryDto,
  ): Promise<PaginatedDestinations> {
    return this.list({ ...query, isActive: true });
  }

  async findPublicBySlug(slug: string): Promise<DestinationWithMedia> {
    const destination = await this.prisma.destination.findFirst({
      where: { slug, isActive: true },
    });
    if (!destination) throw this.notFound(slug);
    return this.media.attachToOwner(MediaOwnerType.DESTINATION, destination);
  }

  // ── Admin reads + mutations ───────────────────────────────────────────────

  findAll(query: ListDestinationsQueryDto): Promise<PaginatedDestinations> {
    return this.list(query);
  }

  async findBySlug(slug: string): Promise<DestinationWithMedia> {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
    });
    if (!destination) throw this.notFound(slug);
    return this.media.attachToOwner(MediaOwnerType.DESTINATION, destination);
  }

  /**
   * Admin detail read — like {@link findBySlug} plus the tours that use this destination (M:N join),
   * primary destinations first. The raw join rows are mapped to a flat `{ slug, title, isPublished,
   * isPrimary }[]` and never sent on the wire.
   */
  async findDetailForAdmin(slug: string): Promise<AdminDestinationDetail> {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
      include: {
        tours: {
          select: {
            isPrimary: true,
            tour: { select: { slug: true, title: true, isPublished: true } },
          },
          orderBy: [{ isPrimary: 'desc' }, { tour: { title: 'asc' } }],
        },
      },
    });
    if (!destination) throw this.notFound(slug);

    const { tours: joinRows, ...scalar } = destination;
    const withMedia = await this.media.attachToOwner(MediaOwnerType.DESTINATION, scalar);
    const tours: LinkedDestinationTour[] = joinRows.map((row) => ({
      slug: row.tour.slug,
      title: row.tour.title,
      isPublished: row.tour.isPublished,
      isPrimary: row.isPrimary,
    }));
    return { ...withMedia, tours, toursCount: tours.length };
  }

  /** Create. Slug normalized from input (or `name`); duplicate → 409. */
  async create(body: CreateDestinationDto): Promise<DestinationWithMedia> {
    const slug = this.normalizeSlug(body.slug, body.name);
    try {
      const destination = await this.prisma.destination.create({
        data: {
          slug,
          name: body.name,
          country: body.country ?? 'Vietnam',
          region: body.region,
          description: body.description,
          isActive: body.isActive ?? true,
        },
      });
      this.logger.log(`Created destination ${destination.slug}`);
      return this.media.attachToOwner(MediaOwnerType.DESTINATION, destination);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) throw this.slugConflict(slug);
      throw err;
    }
  }

  /** Partial update. 404 surfaced before the write; renamed slug re-normalized. */
  async update(
    slug: string,
    body: UpdateDestinationDto,
  ): Promise<DestinationWithMedia> {
    await this.findBySlug(slug);
    const data: Prisma.DestinationUpdateInput = { ...body };
    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug, body.name);
    }
    try {
      const updated = await this.prisma.destination.update({
        where: { slug },
        data,
      });
      return this.media.attachToOwner(MediaOwnerType.DESTINATION, updated);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw this.slugConflict(String(data.slug ?? slug));
      }
      throw err;
    }
  }

  /**
   * Hard delete. Two-tier: must be deactivated first (one mis-click can't erase
   * live content); FK Restrict from tours → 409.
   */
  async remove(slug: string): Promise<Destination> {
    const existing = await this.findBySlug(slug);
    if (existing.isActive) {
      throw new ConflictException({
        code: 'DESTINATION_IS_ACTIVE',
        message: 'Deactivate (isActive=false) before deleting.',
      });
    }
    try {
      // Polymorphic media has no FK cascade — delete in the same tx as the owner.
      const deleted = await this.prisma.$transaction(async (tx) => {
        await this.media.deleteForOwner(
          tx,
          MediaOwnerType.DESTINATION,
          existing.id,
        );
        return tx.destination.delete({ where: { slug } });
      });
      this.logger.log(`Deleted destination ${deleted.slug}`);
      return deleted;
    } catch (err) {
      if (this.isForeignKeyError(err)) {
        throw new ConflictException({
          code: 'DESTINATION_HAS_TOURS',
          message:
            'Cannot delete while tours reference it — reassign or delete those tours first.',
        });
      }
      throw err;
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Shared list. `count` + `findMany` via `Promise.all` (NOT `$transaction`) —
   * the Supabase transaction-mode pooler (connection_limit=1) can't batch reads
   * under concurrency; pagination needs no cross-query snapshot.
   */
  private async list(
    query: ListDestinationsQueryDto,
  ): Promise<PaginatedDestinations> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const search = query.search?.trim();

    const where: Prisma.DestinationWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.destination.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { tours: true } } },
      }),
      this.prisma.destination.count({ where }),
    ]);

    const withMedia = await this.media.attachToOwners(MediaOwnerType.DESTINATION, items);
    return {
      items: withMedia.map(({ _count, ...row }) => ({
        ...row,
        toursCount: _count?.tours ?? 0,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Normalize/generate the slug (cap 80 = DB VarChar(80)); empty → 400. */
  private normalizeSlug(
    provided: string | undefined,
    fallback?: string,
  ): string {
    const source = provided?.trim() ? provided : (fallback ?? '');
    const normalized = slugify(source).slice(0, 80).replace(/-+$/, '');
    if (!normalized) {
      throw new BadRequestException({
        code: 'INVALID_SLUG',
        message: 'Slug (or name fallback) has no usable characters',
      });
    }
    return normalized;
  }

  private notFound(slug: string): NotFoundException {
    return new NotFoundException({
      code: 'DESTINATION_NOT_FOUND',
      message: `Destination "${slug}" not found`,
    });
  }

  private slugConflict(slug: string): ConflictException {
    return new ConflictException({
      code: 'DESTINATION_SLUG_EXISTS',
      message: `Slug "${slug}" is already in use`,
    });
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
    );
  }

  private isForeignKeyError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003'
    );
  }
}
