import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Destination, Prisma } from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { ListDestinationsQueryDto } from './dto/list-destinations-query.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedDestinations {
  items: Destination[];
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

  constructor(private readonly prisma: PrismaService) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(
    query: ListDestinationsQueryDto,
  ): Promise<PaginatedDestinations> {
    return this.list({ ...query, isActive: true });
  }

  async findPublicBySlug(slug: string): Promise<Destination> {
    const destination = await this.prisma.destination.findFirst({
      where: { slug, isActive: true },
    });
    if (!destination) throw this.notFound(slug);
    return destination;
  }

  // ── Admin reads + mutations ───────────────────────────────────────────────

  findAll(query: ListDestinationsQueryDto): Promise<PaginatedDestinations> {
    return this.list(query);
  }

  async findBySlug(slug: string): Promise<Destination> {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
    });
    if (!destination) throw this.notFound(slug);
    return destination;
  }

  /** Create. Slug normalized from input (or `name`); duplicate → 409. */
  async create(body: CreateDestinationDto): Promise<Destination> {
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
      return destination;
    } catch (err) {
      if (this.isUniqueConstraintError(err)) throw this.slugConflict(slug);
      throw err;
    }
  }

  /** Partial update. 404 surfaced before the write; renamed slug re-normalized. */
  async update(slug: string, body: UpdateDestinationDto): Promise<Destination> {
    await this.findBySlug(slug);
    const data: Prisma.DestinationUpdateInput = { ...body };
    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug, body.name);
    }
    try {
      return await this.prisma.destination.update({ where: { slug }, data });
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
      const deleted = await this.prisma.destination.delete({ where: { slug } });
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
      }),
      this.prisma.destination.count({ where }),
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
