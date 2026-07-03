# Blog v2 Wave 1 — Content Model (tags + tour links + public author) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Posts gain free-form tags, hand-picked related tours, and a public-safe author —
schema + API + admin authoring UI. Web consumes in Wave 2 (zero web changes here).

**Architecture:** Slice 1 (BE, branch `feat/blog-v2-content-model`): 3 new tables via ONE
migration (created locally with `--create-only`, applied to live Supabase only after the
user's go/no-go), Prisma nested writes (connectOrCreate for tags — no interactive tx),
hydrated reads (tags/author flattened + batched avatar attach), 2 tag-list endpoints,
`ToursService.findSummariesByIds` reusing the existing summary pipeline. Slice 2 (admin FE,
branch `feat/blog-v2-admin-taxonomy`): zod/actions JSON-array fields, TagsInput +
RelatedToursPicker on the post form, detail rail + list column surfacing.

**Tech Stack:** NestJS 11 · Prisma 7 (Supabase pooler) · class-validator/Swagger ·
Next.js 16 admin (Server Actions + zod) · `@tourism/ui` (Base UI) · Jest.

**Spec:** `docs/06-specs/2026-07-03-blog-v2-wave1-content-model-design.md` (approved).

## Global Constraints

- Straight ASCII quotes in code — never typographic quotes (haiku transcription gotcha).
- Never stage unrelated dirty files (`docs/07-plans/2026-07-02-*.md`, `playground.md`).
- Conventional Commits, no AI attribution.
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
  Baselines: api 291 · admin 134 · web 148 (web must stay untouched).
- **Live-DB migration is user-gated:** generate the migration with `--create-only` (Task 1);
  `prisma migrate deploy` runs ONLY in Task 6 after the user's explicit GO.
- Reads stay `Promise.all` (pooler); writes use Prisma **nested writes** (single statement —
  the tours module's existing precedent), NOT interactive `$transaction`.
- Public reads must never expose author email or unpublished tours.
- Admin FE: reuse `@tourism/ui` primitives + established admin patterns only (no native
  elements); deploy-lag guard (`?? []`) every new field.
- `tsc` includes `*.spec.ts` — run `typecheck` targets, not just build (api gotcha).

---

## Slice 1 — BE content model (branch `feat/blog-v2-content-model`)

### Task 1: Schema + migration (create-only) + client generate

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (Post block ends ~line 538)
- Create: `apps/api/prisma/migrations/<timestamp>_add_post_tags_and_post_tours/migration.sql`
  (generated)

**Interfaces:**
- Consumes: existing `Post` (line 521) and `Tour` (line 200) models.
- Produces: Prisma client models `postTag`, `postTagLink`, `postTour`; relations
  `Post.tags: PostTagLink[]`, `Post.relatedTours: PostTour[]`, `Tour.posts: PostTour[]`.

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b feat/blog-v2-content-model
```

- [ ] **Step 2: Edit the schema**

In `apps/api/prisma/schema.prisma`:

1. Inside `model Post`, after the `author` relation line
   (`author User @relation(...)`), add:

```prisma
  tags         PostTagLink[]
  relatedTours PostTour[]
```

2. Inside `model Tour`, after the `reviews`/last relation list (find the block of relation
   fields — `category`, `destinations`, `itinerary`, `departures`, `faqs`, …) add one line
   alongside them:

```prisma
  posts PostTour[]
```

3. Directly BELOW the whole `model Post { … }` block, add three new models:

```prisma
// ─────────────────────────────────────────────────────────────────────────────
// PostTag — free-form blog taxonomy (created inline from the admin post form).
// Slug is the identity (upsert target); display name = first writer's casing.
// ─────────────────────────────────────────────────────────────────────────────

model PostTag {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique @db.VarChar(60)
  name      String   @db.VarChar(60)
  createdAt DateTime @default(now()) @map("created_at")

  posts PostTagLink[]

  @@map("post_tags")
}

model PostTagLink {
  postId String @map("post_id") @db.Uuid
  tagId  String @map("tag_id") @db.Uuid

  post Post    @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  PostTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])
  @@map("post_tag_links")
}

// ─────────────────────────────────────────────────────────────────────────────
// PostTour — admin-curated "tours in this story" (max 3 enforced at the DTO).
// `order` = pick order. Tour deletion silently drops the link (post survives).
// ─────────────────────────────────────────────────────────────────────────────

model PostTour {
  postId String @map("post_id") @db.Uuid
  tourId String @map("tour_id") @db.Uuid
  order  Int    @default(0)

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tour Tour @relation(fields: [tourId], references: [id], onDelete: Cascade)

  @@id([postId, tourId])
  @@index([tourId])
  @@map("post_tours")
}
```

- [ ] **Step 3: Generate the migration WITHOUT applying + regenerate the client**

```bash
cd apps/api
pnpm exec prisma migrate dev --create-only --name add_post_tags_and_post_tours
pnpm exec prisma generate
```

Expected: a new folder under `apps/api/prisma/migrations/` containing `migration.sql` with
`CREATE TABLE "post_tags" / "post_tag_links" / "post_tours"`; client regenerated. The live
DB is NOT touched. (If `migrate dev` fails on a shadow-database error, fall back to:
`pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
and hand-place the output as the migration.sql in a correctly timestamped folder, then rerun
`prisma generate`.)

- [ ] **Step 4: Verify the api still typechecks**

