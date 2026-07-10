import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TourCategory } from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTourCategoryDto } from './dto/create-tour-category.dto';
import { ListTourCategoriesQueryDto } from './dto/list-tour-categories-query.dto';
import { UpdateTourCategoryDto } from './dto/update-tour-category.dto';

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedTourCategories {
  items: (TourCategory & { toursCount: number })[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** A tour in a category (1:N) — for the admin detail "tours in this category" list. */
export interface LinkedCategoryTour {
  slug: string;
  title: string;
  isPublished: boolean;
}

/** Admin category detail — the category row plus the tours that belong to it. */
export type AdminTourCategoryDetail = TourCategory & {
  tours: LinkedCategoryTour[];
  toursCount: number;
};

/**
 * CRUD for the `TourCategory` lookup (D-P1.5; replaces the donor enum). Public
 * reads force `isActive: true`; admin reads see drafts. Slug uniqueness is a DB
 * constraint — `P2002` → 409; the `onDelete: Restrict` from tours surfaces as
 * `P2003` → 409. Mirrors the destinations CRUD pattern (slug cap 60 here).
 * Exported so `ToursService` can resolve `categorySlug` → id.
 */
@Injectable()
export class TourCategoriesService {
  private readonly logger = new Logger(TourCategoriesService.name);

  /** DB column cap for `TourCategory.slug` (`@db.VarChar(60)`). */
  private static readonly SLUG_MAX = 60;

  constructor(private readonly prisma: PrismaService) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(
    query: ListTourCategoriesQueryDto,
  ): Promise<PaginatedTourCategories> {
    return this.list({ ...query, isActive: true });
  }

  async findPublicBySlug(slug: string): Promise<TourCategory> {
    const category = await this.prisma.tourCategory.findFirst({
      where: { slug, isActive: true },
    });
    if (!category) throw this.notFound(slug);
    return category;
  }

  // ── Admin reads + mutations ───────────────────────────────────────────────

  findAll(query: ListTourCategoriesQueryDto): Promise<PaginatedTourCategories> {
    return this.list(query);
  }

  async findBySlug(slug: string): Promise<TourCategory> {
    const category = await this.prisma.tourCategory.findUnique({
      where: { slug },
    });
    if (!category) throw this.notFound(slug);
    return category;
  }

  /**
   * Admin detail read — like {@link findBySlug} plus the tours in this category (1:N), alphabetical.
   * Each tour is trimmed to `{ slug, title, isPublished }`.
   */
  async findDetailForAdmin(slug: string): Promise<AdminTourCategoryDetail> {
    const category = await this.prisma.tourCategory.findUnique({
      where: { slug },
      include: {
        tours: {
          select: { slug: true, title: true, isPublished: true },
          orderBy: { title: 'asc' },
        },
      },
    });
    if (!category) throw this.notFound(slug);
    return { ...category, toursCount: category.tours.length };
  }

  /** Create. Slug normalized from input (or `name`); duplicate → 409. */
  async create(body: CreateTourCategoryDto): Promise<TourCategory> {
    const slug = this.normalizeSlug(body.slug, body.name);
    try {
      const category = await this.prisma.tourCategory.create({
        data: {
          slug,
          name: body.name,
          description: body.description,
          order: body.order ?? 0,
          isActive: body.isActive ?? true,
        },
      });
      this.logger.log(`Created tour category ${category.slug}`);
      return category;
    } catch (err) {
      if (this.isUniqueConstraintError(err)) throw this.slugConflict(slug);
      throw err;
    }
  }

  /** Partial update. 404 surfaced before the write; renamed slug re-normalized. */
  async update(
    slug: string,
    body: UpdateTourCategoryDto,
  ): Promise<TourCategory> {
    await this.findBySlug(slug);
    const data: Prisma.TourCategoryUpdateInput = { ...body };
    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug, body.name);
    }
    try {
      return await this.prisma.tourCategory.update({ where: { slug }, data });
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw this.slugConflict(String(data.slug ?? slug));
      }
      throw err;
    }
  }

  /**
   * Hard delete. Two-tier: must be deactivated first (one mis-click can't erase
   * a live lookup); FK Restrict from tours → 409.
   */
  async remove(slug: string): Promise<TourCategory> {
    const existing = await this.findBySlug(slug);
    if (existing.isActive) {
      throw new ConflictException({
        code: 'CATEGORY_IS_ACTIVE',
        message: 'Deactivate (isActive=false) before deleting.',
      });
    }
    try {
      const deleted = await this.prisma.tourCategory.delete({
        where: { slug },
      });
      this.logger.log(`Deleted tour category ${deleted.slug}`);
      return deleted;
    } catch (err) {
      if (this.isForeignKeyError(err)) {
        throw new ConflictException({
          code: 'CATEGORY_HAS_TOURS',
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
    query: ListTourCategoriesQueryDto,
  ): Promise<PaginatedTourCategories> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'order';
    const sortOrder = query.sortOrder ?? 'asc';
    const search = query.search?.trim();

    const where: Prisma.TourCategoryWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tourCategory.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { tours: true } } },
      }),
      this.prisma.tourCategory.count({ where }),
    ]);

    return {
      items: items.map(({ _count, ...row }) => ({
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

  /** Normalize/generate the slug (cap 60 = DB VarChar(60)); empty → 400. */
  private normalizeSlug(
    provided: string | undefined,
    fallback?: string,
  ): string {
    const source = provided?.trim() ? provided : (fallback ?? '');
    const normalized = slugify(source)
      .slice(0, TourCategoriesService.SLUG_MAX)
      .replace(/-+$/, '');
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
      code: 'CATEGORY_NOT_FOUND',
      message: `Tour category "${slug}" not found`,
    });
  }

  private slugConflict(slug: string): ConflictException {
    return new ConflictException({
      code: 'CATEGORY_SLUG_EXISTS',
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
