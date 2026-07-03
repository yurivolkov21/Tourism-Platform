# Blog v2 Wave 3 — admin authoring: inline body images

- **Date:** 2026-07-03
- **Roadmap:** `docs/07-plans/2026-07-03-blog-v2-roadmap.md` (Wave 3 of 5)
- **Scope:** BE small (`@tourism/api`) + admin (`@tourism/admin`). Web unchanged — the
  reader already renders markdown images (`PostContent`'s `img` mapping, lazy + rounded).
- **User decision (2026-07-03):** body images are **tracked** as POST-owned `MediaAsset`
  rows with a dedicated role, **excluded from the cover's replace-all**, garbage-collected
  **on post delete**; images removed from markdown mid-life stay visible in the `/media`
  library where the admin can delete them manually (Wave-7 page already has the button).

## Verified facts

- `MediaRole` is a Prisma **enum** (`hero`/`gallery`/`avatar`) → adding `body` is an
  `ALTER TYPE ... ADD VALUE` migration (additive; PG15 on Supabase handles it in Prisma's
  migration transaction). **Live-DB apply = user go/no-go**, same as Wave 1.
- `MediaService.syncAssets(tx, ownerType, ownerId, assets)` is replace-all across the WHOLE
  owner (reads existing → garbage non-kept → deleteMany → createMany). Without a carve-out,
  saving the cover would GC every body image.
- `MediaService.deleteForOwner` garbages + deletes ALL owner rows — post delete therefore
  cleans body images with zero change (the chosen design's cleanup path).
- `UploadPurpose` enum lives in `create-signed-upload-url.dto.ts` (has `POST_COVER` →
  folder `posts/cover`, image-only); `resourceTypeForPurpose`/`folderForPurpose` switches in
  `uploads.service.ts`.
- Delivery URLs are built by `buildCloudinaryUrl` (`apps/api/src/lib/cloudinary-url.ts`),
  used by `attachToOwner`.
- Admin upload client flow exists: `lib/uploads.ts` `signUpload(params)` → direct POST to
  Cloudinary (see `components/crud/media-field.tsx` internals) — the insert-image button
  reuses it.
- Admin already renders markdown (`components/posts/post-content.tsx`) — the live preview
  reuses it.
- Post form's `content` is currently an UNcontrolled `Textarea` (`defaultValue`) — cursor
  insertion + live preview require making it controlled.
- Public `PostDto.media[]` attaches ALL roles; web cover pick = hero-role first, else first
  attachment. A cover-less post with body images would show the first body image on cards —
  acceptable (better than the muted panel), no change made.

## Design

### BE (slice 1, branch `feat/blog-v2-body-images`)

1. **Schema:** `enum MediaRole` += `body` → migration `add_media_role_body`
   (`--create-only`; user go/no-go before `migrate deploy`; must be applied before merge —
   new code writes the value).
2. **`syncAssets` carve-out:** optional last param
   `opts?: { preserveRoles?: MediaRole[] }` — both the existing-read and the `deleteMany`
   add `role: { notIn: opts.preserveRoles }` when provided. Default behavior unchanged
   (all existing callers untouched). `PostsService.setMedia` passes
   `{ preserveRoles: [MediaRole.body] }`. TDD on the service spec (preserve vs default).
3. **Upload purpose:** `UploadPurpose.POST_BODY` → image resource type, folder `posts/body`
   (+ spec cases mirroring POST_COVER's).
4. **Register endpoint:** `POST /admin/posts/:slug/body-images` (admin controller, after
   the `tags` route conventions; body = existing `MediaInputDto`-like minimal DTO
   `RegisterBodyImageDto { publicId (≤300), width?, height?, format? }`) →
   `PostsService.addBodyImage(slug, dto)`: 404 unknown slug; `mediaAsset.create` with
   ownerType POST / role body / sortOrder 0; returns `{ url }` built via
   `buildCloudinaryUrl`. **Idempotent:** `MediaAsset.publicId` has NO unique constraint
   (verified — only `MediaGarbage.publicId` is unique), so re-registering the same publicId
   for the same owner short-circuits to the existing row's URL instead of duplicating.
   No delete endpoint — mid-life removal is the `/media` library's job (decision above).
5. Regen types; api tests for carve-out + endpoint paths (404/409/create shape).

### Admin FE (slice 2, same branch or follow-up branch)

- **Content section upgrades** (`post-form.tsx`):
  - `content` becomes controlled state (`useState(post?.content ?? '')`, Textarea gains a
    `ref` for cursor position).
  - **"Insert image" button** (outline, ImagePlus icon) above the Textarea — **enabled only
    on EDIT** (a new post has no slug to own the asset; hint text "Save the draft first to
    insert images" shows on create). Flow: hidden file input → `signUpload({ purpose:
    'POST_BODY' })` → direct Cloudinary POST (reuse the media-field upload helper —
    extract its `uploadToCloudinary` into `lib/uploads.ts` if not already shared) →
    `POST /admin/posts/:slug/body-images` via `apiWrite` → insert
    `\n\n![](url)\n\n` at the cursor (alt left empty for the author to fill). Errors →
    `ErrorAlert` inline under the button; Spinner-in-button while uploading.
  - **Live preview:** a "Write | Preview" toggle (segmented tablist styling, the
    outbox/media tab pattern) above the editor; Preview renders the controlled markdown
    through the existing admin `PostContent`. (Toggle, not side-by-side — keeps the Form
    Layout 2 column intact.)
- The edit page passes nothing new — the form already has `post.slug`.

## Out of scope

Markdown-reference parsing on save (rejected option) · body-image delete endpoint (library
handles it) · web changes · alt-text tooling · image resizing UI.

## Testing & process

- Slice 1 = BE → TDD service tests, `ecc:code-reviewer` pass, regen, **migration go/no-go
  gate**, merge. Slice 2 = admin FE → per-task reviews; TDD only where pure logic exists
  (markdown insert-at-cursor helper `insertAtCursor(text, position, snippet)` — pure,
  tested).
- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
  Baselines: api 301 · admin 139 · web 155.
- SDD routing: haiku transcription / sonnet for the syncAssets carve-out task + reviewers.
  Straight quotes; never reformat untouched lines; never stage unrelated dirty files.

## Risks

- **Enum ADD VALUE ordering:** the migration must be applied before the merged code writes
  `body` (same merge-after-migrate rule as Wave 1).
- **`syncAssets` regression risk:** the carve-out touches every media write path — the
  default (no opts) MUST behave byte-identically; existing media.service.spec suite is the
  net, plus new preserve cases.
- **Register-then-abandon:** an admin inserts an image then never saves the post — the
  asset row + Cloudinary file persist, owned by the post; visible in `/media`, cleaned on
  post delete. Accepted (same class as the mid-life removal case).
- **New-post UX:** insert-image disabled on create; the hint makes it honest. Accepted by
  design.

## Success criteria

Admin edits a post → uploads an image from the Content section → markdown gains
`![](https://res.cloudinary.com/...)` at the cursor → Preview toggle shows it rendered →
web article displays it (existing renderer). Saving the cover never destroys body images;
deleting the post cleans them from DB + Cloudinary (via garbage queue); `/media` library
lists body images with working manual delete. Gates green; api/admin baselines grow.