Run: `pnpm nx run @tourism/api:typecheck`
Expected: green (schema-only change; no consumer code yet).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): post tags + post tours schema (migration create-only, not applied)"
```

### Task 2: DTOs — tag shapes, public author, detail-with-tours, write fields

**Files:**
- Create: `apps/api/src/modules/posts/dto/post-tag.dto.ts`
- Create: `apps/api/src/modules/posts/dto/post-detail.dto.ts`
- Modify: `apps/api/src/modules/posts/dto/post.dto.ts`
- Modify: `apps/api/src/modules/posts/dto/admin-post-detail.dto.ts`
- Modify: `apps/api/src/modules/posts/dto/create-post.dto.ts`
- Modify: `apps/api/src/modules/posts/dto/list-posts-query.dto.ts`

**Interfaces:**
- Consumes: `TourSummaryDto` from `../../tours/dto/tour-summary.dto` (exists).
- Produces: `PostTagDto { slug, name }` · `PostTagWithCountDto extends PostTagDto { count }` ·
  `PublicPostAuthorDto { fullName: string|null, avatarUrl: string|null }` ·
  `PostDto += tags: PostTagDto[], author: PublicPostAuthorDto` ·
  `PostDetailDto extends PostDto { relatedTours: TourSummaryDto[] }` ·
  `AdminRelatedTourDto { slug, title, isPublished }` ·
  `AdminPostDetailDto += tags: PostTagDto[], relatedTours: AdminRelatedTourDto[]` ·
  `CreatePostDto += tags?: string[], relatedTourSlugs?: string[]` ·
  `ListPostsQueryDto += tag?: string`. (`UpdatePostDto` inherits via `PartialType` — no edit.)

- [ ] **Step 1: Create `post-tag.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

/** One blog tag (public + admin reads). */
export class PostTagDto {
  @ApiProperty({ example: 'ha-long' })
  slug!: string;

  @ApiProperty({ example: 'Hạ Long' })
  name!: string;
}

/** Tag + how many posts carry it (published-only on the public endpoint). */
export class PostTagWithCountDto extends PostTagDto {
  @ApiProperty({ example: 4 })
  count!: number;
}
```

- [ ] **Step 2: Extend `post.dto.ts`**

Add below the imports (keep existing imports; add `PostTagDto` import):

```ts
import { PostTagDto } from './post-tag.dto';

/** Public-safe author (NO email — that stays admin-only on `PostAuthorDto`). */
export class PublicPostAuthorDto {
  @ApiProperty({ nullable: true, type: String, example: 'Ana Admin' })
  fullName!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Avatar delivery URL, when set.' })
  avatarUrl!: string | null;
}
```

and append two fields at the end of `class PostDto`:

```ts
  @ApiProperty({ type: [PostTagDto], description: 'Free-form topics (empty when untagged).' })
  tags!: PostTagDto[];

  @ApiProperty({ type: PublicPostAuthorDto })
  author!: PublicPostAuthorDto;
```

- [ ] **Step 3: Create `post-detail.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { TourSummaryDto } from '../../tours/dto/tour-summary.dto';
import { PostDto } from './post.dto';

/**
 * Public post detail (`GET /posts/:slug`) — the shared `PostDto` + the admin-picked related
 * tours as full catalog summaries (published only, pick order), ready for tour cards.
 */
export class PostDetailDto extends PostDto {
  @ApiProperty({ type: [TourSummaryDto], description: 'Published related tours, pick order.' })
  relatedTours!: TourSummaryDto[];
}
```

- [ ] **Step 4: Extend `admin-post-detail.dto.ts`**

Add ABOVE `class AdminPostDetailDto` (no `PostTagDto` import needed — `tags` arrives via the
`PostDto` base class and must NOT be re-declared here):

```ts
/** Light related-tour row for the admin rail (identity, not merchandising). */
export class AdminRelatedTourDto {
  @ApiProperty({ example: 'halong-heritage-cruise' })
  slug!: string;

  @ApiProperty({ example: 'Hạ Long heritage cruise' })
  title!: string;

  @ApiProperty()
  isPublished!: boolean;
}
```

and append ONE field at the end of `class AdminPostDetailDto`:

```ts
  @ApiProperty({ type: [AdminRelatedTourDto], description: 'Admin-picked tours, pick order.' })
  relatedTours!: AdminRelatedTourDto[];
