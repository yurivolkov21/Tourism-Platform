import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Post, PostStatus, Prisma } from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedPosts {
  items: Post[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** `Post` + the author's display fields — the admin detail read (`AdminPostDetailDto`). */
export type AdminPostDetail = Post & {
  author: { fullName: string | null; email: string };
};

/**
 * CRUD for the editorial `Post` (P-Content). Public reads return only PUBLISHED
 * posts whose `publishedAt <= now`; admin reads see drafts. `publishedAt` is
 * stamped the first time a post becomes PUBLISHED (and preserved thereafter).
 * Slug uniqueness is a DB constraint — `P2002` → 409. Mirrors the
 * tour-categories CRUD pattern (slug cap 80 here).
 */
@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  /** DB column cap for `Post.slug` (`@db.VarChar(80)`). */
  private static readonly SLUG_MAX = 80;

  constructor(private readonly prisma: PrismaService) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(query: ListPostsQueryDto): Promise<PaginatedPosts> {
    return this.list({ ...query, status: PostStatus.PUBLISHED, publishedOnly: true });
  }

  async findPublicBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
    });
    if (!post) throw this.notFound(slug);
    return post;
  }

  // ── Admin reads + mutations ───────────────────────────────────────────────

  findAll(query: ListPostsQueryDto): Promise<PaginatedPosts> {
    return this.list(query);
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { slug } });
    if (!post) throw this.notFound(slug);
    return post;
  }

  /** Admin detail: the post plus its author's name/email. Public reads stay author-free. */
  async findDetailForAdmin(slug: string): Promise<AdminPostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { fullName: true, email: true } } },
    });
    if (!post) throw this.notFound(slug);
    return post;
  }

  /** Create. Slug from input (or `title`); duplicate → 409. `publishedAt` set when created PUBLISHED. */
  async create(body: CreatePostDto, authorId: string): Promise<Post> {
    const slug = this.normalizeSlug(body.slug, body.title);
    const status = body.status ?? PostStatus.DRAFT;
    try {
      const post = await this.prisma.post.create({
        data: {
          slug,
          title: body.title,
          excerpt: body.excerpt,
          content: body.content,
          status,
          publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
          authorId,
        },
      });
      this.logger.log(`Created post ${post.slug}`);
      return post;
    } catch (err) {
      if (this.isUniqueConstraintError(err)) throw this.slugConflict(slug);
      throw err;
    }
  }

  /**
   * Partial update. 404 before the write; renamed slug re-normalized. `publishedAt`
   * is stamped the first time status flips to PUBLISHED, and preserved on later edits
   * (including a flip back to DRAFT — the original publish date is kept).
   */
  async update(slug: string, body: UpdatePostDto): Promise<Post> {
    const existing = await this.findBySlug(slug);

    const data: Prisma.PostUpdateInput = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    };
    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug, body.title ?? existing.title);
    }
    if (
      body.status === PostStatus.PUBLISHED &&
      existing.status !== PostStatus.PUBLISHED &&
      existing.publishedAt === null
    ) {
      data.publishedAt = new Date();
    }

    try {
      return await this.prisma.post.update({ where: { slug }, data });
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw this.slugConflict(String(data.slug ?? slug));
      }
      throw err;
    }
  }

  /** Hard delete (404 if missing). Posts have no dependents. */
  async remove(slug: string): Promise<Post> {
    await this.findBySlug(slug);
    const deleted = await this.prisma.post.delete({ where: { slug } });
    this.logger.log(`Deleted post ${deleted.slug}`);
    return deleted;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Shared list. `count` + `findMany` via `Promise.all` (NOT `$transaction`) —
   * the Supabase pooler (connection_limit=1) can't batch reads under concurrency.
   */
  private async list(
    query: ListPostsQueryDto & { publishedOnly?: boolean },
  ): Promise<PaginatedPosts> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const sortBy = query.sortBy ?? 'publishedAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const search = query.search?.trim();

    const where: Prisma.PostWhereInput = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.publishedOnly ? { publishedAt: { lte: new Date() } } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
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
  private normalizeSlug(provided: string | undefined, fallback?: string): string {
    const source = provided?.trim() ? provided : (fallback ?? '');
    const normalized = slugify(source).slice(0, PostsService.SLUG_MAX).replace(/-+$/, '');
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
      code: 'POST_NOT_FOUND',
      message: `Post "${slug}" not found`,
    });
  }

  private slugConflict(slug: string): ConflictException {
    return new ConflictException({
      code: 'POST_SLUG_EXISTS',
      message: `Slug "${slug}" is already in use`,
    });
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }
}
