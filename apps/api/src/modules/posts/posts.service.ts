import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MediaOwnerType, Post, PostStatus, PostTag, Prisma } from '@prisma/client';
import { slugify } from '../../common/slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { MediaInputDto, MediaItemDto } from '../media/dto/media.dto';
import { ToursService, TourWithStats } from '../tours/tours.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/** `Post` + its attached media set (cover lives at role `hero`). */
export type PostWithMedia = Post & { media: MediaItemDto[] };

export type PostTagFlat = { slug: string; name: string };
export type PostAuthorPublic = { fullName: string | null; avatarUrl: string | null };

/** Read-path post row: media + flattened tags + public author (no email). */
export type PostListItem = PostWithMedia & { tags: PostTagFlat[]; author: PostAuthorPublic };

/** Public detail = list row + published related-tour summaries (pick order). */
export type PublicPostDetail = PostListItem & { relatedTours: TourWithStats[] };

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedPosts {
  items: PostListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Admin detail read: list row + author contact + light related-tour rows. */
export type AdminPostDetail = PostWithMedia & {
  tags: PostTagFlat[];
  relatedTours: { slug: string; title: string; isPublished: boolean }[];
  author: { fullName: string | null; email: string; avatarUrl: string | null };
};

/** Raw row shape the hydrate helpers accept (post + join includes). */
type RawPostRow = Post & {
  tags: { tag: PostTag }[];
  author: { id: string; fullName: string | null };
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

  /** DB column cap for `PostTag.slug`/`name` (`@db.VarChar(60)`). */
  private static readonly TAG_MAX = 60;

  /** Shared read include: tag joins + the author's public display fields. */
  private static readonly READ_INCLUDE = {
    tags: { include: { tag: true } },
    author: { select: { id: true, fullName: true } },
  } satisfies Prisma.PostInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly tours: ToursService,
  ) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  findPublicList(query: ListPostsQueryDto): Promise<PaginatedPosts> {
    return this.list({ ...query, status: PostStatus.PUBLISHED, publishedOnly: true });
  }

  async findPublicBySlug(slug: string): Promise<PublicPostDetail> {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
      include: {
        ...PostsService.READ_INCLUDE,
        relatedTours: { orderBy: { order: 'asc' }, select: { tourId: true } },
      },
    });
    if (!post) throw this.notFound(slug);
    const { relatedTours: links, ...row } = post;
    const hydrated = await this.hydrate(row);
    const relatedTours = await this.tours.findSummariesByIds(links.map((l) => l.tourId));
    return { ...hydrated, relatedTours };
  }

  /** Tags carrying ≥1 published post, with that count, name-ordered (public filter chips). */
  async findPublicTags(): Promise<{ slug: string; name: string; count: number }[]> {
    const tags = await this.prisma.postTag.findMany({
      orderBy: { name: 'asc' },
      select: {
        slug: true,
        name: true,
        _count: {
          select: {
            posts: {
              where: {
                post: { status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
              },
            },
          },
        },
      },
    });
    return tags
      .filter((t) => t._count.posts > 0)
      .map((t) => ({ slug: t.slug, name: t.name, count: t._count.posts }));
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

  /** Admin detail: post + media + the author's name/email/avatar. Public reads stay author-free. */
  async findDetailForAdmin(slug: string): Promise<AdminPostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        tags: { include: { tag: true } },
        relatedTours: {
          orderBy: { order: 'asc' },
          include: { tour: { select: { slug: true, title: true, isPublished: true } } },
        },
      },
    });
    if (!post) throw this.notFound(slug);
    const { author, tags, relatedTours, ...row } = post;
    const withMedia = await this.media.attachToOwner(MediaOwnerType.POST, row);
    // A USER owner has at most one media asset (the avatar) → first url, or null.
    const authorWithAvatar = await this.media.attachToOwner(MediaOwnerType.USER, { id: author.id });
    return {
      ...withMedia,
      tags: tags.map((l) => ({ slug: l.tag.slug, name: l.tag.name })),
      relatedTours: relatedTours.map((l) => l.tour),
      author: {
        fullName: author.fullName,
        email: author.email,
        avatarUrl: authorWithAvatar.media[0]?.url ?? null,
      },
    };
  }

  /** All tags with their total post count (drafts included) — admin form suggestions. */
  async findAdminTags(): Promise<{ slug: string; name: string; count: number }[]> {
    const tags = await this.prisma.postTag.findMany({
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, _count: { select: { posts: true } } },
    });
    return tags.map((t) => ({ slug: t.slug, name: t.name, count: t._count.posts }));
  }

  /** Create. Slug from input (or `title`); duplicate → 409. `publishedAt` set when created PUBLISHED. */
  async create(body: CreatePostDto, authorId: string): Promise<PostListItem> {
    const slug = this.normalizeSlug(body.slug, body.title);
    const status = body.status ?? PostStatus.DRAFT;
    const tagRows = body.tags !== undefined ? this.normalizeTags(body.tags) : [];
    const relatedIds =
      body.relatedTourSlugs !== undefined
        ? await this.resolveRelatedTours(body.relatedTourSlugs)
        : [];
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
          ...(tagRows.length > 0 ? { tags: { create: this.tagLinksCreate(tagRows) } } : {}),
          ...(relatedIds.length > 0
            ? { relatedTours: { create: this.tourLinksCreate(relatedIds) } }
            : {}),
        },
        include: PostsService.READ_INCLUDE,
      });
      this.logger.log(`Created post ${post.slug}`);
      return this.hydrate(post);
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
  async update(slug: string, body: UpdatePostDto): Promise<PostListItem> {
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
    if (body.tags !== undefined) {
      const tagRows = this.normalizeTags(body.tags);
      data.tags = {
        deleteMany: {},
        ...(tagRows.length > 0 ? { create: this.tagLinksCreate(tagRows) } : {}),
      };
    }
    if (body.relatedTourSlugs !== undefined) {
      const relatedIds = await this.resolveRelatedTours(body.relatedTourSlugs);
      data.relatedTours = {
        deleteMany: {},
        ...(relatedIds.length > 0 ? { create: this.tourLinksCreate(relatedIds) } : {}),
      };
    }

    try {
      const updated = await this.prisma.post.update({
        where: { slug },
        data,
        include: PostsService.READ_INCLUDE,
      });
      return this.hydrate(updated);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw this.slugConflict(String(data.slug ?? slug));
      }
      throw err;
    }
  }

  /**
   * Replace-all the post's media set (admin). Resolves slug→id, syncs in a transaction,
   * returns the new set with built delivery URLs. Mirrors destinations/tours.
   */
  async setMedia(slug: string, media: MediaInputDto[]): Promise<MediaItemDto[]> {
    const post = await this.prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!post) throw this.notFound(slug);
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.POST, post.id, media),
    );
    const withMedia = await this.media.attachToOwner(MediaOwnerType.POST, { id: post.id });
    this.logger.log(`Set ${media.length} media on post ${slug}`);
    return withMedia.media;
  }

  /** Hard delete (404 if missing). Media has no FK cascade — delete it in the same tx. */
  async remove(slug: string): Promise<Post> {
    const existing = await this.findBySlug(slug);
    const deleted = await this.prisma.$transaction(async (tx) => {
      await this.media.deleteForOwner(tx, MediaOwnerType.POST, existing.id);
      return tx.post.delete({ where: { slug } });
    });
    this.logger.log(`Deleted post ${deleted.slug}`);
    return deleted;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Normalize tag names → unique `{slug, name}` rows; empty-after-slugify → 400. */
  private normalizeTags(names: string[]): { slug: string; name: string }[] {
    const bySlug = new Map<string, string>();
    for (const raw of names) {
      const name = raw.trim().slice(0, PostsService.TAG_MAX);
      const slug = slugify(name).slice(0, PostsService.TAG_MAX).replace(/-+$/, '');
      if (!slug) {
        throw new BadRequestException({
          code: 'INVALID_TAG',
          message: `Tag "${raw}" has no usable characters`,
        });
      }
      if (!bySlug.has(slug)) bySlug.set(slug, name);
    }
    return [...bySlug.entries()].map(([slug, name]) => ({ slug, name }));
  }

  /** Nested-write payload linking (upserting) tags by slug. */
  private tagLinksCreate(rows: { slug: string; name: string }[]) {
    return rows.map((t) => ({
      tag: { connectOrCreate: { where: { slug: t.slug }, create: t } },
    }));
  }

  /** Resolve related tour slugs → ids in input order; unknown slug → 400. */
  private async resolveRelatedTours(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) return [];
    const unique = [...new Set(slugs)];
    const tours = await this.prisma.tour.findMany({
      where: { slug: { in: unique } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(tours.map((t) => [t.slug, t.id]));
    const missing = unique.filter((s) => !idBySlug.has(s));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'RELATED_TOUR_NOT_FOUND',
        message: `Unknown tour slug(s): ${missing.join(', ')}`,
      });
    }
    return unique.map((s) => idBySlug.get(s) as string);
  }

  /** Ordered `PostTour` nested creates (order = array index). */
  private tourLinksCreate(tourIds: string[]) {
    return tourIds.map((id, order) => ({ order, tour: { connect: { id } } }));
  }

  /** Flattens join rows + attaches media and each author's public avatar (batched). */
  private async hydrateMany(rows: RawPostRow[]): Promise<PostListItem[]> {
    if (rows.length === 0) return [];
    const withMedia = await this.media.attachToOwners(MediaOwnerType.POST, rows);
    const uniqueAuthors = [...new Map(rows.map((r) => [r.author.id, r.author])).values()];
    const withAvatars = await this.media.attachToOwners(MediaOwnerType.USER, uniqueAuthors);
    const avatarByAuthor = new Map(
      withAvatars.map((a) => [a.id, a.media[0]?.url ?? null]),
    );
    return withMedia.map((row) => {
      const { tags, author, ...post } = row;
      return {
        ...post,
        tags: tags.map((l) => ({ slug: l.tag.slug, name: l.tag.name })),
        author: {
          fullName: author.fullName,
          avatarUrl: avatarByAuthor.get(author.id) ?? null,
        },
      };
    });
  }

  private async hydrate(row: RawPostRow): Promise<PostListItem> {
    return (await this.hydrateMany([row]))[0];
  }

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
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: PostsService.READ_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: await this.hydrateMany(items),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
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