```

- [ ] **Step 5: Extend `create-post.dto.ts`**

Add to the imports: `ArrayMaxSize, IsArray` from `class-validator`. Append two fields at the
end of `class CreatePostDto`:

```ts
  @ApiPropertyOptional({
    type: [String],
    description: 'Tag display names (upserted by slug); replace-all when provided.',
    maxItems: 10,
    example: ['Hạ Long', 'Cruises'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Related tour slugs (max 3, order = array order); replace-all when provided.',
    maxItems: 3,
    example: ['halong-heritage-cruise'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @Length(1, 120, { each: true })
  relatedTourSlugs?: string[];
```

- [ ] **Step 6: Extend `list-posts-query.dto.ts`**

Append one field at the end of `class ListPostsQueryDto`:

```ts
  /** Filter to posts carrying this tag slug. */
  @ApiPropertyOptional({ example: 'ha-long', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;
```

- [ ] **Step 7: Verify + commit**

Run: `pnpm nx run @tourism/api:typecheck`
Expected: green (DTOs are Swagger metadata; service wiring lands next task).

```bash
git add apps/api/src/modules/posts/dto
git commit -m "feat(api): post tag/author/related-tour DTOs + tag query + write fields"
```

### Task 3: Service — tag upsert, tour links, hydrated reads, tag lists (TDD)

**Files:**
- Modify: `apps/api/src/modules/posts/posts.service.ts`
- Modify: `apps/api/src/modules/posts/posts.service.spec.ts`
- Modify: `apps/api/src/modules/tours/tours.service.ts` (one new public method)
- Modify: `apps/api/src/modules/tours/tours.service.spec.ts` (tests for it)
- Modify: `apps/api/src/modules/posts/posts.module.ts` (import `ToursModule`)

**Interfaces:**
- Consumes: Prisma models from Task 1; `ToursService`/`TourWithStats` from
  `../tours/tours.service`; existing `slugify` from `../../common/slugify`.
- Produces (service types other tasks rely on):
  `PostTagFlat { slug: string; name: string }` ·
  `PostAuthorPublic { fullName: string | null; avatarUrl: string | null }` ·
  `PostListItem = PostWithMedia & { tags: PostTagFlat[]; author: PostAuthorPublic }` ·
  `PublicPostDetail = PostListItem & { relatedTours: TourWithStats[] }` ·
  `PaginatedPosts.items: PostListItem[]` ·
  `AdminPostDetail += tags: PostTagFlat[]; relatedTours: { slug; title; isPublished }[]` ·
  `PostsService.findPublicTags(): Promise<{ slug; name; count }[]>` ·
  `PostsService.findAdminTags(): Promise<{ slug; name; count }[]>` ·
  `ToursService.findSummariesByIds(ids: string[]): Promise<TourWithStats[]>`.

- [ ] **Step 1: Add `findSummariesByIds` to `tours.service.ts`**

Place it right after `findPublicBySlug` (public reads section):

```ts
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
    const withMedia = await this.media.attachToOwners(MediaOwnerType.TOUR, items);
    const enriched = await this.attachNextDeparture(await this.attachRatings(withMedia));
    const byId = new Map(enriched.map((t) => [t.id, t]));
    return ids
      .map((id) => byId.get(id))
      .filter((t): t is (typeof enriched)[number] => Boolean(t));
  }
```

- [ ] **Step 2: Write failing tests for it in `tours.service.spec.ts`**

Follow the file's existing harness (prisma/media stubs). Add a describe block:

```ts
describe('findSummariesByIds', () => {
  it('returns summaries in input order, dropping unpublished/missing ids', async () => {
    // Arrange: prisma.tour.findMany returns ONLY published matches, out of order.
    // (Adapt stub construction to this file's existing makePrisma/makeMedia helpers.)
    const rows = [
      { id: 'b', slug: 'tour-b', title: 'B' },
      { id: 'a', slug: 'tour-a', title: 'A' },
    ];
    // findMany stubbed to resolve `rows`; review.groupBy + tourDeparture.findMany → [].
    const svc = makeService({ tourFindMany: rows });

    const out = await svc.findSummariesByIds(['a', 'x', 'b']);

    expect(out.map((t) => t.id)).toEqual(['a', 'b']); // input order, 'x' dropped
    expect(out[0]).toHaveProperty('averageRating');
    expect(out[0]).toHaveProperty('nextDepartureDate');
  });

  it('short-circuits on an empty id list without querying', async () => {
    const svc = makeService({});
    await expect(svc.findSummariesByIds([])).resolves.toEqual([]);
  });
});
```

(`makeService` here means: construct the service exactly the way the file's other tests do —
reuse/extend its local helpers rather than inventing a parallel harness. The two assertions
above are the contract; the arrangement code adapts to the local stubs.)

Run: `pnpm nx test @tourism/api --testPathPatterns=tours.service`
Expected: FAIL (method missing) → then PASS after Step 1 lands (order the steps: write test,
see it fail, apply Step 1, see it pass).

- [ ] **Step 3: Wire `PostsModule` to `ToursModule`**

`apps/api/src/modules/posts/posts.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ToursModule } from '../tours/tours.module';
import { AdminPostsController } from './admin-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/** Editorial blog posts (P-Content). Public reads + admin CRUD; media via MediaModule (cover);
 * ToursModule supplies related-tour summaries (Tours does not import Posts — acyclic). */
@Module({
  imports: [MediaModule, ToursModule],
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```

- [ ] **Step 4: Write the failing posts-service tests**

In `posts.service.spec.ts`:

1. Extend `makePrisma`'s object with two more model stubs (same style as `post`):

```ts
    tour: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    postTag: {
      findMany: jest.fn().mockResolvedValue([]),
    },
```

(Spread `overrides` currently lands inside `post` — keep that behavior; add a second
parameter for non-post overrides if needed: change the signature to
`makePrisma(overrides = {}, extra: Record<string, unknown> = {})` and spread `...extra` at
the top level after the model stubs.)

2. Add a tours stub + a construction helper, and update EVERY existing
`new PostsService(prisma, media)` call in the file to use it (the constructor gains a third
argument this task):

```ts
import type { ToursService } from '../tours/tours.service';

/** ToursService stub — summaries resolve empty unless a test overrides. */
function makeTours(over: Record<string, unknown> = {}): ToursService {
  return {
    findSummariesByIds: jest.fn().mockResolvedValue([]),
    ...over,
  } as unknown as ToursService;
}

const makeSvc = (
  prisma = makePrisma(),
  media = makeMedia(),
  tours = makeTours(),
) => new PostsService(prisma, media, tours);
```

3. New describe blocks:

```ts
describe('tags + related tours (writes)', () => {
  it('create maps tag names to connectOrCreate-by-slug and collapses duplicates', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ create }), makeMedia(), makeTours());

    await svc.create(
      { title: 'T', content: 'c', tags: ['Hạ Long', 'ha long', 'Cruises'] } as CreatePostDto,
      AUTHOR,
    );

    const tagCreates = create.mock.calls[0][0].data.tags.create;
    expect(tagCreates).toHaveLength(2); // "Hạ Long" + "ha long" collapse to ha-long
    expect(tagCreates[0].tag.connectOrCreate.where).toEqual({ slug: 'ha-long' });
    expect(tagCreates[0].tag.connectOrCreate.create).toEqual({ slug: 'ha-long', name: 'Hạ Long' });
    expect(tagCreates[1].tag.connectOrCreate.where).toEqual({ slug: 'cruises' });
  });

  it('create rejects a symbol-only tag with 400 INVALID_TAG', async () => {
    const svc = makeSvc();
    await expect(
      svc.create({ title: 'T', content: 'c', tags: ['***'] } as CreatePostDto, AUTHOR),
    ).rejects.toMatchObject({ response: { code: 'INVALID_TAG' } });
  });

  it('create resolves related tour slugs to ordered connects', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const prisma = makePrisma({ create }, {
      tour: {
        findMany: jest.fn().mockResolvedValue([
          { id: 't2', slug: 'second' },
          { id: 't1', slug: 'first' },
        ]),
      },
    });
    const svc = makeSvc(prisma, makeMedia(), makeTours());

    await svc.create(
      { title: 'T', content: 'c', relatedTourSlugs: ['first', 'second'] } as CreatePostDto,
      AUTHOR,
    );

    const linkCreates = create.mock.calls[0][0].data.relatedTours.create;
    expect(linkCreates).toEqual([
      { order: 0, tour: { connect: { id: 't1' } } },
      { order: 1, tour: { connect: { id: 't2' } } },
    ]);
  });

  it('create rejects an unknown related tour slug with 400 RELATED_TOUR_NOT_FOUND', async () => {
    const prisma = makePrisma({}, { tour: { findMany: jest.fn().mockResolvedValue([]) } });
    const svc = makeSvc(prisma, makeMedia(), makeTours());
    await expect(
      svc.create(
        { title: 'T', content: 'c', relatedTourSlugs: ['ghost'] } as CreatePostDto,
        AUTHOR,
      ),
    ).rejects.toMatchObject({ response: { code: 'RELATED_TOUR_NOT_FOUND' } });
  });

  it('update leaves links untouched when fields are undefined, clears on []', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: '1', slug: 'p', title: 'T', status: PostStatus.DRAFT, publishedAt: null });
    const update = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', slug: 'p', ...data, tags: [], author: { id: 'u', fullName: null } }),
      );
    const svc = makeSvc(makePrisma({ findUnique, update }), makeMedia(), makeTours());

    await svc.update('p', { title: 'T2' });
    expect(update.mock.calls[0][0].data.tags).toBeUndefined();
    expect(update.mock.calls[0][0].data.relatedTours).toBeUndefined();

    await svc.update('p', { tags: [], relatedTourSlugs: [] });
    expect(update.mock.calls[1][0].data.tags).toEqual({ deleteMany: {} });
    expect(update.mock.calls[1][0].data.relatedTours).toEqual({ deleteMany: {} });
  });
});

