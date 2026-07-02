# Admin Posts enrichment (Wave 1) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post cover image end-to-end (BE `POST_COVER` + media on all Post reads + admin upload/display) plus derived content facts (reading time, outline) and the author's avatar — per spec `docs/06-specs/2026-07-02-admin-posts-enrichment-design.md` (Wave 1 of the enrichment roadmap).

**Architecture:** 3 slices, one branch each. Slice 1 wires Posts into the existing polymorphic media pipeline (no schema change — `MediaOwnerType.POST` already exists) and resolves the author avatar via the user-avatar pattern. Slice 2 makes `MediaField` hero-only-capable and adds the Cover form section, detail Cover card, list thumbnail. Slice 3 is FE-only pure-logic + rail rendering.

**Tech Stack:** NestJS 11 + Prisma + Cloudinary signed uploads (api) · Next.js 16 admin · `@tourism/ui` · jest.

## Global Constraints

- **Design consistency is STRICT** (memory `admin-ui-design-consistency`): reuse `MediaField`, `DestinationMediaView`, `ImageLightbox`, `Avatar`/`AvatarImage`/`AvatarFallback` — no new bespoke components for jobs these already do.
- **Deploy-lag guards required** (Render deploys slower than Vercel): admin FE must guard `post.media ?? []` and `author.avatarUrl ?? null` — never assume the new BE fields exist.
- Public reads gain `media[]` but the public posts controller code itself must not change (service-level attach only); author data stays admin-only.
- No hex colors; app-internal imports relative; Base UI `render` prop conventions; Conventional Commits, no AI attribution.
- Each slice: gate green (lint + test + build via Nx; NOTE admin/web have NO `typecheck` target — `build` is the TS gate). Slice 1 → `ecc:code-reviewer` before merge. Merging to `main` after a green slice is pre-authorized by the user (they review on the deploy); pause only if a reviewer finds CRITICAL/HIGH issues.

---

# Slice 1 — BE: POST_COVER + media on Post reads + author avatar

Branch off `main`: `git checkout -b feat/admin-posts-cover-be`

### Task 1: Uploads — `POST_COVER` purpose (TDD)

**Files:**
- Modify: `apps/api/src/modules/uploads/dto/create-signed-upload-url.dto.ts` (the `UploadPurpose` enum, ~line 12)
- Modify: `apps/api/src/modules/uploads/uploads.service.ts` (`resourceTypeForPurpose` ~line 106, `folderForPurpose` ~line 120)
- Test: `apps/api/src/modules/uploads/uploads.service.spec.ts`

**Interfaces:**
- Produces: `UploadPurpose.POST_COVER` — image resource, folder `<root>/posts/cover`. Consumed by the admin FE in Task 4 as the string `'POST_COVER'`.

- [ ] **Step 1: Write the failing test** — append inside the existing `describe` in `uploads.service.spec.ts`, using the file's existing helpers (`body(...)` builder and however the service instance is constructed in sibling tests — mirror the `DESTINATION_GALLERY` case around line 69):

```ts
  it('signs a POST_COVER upload into the posts/cover folder', async () => {
    // Mirror the DESTINATION_GALLERY test's service construction exactly.
    const res = await service.createSignedUploadUrl(
      body({ purpose: UploadPurpose.POST_COVER, filename: 'cover.jpg' }),
    );
    expect(res.folder).toMatch(/posts\/cover$/);
    expect(res.resourceType).toBe('image');
  });
```

