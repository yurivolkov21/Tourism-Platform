# Blog v2 Wave 1 — content model: tags + tour links + public author

- **Date:** 2026-07-03
- **Roadmap:** `docs/07-plans/2026-07-03-blog-v2-roadmap.md` (Wave 1 of 5)
- **Scope:** BE (`@tourism/api`) + admin (`@tourism/admin`). Web consumes in Wave 2 — all
  additions are backward-compatible (web's `toPostSummary` ignores unknown fields).
- **Status:** direction locked by user 2026-07-03 (free-form inline tags · hand-picked tours ·
  real author · see roadmap "Locked decisions")

## Verified facts (2026-07-03)

- `Post` has no taxonomy and no tour relation; `author` relation exists (`onDelete: Restrict`).
- Repo M:N convention = **explicit join table** (`TourDestination` with `@@id([a, b])` +
  `@@map`), not Prisma implicit M:N.
- `PostsService` create/update build `data` field-by-field; `list()` uses `Promise.all`
  (pooler-safe); media attaches via `attachToOwner(s)`.
- `findDetailForAdmin` already resolves author avatar via `attachToOwner(USER, ...)` — the
  same trick works for public reads.
- `ToursModule` **exports `ToursService`**; its summary pipeline is
  `attachRatings` → `attachNextDeparture` over media-attached rows (both private today).
- Admin post form is Form Layout 2 with sections Basics / Cover / Content / Publishing;
  hidden-JSON-input pattern already used for `media`.
- Admin multi-option facet convention = **DropdownMenu + checkbox items**
  ([[admin-ui-design-consistency]]); `@tourism/ui` also ships a Base UI `Combobox`.
- API `slugify` lives at `apps/api/src/common/slugify.ts` (posts already use it).
- Public routes: static segments must be declared before `:slug` (route-order lesson from
  `/users/me`).

## Schema (ONE migration — also covers Wave 2's needs)

```prisma
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

`Post` gains `tags PostTagLink[]` + `relatedTours PostTour[]`; `Tour` gains
`posts PostTour[]`. Deleting a tour silently drops the link (post survives). Deleting a post
cascades its links. Tags are never auto-deleted when orphaned (harmless rows at blog scale;
a cleanup can come later if ever needed). Migration name:
`add_post_tags_and_post_tours`. **Applying to the live Supabase DB waits for the user's
go/no-go** (standing rule).

## BE — DTOs & semantics

**New read shapes**

- `PostTagDto { slug: string; name: string }`.
- `PublicPostAuthorDto { fullName: string | null; avatarUrl: string | null }` — public-safe,
  **no email** (the admin-only `PostAuthorDto` keeps email and stays as-is).
- `PostDto` (public list + detail, shared) **+=** `tags: PostTagDto[]` and
  `author: PublicPostAuthorDto`.
- **New `PostDetailDto extends PostDto`** (public `GET /posts/:slug` only) **+=**
  `relatedTours: TourSummaryDto[]` — published tours only, in the admin-picked order, run
  through the standard tour-summary pipeline (media + ratings + next-departure) so Wave 2 can
  feed `TourCard` directly. List reads do NOT carry `relatedTours` (cost).
- `AdminPostDetailDto` **+=** `tags: PostTagDto[]` +
  `relatedTours: { slug: string; title: string; isPublished: boolean }[]` (light — mirrors
  the `LinkedToursCard` shape; admin needs identity, not merchandising).

**Write path** (`CreatePostDto` / `UpdatePostDto`, both optional fields)

- `tags?: string[]` — display names, each 1–60 chars, **max 10**, `@IsString({ each: true })`.
  Service normalizes each via `slugify(name)` (cap 60): empty-after-slugify entries are
  rejected (400 `INVALID_TAG`); duplicates within the payload collapse. **Upsert by slug** —
  an existing slug reuses the row (first writer owns the display name), a new slug creates
  the tag. Links are **replace-all when the field is provided**; `undefined` leaves links
  untouched; `[]` clears them. (Same provided/undefined semantics the update path already
  uses per-field.)
- `relatedTourSlugs?: string[]` — tour slugs, **max 3**, same replace-all/undefined/[]
  semantics; `order` = array index. Unknown slug → 400 `RELATED_TOUR_NOT_FOUND` (bad
  reference is a client error, not a silent skip). Drafts may reference unpublished tours;
  the public read filters to published at query time.
- Both writes happen with the post create/update — link writes go in a `$transaction`
  with the post write ONLY where the pooler allows (interactive tx is the established
  exception for owner+related writes, per `setMedia`/`deleteMe` precedent); reads stay
  `Promise.all`.

**New endpoints**

- Public `GET /posts/tags` → `PostTagWithCountDto[]` where
  `PostTagWithCountDto { slug: string; name: string; count: number }` — tags having ≥1
  PUBLISHED (and `publishedAt <= now`) post, `count` = that published-post count,
  name-ordered. Powers Wave 2's filter chips. **Declared before `GET /posts/:slug`**
  (route order).
- Admin `GET /admin/posts/tags` → `PostTagWithCountDto[]` (count = all posts incl. drafts),
  name-ordered — powers the form combobox suggestions. Declared before the admin `:slug`
  routes.
- Optional public list filter: `GET /posts?tag=<slug>` (`ListPostsQueryDto += tag?`) —
  filters via `tags: { some: { tag: { slug } } }`. Cheap now, needed by Wave 2.

**Reads wiring**

- `list()` include: `tags: { include: { tag: true } }` mapped flat to `PostTagDto[]`;
  author display fields via `include: { author: { select: { id, fullName } } }` + batched
  avatar attach (`attachToOwners(USER, distinct authors)`).
- `findPublicBySlug` additionally loads `relatedTours` (ordered by `order`), filters
  `isPublished`, and calls a **new public `ToursService.findSummariesByIds(ids: string[])`**
  (published-only, preserves input order) that reuses the existing private
  media/ratings/next-departure pipeline. `PostsModule` imports `ToursModule` (no cycle:
  Tours does not import Posts).
- Regen `@tourism/core` types after DTO changes; **api tests** cover: tag upsert/reuse,
  replace-all vs undefined vs `[]`, payload-dup collapse, `INVALID_TAG`,
  `RELATED_TOUR_NOT_FOUND`, cap validation, public tags endpoint filters drafts, public
  detail filters unpublished tours + preserves order, `?tag=` filter.

## Admin FE

- **Post form — new "Topics & tours" section** (Form Layout 2, between Content and
  Publishing):
  - **Tags editor:** chips (removable ×) + an input that suggests existing tags (from
    `GET /admin/posts/tags`, filtered client-side as you type) and creates a new tag on
    Enter when no match. Built on `@tourism/ui` `Combobox` if it composes cleanly; the
    approved fallback is the chips-input + DropdownMenu-suggestions composition (both
    respect [[admin-ui-design-consistency]] — no native elements). Max 10 chips; hidden
    input `name="tags"` = JSON array of names.
  - **Related tours picker:** DropdownMenu + checkbox items (the established facet pattern)
    listing **published** tours (from the existing admin `listTours` load-all), selected
    tours shown as ordered chips below (order = pick order), max 3 (unchecked items disable
    at 3). Hidden input `name="relatedTourSlugs"` = JSON array of slugs.
  - Zod schema + server actions parse both JSON fields (mirror the `media` hidden-input
    pattern); TDD on the schema additions.
- **Post detail page:** rail gains a Tags row (badge chips) + a "Related tours" card
  (reuses the `LinkedToursCard` presentation). Deploy-lag guards (`post.tags ?`,
  `post.relatedTours ?`).
- **Posts list:** Tags column (first 2 + "+N", hideable via Columns) — light touch.

## Out of scope (this wave)

Web reader changes (Wave 2) · tag CRUD page · tag rename/merge · auto tour matching ·
body-image uploads (Wave 3) · fixtures update (fixtures stay tag-less; real content comes
from the user post-wave).

## Testing & process

- Slice 1 = BE (schema→service→endpoints→tests→regen) — **`ecc:code-reviewer` pass required**
  (BE slice). Slice 2 = admin FE (form + detail + list) — per-task reviews only.
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
  Baselines: api 291 · admin 134 · web 148 (web should stay untouched).
- SDD: haiku transcription / sonnet reasoning + all reviewers. Straight quotes; never stage
  unrelated dirty files. Migration on live Supabase: **ask the user before `migrate deploy`**
  (local `migrate dev` to generate is fine).
- Deploy-lag: admin consumes new fields guarded (`?? []`), so a Vercel-before-Render window
  never crashes.

## Risks

- **Route order** on both controllers (`/posts/tags` vs `/posts/:slug`) — a swapped order
  404s as a missing post named "tags"; covered by an e2e-ish controller test.
- **Tag upsert race** (two admins create the same new tag): `slug @unique` + upsert makes it
  converge; P2002 on the rare race retries as connect. Single-admin reality makes this
  theoretical.
- **`findSummariesByIds` reuse** must not fork the summary shape — it delegates to the same
  private pipeline `list()` uses; a drifted second pipeline is the failure mode to reject in
  review.
- **Form JSON hidden inputs** already proven by `media` — parse defensively (`parseJsonRows`
  precedent) so a malformed value 400s cleanly instead of crashing the action.

## Success criteria

Admin can tag a post (creating tags inline), pick up to 3 related tours, and see both on the
post detail; public `GET /posts/:slug` returns tags + author (name/avatar, no email) +
published related-tour summaries in order; `GET /posts?tag=` filters; all gates green with
zero web changes.