describe('tags + author (reads)', () => {
  it('list filters by ?tag= and flattens tags + author with avatar', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '1',
        slug: 'p',
        tags: [{ tag: { slug: 'ha-long', name: 'Hạ Long' } }],
        author: { id: 'u1', fullName: 'Ana' },
      },
    ]);
    const media = makeMedia({
      attachToOwners: jest
        .fn()
        .mockImplementation((type: unknown, owners: { id: string }[]) =>
          Promise.resolve(
            owners.map((o) =>
              type === MediaOwnerType.USER
                ? { ...o, media: [{ url: 'https://cdn/avatar.jpg' }] }
                : { ...o, media: [] },
            ),
          ),
        ),
    });
    const svc = makeSvc(makePrisma({ findMany }), media, makeTours());

    const out = await svc.findPublicList({ tag: 'ha-long' } as ListPostsQueryDto);

    expect(findMany.mock.calls[0][0].where.tags).toEqual({ some: { tag: { slug: 'ha-long' } } });
    expect(out.items[0].tags).toEqual([{ slug: 'ha-long', name: 'Hạ Long' }]);
    expect(out.items[0].author).toEqual({ fullName: 'Ana', avatarUrl: 'https://cdn/avatar.jpg' });
  });

  it('findPublicBySlug returns published related-tour summaries in pick order', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'p',
      tags: [],
      author: { id: 'u1', fullName: null },
      relatedTours: [{ tourId: 't1' }, { tourId: 't2' }],
    });
    const tours = makeTours({
      findSummariesByIds: jest.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
    });
    const svc = makeSvc(makePrisma({ findFirst }), makeMedia(), tours);

    const out = await svc.findPublicBySlug('p');

    expect(tours.findSummariesByIds).toHaveBeenCalledWith(['t1', 't2']);
    expect(out.relatedTours.map((t: { id: string }) => t.id)).toEqual(['t1', 't2']);
  });

  it('findPublicTags returns only tags with published posts, with counts', async () => {
    const tagFindMany = jest.fn().mockResolvedValue([
      { slug: 'cruises', name: 'Cruises', _count: { posts: 2 } },
      { slug: 'drafty', name: 'Drafty', _count: { posts: 0 } },
    ]);
    const prisma = makePrisma({}, { postTag: { findMany: tagFindMany } });
    const svc = makeSvc(prisma, makeMedia(), makeTours());

    await expect(svc.findPublicTags()).resolves.toEqual([
      { slug: 'cruises', name: 'Cruises', count: 2 },
    ]);
    // Published-only count filter reached the query:
    const select = tagFindMany.mock.calls[0][0].select;
    expect(select._count.select.posts.where.post.status).toBe(PostStatus.PUBLISHED);
  });
});
```

Add the needed imports at the top of the spec (`ListPostsQueryDto` type import,
`MediaOwnerType` already imported).

Run: `pnpm nx test @tourism/api --testPathPatterns=posts.service`
Expected: FAIL (constructor arity + missing methods).

- [ ] **Step 5: Implement in `posts.service.ts`**

1. Imports: add `PostTag` to the `@prisma/client` import; add
   `import { ToursService, TourWithStats } from '../tours/tours.service';`.

2. Types — replace the current type block (`PostWithMedia`, `PaginatedPosts`,
   `AdminPostDetail`) with:

```ts
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
```

3. Constructor gains the tours service:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly tours: ToursService,
  ) {}
```

4. Class constants + helpers (place in the Internals section):

```ts
  /** DB column cap for `PostTag.slug`/`name` (`@db.VarChar(60)`). */
  private static readonly TAG_MAX = 60;

  /** Shared read include: tag joins + the author's public display fields. */
  private static readonly READ_INCLUDE = {
    tags: { include: { tag: true } },
    author: { select: { id: true, fullName: true } },
  } satisfies Prisma.PostInclude;

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
```

5. `create()` — resolve links up front, nested-write, hydrate the response:

```ts
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
```

6. `update()` — add before the try (after the existing `data` build):

```ts
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
```

and change the update call + return to:

```ts
      const updated = await this.prisma.post.update({
        where: { slug },
        data,
        include: PostsService.READ_INCLUDE,
      });
      return this.hydrate(updated);
```

(Return types: `create`/`update` now `Promise<PostListItem>`.)