(Adapt only the construction line to the file's local pattern; assertions stay as written.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/api`
Expected: the new test FAILS (TS error `POST_COVER` does not exist / or switch falls through) — everything else passes.

- [ ] **Step 3: Implement** — in the DTO enum add (mirroring the existing entry format):

```ts
  POST_COVER = 'POST_COVER',
```

In `uploads.service.ts` add `UploadPurpose.POST_COVER` to the image branch of `resourceTypeForPurpose` (next to `USER_AVATAR`), and to `folderForPurpose`:

```ts
      case UploadPurpose.POST_COVER:
        return `${this.rootFolder}/posts/cover`;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/uploads
git commit -m "feat(api): POST_COVER upload purpose"
```

### Task 2: Posts service/DTO/controller — media + author avatar (TDD)

**Files:**
- Modify: `apps/api/src/modules/posts/posts.module.ts` (import `MediaModule`)
- Modify: `apps/api/src/modules/posts/posts.service.ts`
- Modify: `apps/api/src/modules/posts/dto/post.dto.ts` (+`media`)
- Modify: `apps/api/src/modules/posts/dto/admin-post-detail.dto.ts` (+`avatarUrl`)
- Modify: `apps/api/src/modules/posts/admin-posts.controller.ts` (+`PUT :slug/media`)
- Test: `apps/api/src/modules/posts/posts.service.spec.ts`

**Interfaces:**
- Consumes: `MediaService` (`syncAssets(tx, ownerType, ownerId, assets)`, `deleteForOwner(tx, ownerType, ownerId)`, `attachToOwner(ownerType, owner)`, `attachToOwners(ownerType, owners)`), `SetMediaDto`/`MediaInputDto`/`MediaItemDto` from `../media/dto/…`, `MediaOwnerType` from `@prisma/client`.
- Produces: `PostWithMedia = Post & { media: MediaItemDto[] }`; `AdminPostDetail = PostWithMedia & { author: { fullName: string | null; email: string; avatarUrl: string | null } }`; `PostsService.setMedia(slug, media): Promise<MediaItemDto[]>`; route `PUT /admin/posts/:slug/media`. Task 3 regenerates FE types from these.

- [ ] **Step 1: Update the spec harness** — in `posts.service.spec.ts`: (a) `makePrisma` gains a `$transaction` that runs the callback against itself; (b) add a `makeMedia` stub (mirrors `destinations.service.spec.ts:35-43`); (c) every `new PostsService(makePrisma(...))` becomes `new PostsService(makePrisma(...), makeMedia())`:

```ts
import type { MediaService } from '../media/media.service';
import { MediaOwnerType } from '@prisma/client';

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  const p: Record<string, unknown> = {
    post: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides,
    },
  };
  p.$transaction = jest
    .fn()
    .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return p as unknown as PrismaService;
}

/** MediaService stub — attach passes `media: []` through; writes are no-ops. */
function makeMedia(over: Record<string, unknown> = {}): MediaService {
  return {
    syncAssets: jest.fn().mockResolvedValue(undefined),
    deleteForOwner: jest.fn().mockResolvedValue(undefined),
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: object) => Promise.resolve({ ...owner, media: [] })),
    attachToOwners: jest
      .fn()
      .mockImplementation((_t: unknown, owners: object[]) =>
        Promise.resolve(owners.map((o) => ({ ...o, media: [] }))),
      ),
    ...over,
  } as unknown as MediaService;
}
```

Also update the two Task-1-era detail tests (previous wave): the `findUnique` expectation gains `id: true` in the author select, and the author equality gains `avatarUrl: null`:

```ts
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: 'x' },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
    expect(res.author).toEqual({ fullName: 'Ana Admin', email: 'ana@nexora.travel', avatarUrl: null });
```

(That existing test's `findUnique` mock must now also return `author.id`, e.g. `author: { id: 'u1', fullName: 'Ana Admin', email: 'ana@nexora.travel' }`.)

- [ ] **Step 2: Add the new failing tests** — append inside the `describe`:

```ts
  it('list attaches media to every row', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const count = jest.fn().mockResolvedValue(2);
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findMany, count }), media);

    const res = await svc.findAll({});

    expect(media.attachToOwners).toHaveBeenCalledWith(MediaOwnerType.POST, [
      { id: 'p1' },
      { id: 'p2' },
    ]);
    expect(res.items[0].media).toEqual([]);
  });

  it('findPublicBySlug attaches media', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findFirst }), media);

    const res = await svc.findPublicBySlug('x');

    expect(media.attachToOwner).toHaveBeenCalledWith(MediaOwnerType.POST, { id: 'p1', slug: 'x' });
    expect(res.media).toEqual([]);
  });

  it('findDetailForAdmin resolves the author avatar url', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'p1',
      slug: 'x',
      author: { id: 'u1', fullName: 'Ana', email: 'a@x.com' },
    });
    const media = makeMedia({
      attachToOwner: jest
        .fn()
        .mockImplementation((type: MediaOwnerType, owner: { id: string }) =>
          Promise.resolve(
            type === MediaOwnerType.USER
              ? { ...owner, media: [{ url: 'https://cdn/avatar.jpg', role: 'avatar' }] }
              : { ...owner, media: [] },
          ),
        ),
    });
    const svc = new PostsService(makePrisma({ findUnique }), media);

    const res = await svc.findDetailForAdmin('x');

    expect(res.author.avatarUrl).toBe('https://cdn/avatar.jpg');
    expect(res.media).toEqual([]);
  });

  it('setMedia syncs the replace-all set and returns the new media', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findUnique }), media);

    const res = await svc.setMedia('x', []);

    expect(media.syncAssets).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.POST, 'p1', []);
    expect(res).toEqual([]);
  });

  it('setMedia throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }), makeMedia());
    await expect(svc.setMedia('nope', [])).rejects.toThrow(NotFoundException);
  });

  it('remove deletes the post media in the same transaction', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const del = jest.fn().mockResolvedValue({ id: 'p1', slug: 'x' });
    const media = makeMedia();
    const svc = new PostsService(makePrisma({ findUnique, delete: del }), media);

    await svc.remove('x');

    expect(media.deleteForOwner).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.POST, 'p1');
    expect(del).toHaveBeenCalledWith({ where: { slug: 'x' } });
  });
```

- [ ] **Step 3: Run to verify the new tests fail**

Run: `pnpm nx test @tourism/api`
Expected: new tests FAIL (constructor arity / missing methods); harness-updated old tests may fail on the changed expectations too — that's the red state.

- [ ] **Step 4: Implement the module + service.** `posts.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminPostsController } from './admin-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/** Editorial blog posts (P-Content). Public reads + admin CRUD; media via MediaModule (cover). */
@Module({
  imports: [MediaModule],
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```

`posts.service.ts` — imports gain `MediaOwnerType` (from `@prisma/client`), `MediaService`, `MediaInputDto`, `MediaItemDto`; constructor gains `private readonly media: MediaService`. Types:

```ts
/** `Post` + its attached media set (cover lives at role `hero`). */
export type PostWithMedia = Post & { media: MediaItemDto[] };

/** Pagination envelope; `TransformInterceptor` hoists `meta` to the top level. */
export interface PaginatedPosts {
  items: PostWithMedia[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** `PostWithMedia` + the author's display fields — the admin detail read. */
export type AdminPostDetail = PostWithMedia & {
  author: { fullName: string | null; email: string; avatarUrl: string | null };
};
```

Method changes (replace the existing bodies):

```ts
  async findPublicBySlug(slug: string): Promise<PostWithMedia> {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED, publishedAt: { lte: new Date() } },
    });
    if (!post) throw this.notFound(slug);
    return this.media.attachToOwner(MediaOwnerType.POST, post);
  }

  /** Admin detail: post + media + the author's name/email/avatar. Public reads stay author-free. */
  async findDetailForAdmin(slug: string): Promise<AdminPostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
    if (!post) throw this.notFound(slug);
    const { author, ...row } = post;
    const withMedia = await this.media.attachToOwner(MediaOwnerType.POST, row);
    // A USER owner has at most one media asset (the avatar) → first url, or null.
    const authorWithAvatar = await this.media.attachToOwner(MediaOwnerType.USER, { id: author.id });
    return {
      ...withMedia,
      author: {
        fullName: author.fullName,
        email: author.email,
        avatarUrl: authorWithAvatar.media[0]?.url ?? null,
      },
    };
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
```

And in the private `list(...)`, after the `Promise.all`, attach the batch before returning:

```ts
    const withMedia = await this.media.attachToOwners(MediaOwnerType.POST, items);

    return {
      items: withMedia,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
```

`create`/`update` return the fresh row with an attach so the response honors `PostDto.media` (empty on create):

```ts
      // (end of create, replacing `return post;`)
      return this.media.attachToOwner(MediaOwnerType.POST, post);
```

```ts
      // (in update's try, replacing `return await this.prisma.post.update(...)`)
      const updated = await this.prisma.post.update({ where: { slug }, data });
      return this.media.attachToOwner(MediaOwnerType.POST, updated);
```

(`create`/`update` signatures become `Promise<PostWithMedia>`; `findAll`/`findPublicList` types already flow through `PaginatedPosts`.)

- [ ] **Step 5: DTOs.** `post.dto.ts` — add import + field:

```ts
import { MediaItemDto } from '../../media/dto/media.dto';
```

```ts
  @ApiProperty({ type: [MediaItemDto], description: 'Attached media; the cover is role `hero`.' })
  media!: MediaItemDto[];
```

`admin-post-detail.dto.ts` — `PostAuthorDto` gains:

```ts
  @ApiProperty({ nullable: true, type: String, description: 'Avatar delivery URL, when set.' })
  avatarUrl!: string | null;
```

- [ ] **Step 6: Controller.** `admin-posts.controller.ts` — add imports (`Put` from `@nestjs/common`, `SetMediaDto` + `MediaItemDto` from `../media/dto/…`) and the route after `update`:

```ts
  @Put(':slug/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: replace a post’s media set (cover)' })
  @ApiOkResponse({ type: [MediaItemDto], description: 'New media set with URLs' })
  @ApiResponse({ status: 404, description: 'Not found' })
  setMedia(@Param('slug') slug: string, @Body() body: SetMediaDto): Promise<MediaItemDto[]> {
    return this.postsService.setMedia(slug, body.media);
  }
```

(Also update the `create`/`update` handler return types to the service's new `PostWithMedia` if TS complains; `@ApiOkResponse` stays `PostDto`.)

- [ ] **Step 7: Run all tests**

Run: `pnpm nx test @tourism/api`
Expected: PASS (241 = 235 prior + 1 uploads + 6 posts, minus nothing).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/posts apps/api/src/modules/uploads
git commit -m "feat(api): post cover media + author avatar on admin detail"
```

### Task 3: Regen types + slice-1 gate/review/merge

- [ ] **Step 1:** Boot the API (`pnpm nx serve @tourism/api`, wait for `http://localhost:3000/api/docs-json`), run `pnpm nx run @tourism/core:api-types`, kill the server (kill the process tree — resolve the real PID via the listening port).
- [ ] **Step 2:** Verify the schema diff: `PostDto` gains `media`, `PostAuthorDto` gains `avatarUrl`, new `AdminPostsController_setMedia` operation. `git diff --stat libs/shared/core/src/lib/api/schema.ts`.
- [ ] **Step 3:** `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — PASS (build is the TS gate; no `typecheck` target on the Next apps).
- [ ] **Step 4:** Commit: `git add libs/shared/core/src/lib/api/schema.ts && git commit -m "chore(core): regen API types (post media + author avatar)"`.
- [ ] **Step 5:** Gate (`pnpm nx affected -t lint test build --exclude=@tourism/mobile`) → green; dispatch `ecc:code-reviewer` on the branch diff (public payload changed — verify no author leak on public routes, media attach correctness, garbage-collection on delete). Fix CRITICAL/HIGH.
- [ ] **Step 6:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-posts-cover-be && git push origin main && git branch -d feat/admin-posts-cover-be`.

---

# Slice 2 — Admin FE: cover upload + display

Branch off `main`: `git checkout -b feat/admin-posts-cover-fe`

### Task 4: `MediaField` hero-only mode + `POST_COVER` in the FE purpose union

**Files:**
- Modify: `apps/admin/src/lib/uploads.ts` (the `UploadPurpose` union, ~line 18)
- Modify: `apps/admin/src/components/crud/media-field.tsx`

**Interfaces:**
- Produces: `MediaField` accepts `galleryPurpose?: UploadPurpose` (omit ⇒ hero-only), plus optional `legend` (default `'Images'`), `description` (default the current sentence), `heroLabel` (default `'Hero image'`). Existing tour/destination callers compile and render unchanged. `'POST_COVER'` joins the FE `UploadPurpose` union. Task 5 consumes all of this.

- [ ] **Step 1:** `lib/uploads.ts` — extend the union:

```ts
/** Image upload slots the admin widget signs (per owner + role). */
export type UploadPurpose =
  | 'DESTINATION_HERO'
  | 'DESTINATION_GALLERY'
  | 'TOUR_HERO'
  | 'TOUR_GALLERY'
  | 'POST_COVER';
```

- [ ] **Step 2:** `media-field.tsx` — change the component signature (lines ~126-136) to:

```ts
export function MediaField({
  initial,
  onChange,
  heroPurpose,
  galleryPurpose,
  legend = 'Images',
  description,
  heroLabel = 'Hero image',
}: {
  initial: MediaInput[];
  onChange: (items: MediaInput[]) => void;
  heroPurpose: UploadPurpose;
  /** Omit to render a hero-only field (no gallery section) — e.g. the post cover. */
  galleryPurpose?: UploadPurpose;
  legend?: string;
  description?: string;
  heroLabel?: string;
}) {
```

Guard `onGalleryPick` (first line): `if (!galleryPurpose) return;` and its `uploadFile(f, 'gallery', galleryPurpose)` stays type-safe after the guard. In the JSX: `FieldLegend` renders `{legend}`; `FieldDescription` renders `{description ?? \`A hero photo and up to ${MAX_GALLERY} gallery images. Drag gallery tiles to reorder.\`}`; the hero `<span>` renders `{heroLabel}`; wrap the ENTIRE `{/* Gallery */}` block (`<div className="space-y-2">…</div>`, lines ~249-299) in `{galleryPurpose ? ( … ) : null}`.

- [ ] **Step 3:** Verify nothing regressed: `pnpm nx build @tourism/admin` — PASS (tour + destination forms pass `galleryPurpose`, so their rendering is identical).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/uploads.ts apps/admin/src/components/crud/media-field.tsx
git commit -m "feat(admin): MediaField hero-only mode + POST_COVER purpose"
```

### Task 5: Post form Cover section + media server-action wiring

**Files:**
- Modify: `apps/admin/src/lib/posts/actions.ts`
- Modify: `apps/admin/src/components/posts/post-form.tsx`

**Interfaces:**
- Consumes: `MediaField` (Task 4), `assembleMediaSet`/`parseMediaField`/`MediaInput` from `../../lib/media` (or `../media` from lib), `PUT /api/v1/admin/posts/{slug}/media` (Task 2), `Post.media` (regen, Task 3).
- Produces: form posts a hidden `media` JSON field; `createPost`/`updatePost` attach it best-effort after the save.

- [ ] **Step 1:** `lib/posts/actions.ts` — add the import and helper (mirror `lib/tours/actions.ts:21-28`):

```ts
import { assembleMediaSet, parseMediaField } from '../media';
```

```ts
/**
 * Best-effort attach of the form's cover set (`PUT /admin/posts/:slug/media`, replace-all). The
 * post is already saved, so a failure here is swallowed — the cover can be re-attached from edit.
 */
async function putPostMedia(slug: string, mediaJson: string): Promise<void> {
  try {
    const media = assembleMediaSet(parseMediaField(mediaJson));
    await apiWrite('PUT', `/api/v1/admin/posts/${encodeURIComponent(slug)}/media`, { media });
  } catch {
    // Saved without a cover; recoverable via edit.
  }
}
```

In `createPost`, capture the created slug and attach before the redirect (mirror tours):

```ts
  let createdSlug: string;
  try {
    const created = await apiWrite<{ slug: string }>(
      'POST',
      '/api/v1/admin/posts',
      toPostPayload(parsed.data),
    );
    createdSlug = created.slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  await putPostMedia(createdSlug, String(formData.get('media') ?? '[]'));
  revalidatePath('/posts');
  redirect(flashPath('/posts', 'created'));
```

In `updatePost`, capture the (possibly renamed) slug from the PATCH echo and attach with THAT (a rename would 404 the old slug):

```ts
  let savedSlug = slug;
  try {
    const updated = await apiWrite<{ slug: string }>(
      'PATCH',
      `/api/v1/admin/posts/${encodeURIComponent(slug)}`,
      toPostPayload(parsed.data),
    );
    savedSlug = updated.slug ?? slug;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  await putPostMedia(savedSlug, String(formData.get('media') ?? '[]'));
  revalidatePath('/posts');
  revalidatePath(`/posts/${savedSlug}/edit`);
  redirect(flashPath('/posts', 'updated'));
```

- [ ] **Step 2:** `post-form.tsx` — add imports:

```ts
import { MediaField } from '../crud/media-field';
import type { MediaInput } from '../../lib/media';
```

Below the existing state hooks, seed + hold the cover (deploy-lag guard `?? []`):

```ts
  // Seed the cover from the existing post on edit (hero role only; guard: media may be absent
  // for a beat mid-deploy while the API still serves the old shape).
  const initialMedia: MediaInput[] = (post?.media ?? [])
    .filter((m) => m.role === 'hero' && m.publicId)
    .map((m) => ({
      publicId: m.publicId,
      role: 'hero' as const,
      width: m.width ?? undefined,
      height: m.height ?? undefined,
      url: m.url,
    }));
  const [media, setMedia] = useState<MediaInput[]>(initialMedia);
```

Insert a new section between **Basics** and **Content** (MediaField renders its own Form-Layout-2 `FieldSet`):

```tsx
      <Separator className="my-8" />

      {/* Cover */}
      <MediaField
        initial={media}
        onChange={setMedia}
        heroPurpose="POST_COVER"
        legend="Cover"
        description="One wide photo for the blog card and the post header."
        heroLabel="Cover image"
      />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
```

- [ ] **Step 3:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS (schema/actions specs untouched; media rides its own field).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/posts/actions.ts apps/admin/src/components/posts/post-form.tsx
git commit -m "feat(admin): post cover upload in the form"
```

### Task 6: Detail Cover card + list thumbnail

**Files:**
- Modify: `apps/admin/src/app/(admin)/posts/[slug]/page.tsx` (main column)
- Modify: `apps/admin/src/components/posts/posts-table.tsx` (new leading column)

**Interfaces:**
- Consumes: `DestinationMediaView` (`{ media: { url: string; role: string }[]; emptyText?: string }` — generic viewer + lightbox), `Post.media` from the regen'd types.

- [ ] **Step 1:** Detail page — import the viewer:

```ts
import { DestinationMediaView } from '../../../../components/destinations/destination-media-view';
```

Add a Cover card ABOVE the Content card in the main column:

```tsx
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationMediaView
                media={(post.media ?? [])
                  .filter((m) => m.url)
                  .map((m) => ({ url: m.url, role: m.role }))}
                emptyText="No cover yet — add one from Edit."
              />
            </CardContent>
          </Card>
```

- [ ] **Step 2:** `posts-table.tsx` — add a leading `cover` column BEFORE the `title` column (`FileText` is already imported):

```tsx
  {
    id: 'cover',
    header: 'Cover',
    meta: { label: 'Cover' },
    cell: ({ row }) => {
      const hero = (row.original.media ?? []).find((m) => m.role === 'hero');
      return hero?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.url}
          alt=""
          className="bg-muted aspect-16/10 w-16 rounded-md border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground grid aspect-16/10 w-16 place-items-center rounded-md border">
          <FileText className="size-4" aria-hidden />
        </div>
      );
    },
  },
```

(If the repo's lint setup doesn't flag `<img>`, drop the eslint-disable line — match however `destination-media-view.tsx` gets away with plain `<img>`.)

- [ ] **Step 3:** `pnpm nx build @tourism/admin` — PASS; `/posts` + `/posts/[slug]` in the route list.

- [ ] **Step 4: Commit**

```bash
git add "apps/admin/src/app/(admin)/posts/[slug]/page.tsx" apps/admin/src/components/posts/posts-table.tsx
git commit -m "feat(admin): post cover on detail + list thumbnail"
```

### Task 7: Slice-2 gate + merge

- [ ] **Step 1:** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green.
- [ ] **Step 2:** Self-certify (mirrors reviewed media patterns; MediaField change verified additive by the tour/destination builds).
- [ ] **Step 3:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-posts-cover-fe && git push origin main && git branch -d feat/admin-posts-cover-fe`.

---

# Slice 3 — Admin FE: derived facts + author avatar render

Branch off `main`: `git checkout -b feat/admin-posts-derive`

### Task 8: Pure lib `lib/posts/derive.ts` (TDD)

**Files:**
- Create: `apps/admin/src/lib/posts/derive.ts`
- Test: `apps/admin/src/lib/posts/derive.spec.ts`

**Interfaces:**
- Produces: `readingStats(content: string): { words: number; minutes: number }` (0/0 for empty; else `minutes = max(1, round(words/200))`) and `extractOutline(content: string): { depth: 2 | 3; text: string }[]` (`#`→2, `##`→2, `###`→3, fences skipped, cap 12). Task 9 consumes both.

- [ ] **Step 1: Write the failing spec** — `derive.spec.ts`:

```ts
import { extractOutline, readingStats } from './derive';

describe('readingStats', () => {
  it('counts words and computes minutes at ~200 wpm', () => {
    const content = Array.from({ length: 400 }, () => 'word').join(' ');
    expect(readingStats(content)).toEqual({ words: 400, minutes: 2 });
  });

  it('ignores code fences and markdown syntax', () => {
    const { words } = readingStats(
      '## Title\n\n```js\nconst a = 1;\n```\n\n**bold** [link](https://example.com)',
    );
    expect(words).toBe(3); // Title, bold, link
  });

  it('returns zeros for empty content', () => {
    expect(readingStats('')).toEqual({ words: 0, minutes: 0 });
  });

  it('floors short posts at one minute', () => {
    expect(readingStats('just a few words here').minutes).toBe(1);
  });
});

describe('extractOutline', () => {
  it('collects h1–h3 headings, normalizing h1 to depth 2', () => {
    expect(extractOutline('# Top\n\ntext\n\n## Section\n\n### Sub')).toEqual([
      { depth: 2, text: 'Top' },
      { depth: 2, text: 'Section' },
      { depth: 3, text: 'Sub' },
    ]);
  });

  it('skips headings inside code fences and ignores h4+', () => {
    expect(extractOutline('```\n# not a heading\n```\n\n## Real\n\n#### Too deep')).toEqual([
      { depth: 2, text: 'Real' },
    ]);
  });

  it('returns empty for heading-less content', () => {
    expect(extractOutline('plain paragraph')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/admin`
Expected: FAIL — module `./derive` not found.

- [ ] **Step 3: Implement** — `derive.ts`:

```ts
/**
 * Derived, display-only facts computed from a post's Markdown `content`. Pure — no fetches, no
 * entity coupling; used by the admin post detail rail.
 */

const WORDS_PER_MINUTE = 200;
const MAX_OUTLINE = 12;

export interface ReadingStats {
  words: number;
  minutes: number;
}

/** Word count + reading minutes (~200 wpm, floored at 1 for any non-empty post). */
export function readingStats(content: string): ReadingStats {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/[#>*_~`|-]+/g, ' '); // markdown syntax chars
  const words = plain.split(/\s+/).filter(Boolean).length;
  const minutes = words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { words, minutes };
}

export interface OutlineItem {
  depth: 2 | 3;
  text: string;
}

/** `#`/`##`/`###` headings outside code fences (`#` normalizes to depth 2). Caps at 12 items. */
export function extractOutline(content: string): OutlineItem[] {
  const noFences = content.replace(/```[\s\S]*?```/g, '');
  const out: OutlineItem[] = [];
  for (const line of noFences.split('\n')) {
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line.trim());
    if (!m) continue;
    out.push({ depth: m[1].length >= 3 ? 3 : 2, text: m[2].trim() });
    if (out.length >= MAX_OUTLINE) break;
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/admin`
Expected: PASS (115 prior + 7 new = 122).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/posts/derive.ts apps/admin/src/lib/posts/derive.spec.ts
git commit -m "feat(admin): post reading-stats + outline derivation (TDD)"
```

### Task 9: Detail rail — Length row, outline card, author avatar

**Files:**
- Modify: `apps/admin/src/app/(admin)/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: `readingStats`/`extractOutline` (Task 8), `Avatar`/`AvatarImage`/`AvatarFallback` from `@tourism/ui` (the NavUser pattern, `components/shell/nav-user.tsx:46-48`), `post.author.avatarUrl` (Task 3 regen).

- [ ] **Step 1:** Add imports:

```ts
import { Avatar, AvatarFallback, AvatarImage } from '@tourism/ui'; // merge into the existing @tourism/ui import
import { extractOutline, readingStats } from '../../../../lib/posts/derive';
```

Compute above the return:

```ts
  const stats = readingStats(post.content);
  const outline = extractOutline(post.content);
  const authorInitials = (post.author?.fullName ?? post.author?.email ?? 'AD')
    .slice(0, 2)
    .toUpperCase();
```

- [ ] **Step 2:** In the Details rail card, add a Length row after the Slug row (hidden when empty):

```tsx
                {stats.words > 0 ? (
                  <Row
                    label="Length"
                    value={
                      <span className="font-normal">
                        {stats.words.toLocaleString('en-US')} words
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          ~{stats.minutes} min read
                        </span>
                      </span>
                    }
                  />
                ) : null}
```

Replace the Author row's value with the avatar treatment (keep the deploy-lag guard):

```tsx
                <Row
                  label="Author"
                  value={
                    <span className="flex items-center justify-end gap-2 font-normal">
                      <Avatar className="size-7 rounded-lg">
                        {post.author?.avatarUrl ? (
                          <AvatarImage src={post.author.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="rounded-lg text-[10px]">
                          {authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {post.author?.fullName ?? '—'}
                        <span className="text-muted-foreground block text-xs">
                          {post.author?.email ?? ''}
                        </span>
                      </span>
                    </span>
                  }
                />
```

- [ ] **Step 3:** Below the Details card in the rail, add the outline card (only for ≥2 headings):

```tsx
          {outline.length >= 2 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">In this post</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {outline.map((h, i) => (
                    <li
                      key={`${h.text}-${i}`}
                      className={h.depth === 3 ? 'text-muted-foreground pl-4' : 'font-medium'}
                    >
                      {h.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
```

- [ ] **Step 4:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(admin)/posts/[slug]/page.tsx"
git commit -m "feat(admin): post detail rail — length, outline, author avatar"
```

### Task 10: Slice-3 gate + merge + wrap-up

- [ ] **Step 1:** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green.
- [ ] **Step 2:** Self-certify (pure lib is TDD'd; rail render mirrors existing patterns).
- [ ] **Step 3:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-posts-derive && git push origin main && git branch -d feat/admin-posts-derive`.
- [ ] **Step 4:** Wrap-up per the standing workflow: mark this plan complete (status line), tick Wave 1 in `docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`, update memory (`tourism-platform-state`), remind the user what to check on the deploy (upload a cover → list thumbnail + detail Cover card + web payload via `/api/v1/posts`).
