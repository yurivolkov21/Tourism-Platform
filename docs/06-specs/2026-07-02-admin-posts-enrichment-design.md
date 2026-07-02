# Admin Posts enrichment (Wave 1) — design

- **Date:** 2026-07-02
- **Scope:** Posts cover image (BE + admin FE) · derived content facts (admin FE) · author avatar
  (BE + admin FE). Wave 1 of the admin enrichment roadmap
  (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction (3 groups user-approved), spec for execution
- **Context:** the Posts module is fully on the admin template (2026-07-02 reskin) but the model is
  thin and the detail page reads sparse. The audit confirmed the enrichers that fit: media (DB is
  already prepared — `MediaOwnerType.POST` exists, fixtures even carry 2 POST hero rows), derived
  facts from `content`, and the author's avatar (users already have `USER_AVATAR` media).

## Decisions

- **Cover = single hero image** (`MediaRole.hero`), no gallery for posts. Stored/served through the
  existing polymorphic media pipeline — no schema change, no new mapping shape.
- **`PostDto` gains `media: MediaItemDto[]`** (mirrors `DestinationDto`): attached on **all reads,
  public included** (`GET /posts` list via batch attach, `GET /posts/:slug`, admin list + detail) so
  the P6 web blog reader is unblocked without another BE pass. FE derives
  `cover = media.find(role === 'hero')`.
- **`MediaField` gains an optional `galleryPurpose`** — omitted ⇒ hero slot only (gallery grid +
  picker hidden). Additive, existing tour/destination callers unchanged. No new media component.
- **Author avatar** rides the established user-avatar pattern: `attachToOwner(USER, …)` →
  `media[0]?.url ?? null` (exactly `users.service.ts:152`).
- **Web stays out of scope** (P6 later) — this wave only makes the public payload ready.

## Slice 1 — BE: POST_COVER + media on Post reads + author avatar

### Uploads (`apps/api/src/modules/uploads`)

- `UploadPurpose` enum += `POST_COVER`; `resourceTypeForPurpose` → `image`; `folderForPurpose` →
  `${rootFolder}/posts/cover`. (+1 spec case in `uploads.service.spec.ts` mirroring the existing
  purpose tests.)

### Posts module (`apps/api/src/modules/posts`)

- `PostsService` gets `MediaService` injected (module already imports nothing extra —
  `MediaModule` is global or imported the same way destinations do; mirror the destinations
  module wiring).
- **Reads attach media:**
  - `list(...)` (shared by public + admin): batch-attach via the plural `attachToOwners`
    (`MediaOwnerType.POST`) after `findMany` — same as destinations list.
  - `findPublicBySlug` / `findDetailForAdmin`: `attachToOwner` per row.
- **`setMedia(slug, media)`** — copy of `destinations.service.setMedia` with
  `MediaOwnerType.POST` (resolve slug→id, `$transaction` + `syncAssets`, return
  `MediaItemDto[]`).
- **`remove(slug)`** also `deleteForOwner(MediaOwnerType.POST, id)` (mirror destinations delete —
  prevents orphaned Cloudinary rows).
- **`AdminPostsController`** += `PUT :slug/media` (`SetMediaDto` in, `[MediaItemDto]` out,
  404 pass-through) — byte-pattern of the destinations route.
- **DTOs:** `PostDto` += `media!: MediaItemDto[]`; `PostAuthorDto` += `avatarUrl!: string | null`;
  `findDetailForAdmin` resolves it via the user-avatar pattern (select `author.id` too, attach
  USER media, map `media[0]?.url ?? null`).
- **Service specs:** setMedia happy + 404 · remove deletes media · detail returns avatarUrl (and
  null when no avatar) · list attaches media. Mirror the destinations spec stubs
  (`makeMedia` with `syncAssets`/`deleteForOwner`/`attachToOwner(s)`).
- **Regen `@tourism/core` types** (boot API → `nx run @tourism/core:api-types`).

## Slice 2 — Admin FE: cover upload + display

- `apps/admin/src/lib/uploads.ts`: `UploadPurpose` union += `'POST_COVER'`.
- `components/crud/media-field.tsx`: `galleryPurpose?: UploadPurpose` — when `undefined`, render
  only the hero slot (no gallery grid, no gallery picker/input, dnd untouched for callers that
  pass it). Existing callers compile unchanged.
- **Form (`post-form.tsx`):** new Form-Layout-2 section **Cover** (between Basics and Content):
  `MediaField initial={coverItems} heroPurpose="POST_COVER"` + hidden `<input name="media">`
  serialising `MediaInput[]` minus display-only fields — exactly the tour-form wiring. Seed from
  `post.media` on edit.
- **Actions (`lib/posts/actions.ts`):** parse the hidden `media` JSON (reuse the same
  parse/assemble helpers `lib/media.ts` exposes, as tour actions do) → after create (capture the
  created slug) and on update, call a new `putPostMedia(slug, media)` (`PUT
  /api/v1/admin/posts/{slug}/media` via `apiWrite`), best-effort on create like destinations.
- **Detail page:** new **Cover** card above Content — 16:9 `next/image`-less `<img>`/lightbox tile
  consistent with `DestinationMediaView`'s hero treatment (reuse `ImageLightbox`); empty state
  “No cover yet.” when absent.
- **List:** new leading **thumbnail column** (small rounded 16:10 img from the hero URL,
  `FileText`-style placeholder box when none, `enableHiding: false` NOT required — hideable is
  fine; label "Cover").
- `getPost`/list types come free from the regen (media on `PostDto`).

## Slice 3 — Admin FE: derived facts + author avatar render

- **New pure lib `apps/admin/src/lib/posts/derive.ts` (TDD):**
  - `readingStats(content: string): { words: number; minutes: number }` — strip code fences +
    markdown syntax noise, count words, `minutes = max(1, round(words / 200))`.
  - `extractOutline(content: string): { depth: 2 | 3; text: string }[]` — `##`/`###` headings
    outside code fences (h1 rare — normalize `#` to depth 2), cap ~12 items.
  - Spec file with fixture markdown (headings, fences containing `# not-a-heading`, empty).
- **Detail rail:**
  - Details card += Row "Length" → `1,240 words · ~6 min read`.
  - New rail card **“In this post”** (only when outline has ≥ 2 items): indented heading list —
    plain text, not links (admin preview, no anchor ids exist).
  - Author row upgrades to avatar + name + email: `@tourism/ui` `Avatar` + `AvatarImage`
    (from `author.avatarUrl`) + `AvatarFallback` (2-letter initials) — the exact NavUser pattern
    (`components/shell/nav-user.tsx:46-48`).

## Out of scope

- Web blog reader (P6) and BlogTeaser wiring — payload becomes ready, UI later.
- Post gallery (hero only) · tags/SEO/scheduling (roadmap-deferred) · other waves (2–7).

## Testing

- BE: uploads purpose case + posts service specs listed above (target ≥ existing coverage; all
  additive).
- FE: `derive.spec.ts` (TDD, pure) · existing `schema.spec.ts` untouched (media travels via its
  own hidden input + dedicated PUT, NOT through `postSchema` — mirror of how tour media bypasses
  `tourSchema`).
- Gate per slice; slice 1 (BE surface incl. public payload change) → `ecc:code-reviewer`;
  slices 2–3 mirror reviewed patterns → self-certify unless findings arise.

## Risks

- **Public payload change** (`PostDto.media`): additive, but the web currently renders no posts —
  zero consumer risk today; regen may ripple other stale DTOs (review diff, typecheck-guard).
- **Deploy lag** (Render slower than Vercel): admin FE must guard `post.media ?? []` and
  `author.avatarUrl ?? null` — same guard discipline as the author fix (`c6485b4`).
- **MediaField change** must not disturb tour/destination forms — optional prop, default keeps
  today's behavior; verify both forms still build/render.
- **`attachToOwners` batch on the public list** — confirm the plural helper exists (audit says
  yes); otherwise loop `attachToOwner` (small page sizes, acceptable).

## Success criteria

- Admin can upload/replace/remove a post cover from the form; cover shows on the detail (Cover
  card + lightbox) and as a list thumbnail.
- Public `GET /posts` + `GET /posts/:slug` carry `media[]` (verified via Swagger/regen types).
- Detail rail shows reading length, outline card (long posts), and the author with avatar.
- Gate green per slice; slice 1 agent-reviewed; tour/destination media forms unaffected.