7. `list()` — add the tag filter to `where`, include + hydrate:

```ts
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
```

and replace the `findMany` include + the media attach with:

```ts
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
```

8. `findPublicBySlug()` — replace with:

```ts
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
```

9. `findDetailForAdmin()` — extend the include + mapping:

```ts
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
```

10. Tag list reads (new methods, Public/Admin reads sections):

```ts
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

  /** All tags with their total post count (drafts included) — admin form suggestions. */
  async findAdminTags(): Promise<{ slug: string; name: string; count: number }[]> {
    const tags = await this.prisma.postTag.findMany({
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, _count: { select: { posts: true } } },
    });
    return tags.map((t) => ({ slug: t.slug, name: t.name, count: t._count.posts }));
  }
```

- [ ] **Step 6: Run the tests**

Run: `pnpm nx test @tourism/api --testPathPatterns="posts.service|tours.service"`
Expected: PASS (all pre-existing + new). Then the full suite:
`pnpm nx test @tourism/api` — expected 291 + new (≈302); record the exact count.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/posts apps/api/src/modules/tours
git commit -m "feat(api): post tags + related tours + public author in service reads/writes"
```

### Task 4: Controllers — tag endpoints + detail DTO

**Files:**
- Modify: `apps/api/src/modules/posts/posts.controller.ts`
- Modify: `apps/api/src/modules/posts/admin-posts.controller.ts`

**Interfaces:**
- Consumes: `findPublicTags`/`findAdminTags`/`PublicPostDetail` from Task 3;
  `PostTagWithCountDto` (Task 2), `PostDetailDto` (Task 2).
- Produces: `GET /posts/tags` (public) · `GET /admin/posts/tags` (admin) — both BEFORE their
  `:slug` routes; public detail documented as `PostDetailDto`.

- [ ] **Step 1: Public controller**

In `posts.controller.ts`: add imports for `PostTagWithCountDto` and `PostDetailDto`; change
the `detail` return type import (`PublicPostDetail` from the service) and INSERT the tags
route BETWEEN `list` and `detail` (route order is load-bearing — `tags` must not be captured
by `:slug`):

```ts
  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'List tags in use by published posts' })
  @ApiOkResponse({ type: [PostTagWithCountDto] })
  tags(): Promise<{ slug: string; name: string; count: number }[]> {
    return this.postsService.findPublicTags();
  }
```

and update `detail`:

```ts
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get one published post by slug (with related tours)' })
  @ApiOkResponse({ type: PostDetailDto })
  @ApiResponse({ status: 404, description: 'Not found or not published' })
  detail(@Param('slug') slug: string): Promise<PublicPostDetail> {
    return this.postsService.findPublicBySlug(slug);
  }
```

(Drop the now-unused `Post` prisma type import if nothing else uses it.)

- [ ] **Step 2: Admin controller**

In `admin-posts.controller.ts`: import `PostTagWithCountDto` and insert BETWEEN `list` and
`detail`:

```ts
  @Get('tags')
  @ApiOperation({ summary: 'Admin: list all tags with post counts (form suggestions)' })
  @ApiOkResponse({ type: [PostTagWithCountDto] })
  tags(): Promise<{ slug: string; name: string; count: number }[]> {
    return this.postsService.findAdminTags();
  }
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/api`
Expected: green.

```bash
git add apps/api/src/modules/posts
git commit -m "feat(api): public + admin post-tag endpoints, detail returns related tours"
```

### Task 5: Regen `@tourism/core` types + consumer builds

**Files:**
- Modify: `libs/shared/core/src/lib/api/schema.ts` (generated)

- [ ] **Step 1: Regen** (the `/regen-types` routine)

```bash
# from repo root — boot the API with the local .env
pnpm nx run @tourism/api:serve &
# poll until the spec answers (retry up to ~60s)
curl -sf http://localhost:3000/api/docs-json -o /dev/null
pnpm nx run @tourism/core:api-types
# kill the port-3000 process tree (Windows)
netstat -ano | findstr :3000   # → PID
taskkill //PID <pid> //T //F
```

- [ ] **Step 2: Fix the one web test fixture the stricter type forces**

`PostDto` now REQUIRES `tags` + `author`, so web's `apps/web/src/lib/blog/post-vm.spec.ts`
fixture (`const base: PostDto = { … }`) no longer typechecks. Add two fields to `base`
(runtime behavior unchanged — `toPostSummary` ignores them):

```ts
  tags: [],
  author: { fullName: null, avatarUrl: null },
```

This is the ONLY web touch this wave (test-fixture-only, forced by the schema types).

- [ ] **Step 3: Verify consumers build + web tests still pass**

Run: `pnpm nx run-many -t build -p @tourism/web @tourism/admin @tourism/core`
then: `pnpm nx test @tourism/web`
Expected: green; web stays 148 tests.

- [ ] **Step 4: Commit (schema regen + fixture fix)**

```bash
git add libs/shared/core/src/lib/api/schema.ts apps/web/src/lib/blog/post-vm.spec.ts
git commit -m "chore(core): regen api types - post tags, author, related tours"
```

### Task 6: Slice-1 review + gate + MIGRATION GO/NO-GO + merge

- [ ] **Step 1: `ecc:code-reviewer` whole-slice review** (BE slice rule) — review range =
  slice start..HEAD. Fix CRITICAL/HIGH before proceeding.

- [ ] **Step 2: Full gate**

Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`
Expected: green.

- [ ] **Step 3: ⛔ STOP — ask the user for migration go/no-go**

Present: migration SQL path + the 3 tables it creates, and that merge (→ Render deploy)
must NOT happen before the migration is applied (new includes would query missing tables).
On GO:

```bash
cd apps/api && pnpm exec prisma migrate deploy
```

Expected: `add_post_tags_and_post_tours` applied to the live Supabase DB.

- [ ] **Step 4: Merge (pre-authorized once gate green AND migration applied)**

```bash
git checkout main && git pull && git merge --no-ff feat/blog-v2-content-model -m "Merge feat/blog-v2-content-model: blog v2 wave 1 slice 1 - tags/tour-links/author BE" && git push && git branch -d feat/blog-v2-content-model
```

---

## Slice 2 — admin authoring UI (branch `feat/blog-v2-admin-taxonomy`)

### Task 7: Form schema + actions accept tags/relatedTourSlugs (TDD)

**Files:**
- Modify: `apps/admin/src/lib/posts/schema.ts`
- Modify: `apps/admin/src/lib/posts/actions.ts`
- Test: `apps/admin/src/lib/posts/schema.spec.ts`

**Interfaces:**
- Consumes: hidden inputs `name="tags"` / `name="relatedTourSlugs"` (JSON `string[]`,
  Task 8 renders them).
- Produces: `postSchema += tags?: string[] (≤10, each 1–60) · relatedTourSlugs?: string[]
  (≤3)`; `toPostPayload` forwards both when defined (empty array = clear, matches the API's
  replace-all); `parseJsonStringArray(raw): string[] | undefined` exported from schema.ts.

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull && git checkout -b feat/blog-v2-admin-taxonomy
```

- [ ] **Step 2: Write the failing tests** — append to `schema.spec.ts`:

```ts
import { parseJsonStringArray, postSchema, toPostPayload } from './schema';

describe('tags + related tours fields', () => {
  it('accepts arrays within caps and forwards them in the payload', () => {
    const parsed = postSchema.safeParse({
      title: 'T',
      content: 'c',
      tags: ['Hạ Long', 'Cruises'],
      relatedTourSlugs: ['halong-heritage-cruise'],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const payload = toPostPayload(parsed.data);
    expect(payload.tags).toEqual(['Hạ Long', 'Cruises']);
    expect(payload.relatedTourSlugs).toEqual(['halong-heritage-cruise']);
  });

  it('forwards empty arrays (replace-all clear) but omits undefined', () => {
    const parsed = postSchema.safeParse({ title: 'T', content: 'c', tags: [] });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const payload = toPostPayload(parsed.data);
    expect(payload.tags).toEqual([]);
    expect('relatedTourSlugs' in payload).toBe(false);
  });

  it('rejects over-cap arrays', () => {
    expect(
      postSchema.safeParse({
        title: 'T',
        content: 'c',
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
      }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({
        title: 'T',
        content: 'c',
        relatedTourSlugs: ['a', 'b', 'c', 'd'],
      }).success,
    ).toBe(false);
  });
});

describe('parseJsonStringArray', () => {
  it('parses a JSON string array', () => {
    expect(parseJsonStringArray('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns undefined for null, empty, malformed, or non-string-array JSON', () => {
    expect(parseJsonStringArray(null)).toBeUndefined();
    expect(parseJsonStringArray('')).toBeUndefined();
    expect(parseJsonStringArray('{oops')).toBeUndefined();
    expect(parseJsonStringArray('[1,2]')).toBeUndefined();
  });
});
```

Run: `pnpm nx test @tourism/admin --testPathPatterns=lib/posts/schema`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `schema.ts` — extend the zod object (after `status`):

```ts
  tags: z
    .array(z.string().trim().min(1, 'Tags need at least one character').max(60, 'Tags max 60 characters'))
    .max(10, 'At most 10 tags')
    .optional(),
  relatedTourSlugs: z.array(z.string().trim().min(1).max(120)).max(3, 'At most 3 related tours').optional(),
```

extend `toPostPayload` (before the return):

```ts
  if (input.tags !== undefined) out.tags = input.tags;
  if (input.relatedTourSlugs !== undefined) out.relatedTourSlugs = input.relatedTourSlugs;
```

and add the parser export:

```ts
/** JSON `string[]` from a hidden form input; absent/blank/malformed → undefined (unsent). */
export function parseJsonStringArray(raw: FormDataEntryValue | null): string[] | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')
      ? (parsed as string[])
      : undefined;
  } catch {
    return undefined;
  }
}
```

In `actions.ts` — `parsePostForm` gains the two fields (import `parseJsonStringArray`):

```ts
    tags: parseJsonStringArray(formData.get('tags')),
    relatedTourSlugs: parseJsonStringArray(formData.get('relatedTourSlugs')),
```

- [ ] **Step 4: Run tests** — `pnpm nx test @tourism/admin --testPathPatterns=lib/posts/schema`
Expected: PASS. Also `pnpm nx test @tourism/admin` (baseline 134 + 5 new ≈ 139; record).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/posts/schema.ts apps/admin/src/lib/posts/schema.spec.ts apps/admin/src/lib/posts/actions.ts
git commit -m "feat(admin): post form schema/actions accept tags + related tour slugs"
```

### Task 8: TagsInput + RelatedToursPicker + form section + data fetchers

**Files:**
- Create: `apps/admin/src/components/posts/tags-input.tsx`
- Create: `apps/admin/src/components/posts/related-tours-picker.tsx`
- Modify: `apps/admin/src/components/posts/post-form.tsx`
- Modify: `apps/admin/src/lib/posts/data.ts`
- Modify: `apps/admin/src/app/(admin)/posts/new/page.tsx`
- Modify: `apps/admin/src/app/(admin)/posts/[slug]/edit/page.tsx`

**Interfaces:**
- Consumes: `parseJsonStringArray`-compatible hidden inputs (Task 7 reads them);
  `GET /api/v1/admin/posts/tags` + `listTours` (existing, `lib/tours/data.ts`).
- Produces: `<TagsInput value onChange suggestions max=10 />` ·
  `<RelatedToursPicker value onChange options max=3 />` ·
  `PostForm` props += `tagSuggestions?: PostTagOption[]` ·
  `tourOptions?: { slug: string; title: string }[]` ·
  `listPostTags(): Promise<PostTagOption[]>` in data.ts.

- [ ] **Step 1: data fetcher** — append to `apps/admin/src/lib/posts/data.ts`:

```ts
export type PostTagOption = components['schemas']['PostTagWithCountDto'];

/**
 * All tags with post counts (`GET /admin/posts/tags`) — form suggestions. Bare-array
 * endpoints come back wrapped in the `{ data }` envelope at runtime → unwrap.
 */
export async function listPostTags(): Promise<PostTagOption[]> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/posts/tags');
  return (data as unknown as { data: PostTagOption[] }).data ?? [];
}
```

- [ ] **Step 2: TagsInput component**

Create `apps/admin/src/components/posts/tags-input.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Badge, Button, Input } from '@tourism/ui';

export interface TagsInputProps {
  /** Current tag display names, in order. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Existing tags to suggest (admin tag list). */
  suggestions: { slug: string; name: string }[];
  max?: number;
}

/** Case-insensitive membership (display names may differ only by casing). */
const has = (list: string[], name: string) =>
  list.some((t) => t.toLowerCase() === name.toLowerCase());

/**
 * Free-form tag editor: removable chips + a text input. Typing filters the existing-tag
 * suggestions (click to add); Enter adds the raw text as a new tag. Caps at `max`.
 */
export function TagsInput({ value, onChange, suggestions, max = 10 }: TagsInputProps) {
  const [draft, setDraft] = useState('');
  const full = value.length >= max;

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !has(value, s.name))
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || full || has(value, trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button
                type="button"
                aria-label={`Remove tag ${name}`}
                className="hover:text-destructive inline-flex cursor-pointer items-center rounded-sm"
                onClick={() => onChange(value.filter((t) => t !== name))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        disabled={full}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder={full ? `Maximum ${max} tags` : 'Type a topic and press Enter…'}
        aria-label="Add a tag"
      />

      {!full && matches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Existing:</span>
          {matches.map((s) => (
            <Button
              key={s.slug}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 rounded-full px-2.5 text-xs"
              onClick={() => add(s.name)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TagsInput;
```

- [ ] **Step 3: RelatedToursPicker component**

Create `apps/admin/src/components/posts/related-tours-picker.tsx` (the established
DropdownMenu + checkbox facet pattern — see tours-table's category filter):

```tsx
'use client';

import { ChevronDown, X } from 'lucide-react';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@tourism/ui';

export interface RelatedToursPickerProps {
  /** Selected tour slugs, in pick order. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Published tours to offer. */
  options: { slug: string; title: string }[];
  max?: number;
}

/**
 * Hand-pick up to `max` tours for a post ("tours in this story"). Checkbox dropdown (the
 * admin facet pattern) + ordered chips; order = pick order (drives the article's display).
 */
export function RelatedToursPicker({ value, onChange, options, max = 3 }: RelatedToursPickerProps) {
  const full = value.length >= max;
  const titleBySlug = new Map(options.map((o) => [o.slug, o.title]));

  const toggle = (slug: string, checked: boolean) => {
    if (checked && !value.includes(slug) && !full) onChange([...value, slug]);
    if (!checked) onChange(value.filter((s) => s !== slug));
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" className="w-full max-w-xs justify-between" />}
        >
          <span className="truncate">
            {value.length === 0 ? 'Select tours…' : `${value.length} of ${max} selected`}
          </span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Published tours</DropdownMenuLabel>
            {options.map((o) => {
              const checked = value.includes(o.slug);
              return (
                <DropdownMenuCheckboxItem
                  key={o.slug}
                  checked={checked}
                  disabled={!checked && full}
                  onCheckedChange={(c) => toggle(o.slug, c === true)}
                  closeOnClick={false}
                >
                  {o.title}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {value.map((slug, i) => (
            <li key={slug} className="flex items-center gap-2">
              <Badge variant="outline" className="tabular-nums">{i + 1}</Badge>
              <span className="truncate text-sm">{titleBySlug.get(slug) ?? slug}</span>
              <button
                type="button"
                aria-label={`Remove ${titleBySlug.get(slug) ?? slug}`}
                className="text-muted-foreground hover:text-destructive inline-flex cursor-pointer items-center"
                onClick={() => onChange(value.filter((s) => s !== slug))}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export default RelatedToursPicker;
```

- [ ] **Step 4: Form section**

In `post-form.tsx`:

1. Props + imports:

```tsx
import { TagsInput } from './tags-input';
import { RelatedToursPicker } from './related-tours-picker';
import type { PostTagOption } from '../../lib/posts/data';
```

```tsx
interface PostFormProps {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  post?: Post & { relatedTours?: { slug: string; title: string; isPublished: boolean }[] };
  submitLabel: string;
  /** Existing tags for suggestions (admin tag list). */
  tagSuggestions?: PostTagOption[];
  /** Published tours offered by the related-tours picker. */
  tourOptions?: { slug: string; title: string }[];
}
```

(function signature gains `tagSuggestions = []`, `tourOptions = []`.)

2. State, after the `media` state (deploy-lag guards on both seeds):

```tsx
  const [tags, setTags] = useState<string[]>((post?.tags ?? []).map((t) => t.name));
  const [relatedSlugs, setRelatedSlugs] = useState<string[]>(
    (post?.relatedTours ?? []).map((t) => t.slug),
  );
```

3. New section between Content and Publishing (after the Content `</FieldSet>` +
   a `<Separator className="my-8" />`):

```tsx
      {/* Topics & related tours */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Topics &amp; tours</FieldLegend>
          <FieldDescription>
            Tags group stories on the journal; related tours appear under the article.
          </FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.tags)}>
            <FieldLabel>Tags</FieldLabel>
            <TagsInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            <FieldDescription>
              Up to 10 — pick existing topics or type a new one and press Enter.
            </FieldDescription>
            {errors.tags ? <FieldError>{errors.tags}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.relatedTourSlugs)}>
            <FieldLabel>Related tours</FieldLabel>
            <RelatedToursPicker value={relatedSlugs} onChange={setRelatedSlugs} options={tourOptions} />
            <FieldDescription>Up to 3 tours to feature under this story.</FieldDescription>
            {errors.relatedTourSlugs ? <FieldError>{errors.relatedTourSlugs}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />
```

4. Hidden inputs next to the existing `media` hidden input:

```tsx
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <input type="hidden" name="relatedTourSlugs" value={JSON.stringify(relatedSlugs)} />
```

- [ ] **Step 5: Pages fetch suggestions/options**

`apps/admin/src/app/(admin)/posts/new/page.tsx` — make the component async and fetch:

```tsx
import { listPostTags } from '../../../../lib/posts/data';
import { listTours } from '../../../../lib/tours/data';
```

```tsx
export default async function NewPostPage() {
  const [tagSuggestions, tourOptions] = await Promise.all([
    listPostTags().catch(() => []),
    listTours({ isPublished: true, pageSize: 100 })
      .then((r) => r.data.map((t) => ({ slug: t.slug, title: t.title })))
      .catch(() => []),
  ]);
```

and pass `tagSuggestions={tagSuggestions} tourOptions={tourOptions}` to `<PostForm …>`.

`apps/admin/src/app/(admin)/posts/[slug]/edit/page.tsx` — same two fetches added to its
existing data loading (`Promise.all` with the current `getPost`), same two props passed.
`getPost` returns `AdminPostDetailDto`, which now carries `tags` + `relatedTours` — the form
seeds from them (deploy-lag-guarded with `?? []`).

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint test build -p @tourism/admin`
Expected: green, no new test regressions.

```bash
git add apps/admin/src/components/posts apps/admin/src/lib/posts/data.ts "apps/admin/src/app/(admin)/posts/new/page.tsx" "apps/admin/src/app/(admin)/posts/[slug]/edit/page.tsx"
git commit -m "feat(admin): tags editor + related-tours picker on the post form"
```

### Task 9: Detail rail + list column surfacing

**Files:**
- Modify: `apps/admin/src/app/(admin)/posts/[slug]/page.tsx`
- Modify: `apps/admin/src/components/posts/posts-table.tsx`

**Interfaces:**
- Consumes: `post.tags` / `post.relatedTours` on `AdminPostDetailDto` + `PostDto.tags`
  (regen'd schema); `LinkedToursCard` (`components/crud/linked-tours-card.tsx`,
  props `{ tours: { slug; title; isPublished; isPrimary? }[]; title; emptyText }`).

- [ ] **Step 1: Detail page**

In `posts/[slug]/page.tsx`:

1. Import: `import { LinkedToursCard } from '../../../../components/crud/linked-tours-card';`
2. In the Details `<dl>`, after the `Slug` row, add a Tags row (only when tagged):

```tsx
                {(post.tags ?? []).length > 0 ? (
                  <Row
                    label="Tags"
                    value={
                      <span className="flex flex-wrap justify-end gap-1">
                        {(post.tags ?? []).map((t) => (
                          <Badge key={t.slug} variant="outline" className="text-xs">
                            {t.name}
                          </Badge>
                        ))}
                      </span>
                    }
                  />
                ) : null}
```

3. In the rail column (below the Details card, above the outline card), add:

```tsx
          <LinkedToursCard
            tours={post.relatedTours ?? []}
            title="Related tours"
            emptyText="No tours linked — pick up to 3 from Edit."
          />
```

- [ ] **Step 2: List column**

In `posts-table.tsx`, add a hideable Tags column to the column defs, positioned right after
the status column (adapt to the local `ColumnDef` array; `Badge` is already imported or add
it to the `@tourism/ui` import):

```tsx
  {
    id: 'tags',
    header: 'Tags',
    meta: { label: 'Tags' },
    cell: ({ row }) => {
      const tags = row.original.tags ?? [];
      if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="flex flex-wrap items-center gap-1">
          {tags.slice(0, 2).map((t) => (
            <Badge key={t.slug} variant="outline" className="text-xs">
              {t.name}
            </Badge>
          ))}
          {tags.length > 2 ? (
            <span className="text-muted-foreground text-xs">+{tags.length - 2}</span>
          ) : null}
        </span>
      );
    },
  },
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint test build -p @tourism/admin`
Expected: green.

```bash
git add "apps/admin/src/app/(admin)/posts/[slug]/page.tsx" apps/admin/src/components/posts/posts-table.tsx
git commit -m "feat(admin): surface post tags + related tours on detail rail and list"
```

### Task 10: Slice-2 gate + merge + docs

- [ ] **Step 1: Full gate**

Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile --base=main`
Expected: green (api/web from cache, admin rebuilt).

- [ ] **Step 2: Merge (pre-authorized on green)**

```bash
git checkout main && git pull && git merge --no-ff feat/blog-v2-admin-taxonomy -m "Merge feat/blog-v2-admin-taxonomy: blog v2 wave 1 slice 2 - admin tags/tours authoring" && git push && git branch -d feat/blog-v2-admin-taxonomy
```

- [ ] **Step 3: Docs + memory** — mark Wave 1 done in this plan's STATUS + the roadmap
  STATUS (`docs/07-plans/2026-07-03-blog-v2-roadmap.md`), update memory (standing workflow).

---

## STATUS

- [x] Slice 1 (Tasks 1-6): BE content model — **DONE**, merged `83d0151` (2026-07-03).
  Migration `20260703120425_add_post_tags_and_post_tours` **APPLIED to live Supabase**
  (user GO). api 301 tests. ecc APPROVE-WITH-NOTES.
- [x] Slice 2 (Tasks 7-10): admin authoring UI — **DONE**, merged `2f2193e` (2026-07-03).
  admin 139 tests. All task reviews approved.

**WAVE 1 COMPLETE.**

### Fast-follows (non-blocking, from ecc review)

1. **Tag-race 409 message** — two concurrent saves creating the same new tag: the loser's
   P2002 (from `post_tags_slug_key`) maps to the post-slug conflict message. Self-healing on
   retry; fix by branching on `err.meta?.target` when convenient.
2. **Stale controller return types** — admin posts `create`/`update` still typed
   `Promise<PostWithMedia>` (runtime returns the superset `PostListItem`); tighten when next
   touching the controller.
3. `prisma format` pass on schema.prisma (alignment nit from Task 1 review).
