# Admin Media library (Wave 7) — design

- **Date:** 2026-07-02
- **Scope:** net-new admin surface `/media` — browse/search/delete over `MediaAsset` + garbage-queue
  visibility with an on-demand cleanup trigger. New BE endpoints (the roadmap's only "own spec"
  wave). No schema change; public surface untouched. Wave 7 (final) of the enrichment roadmap
  (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction, spec for execution
- **Trigger (audit findings):** no admin browse/list/search endpoint over `MediaAsset` exists;
  media only lives embedded in Tour/Destination/Posts forms; `MediaGarbage` (the deferred
  Cloudinary-destroy queue) is invisible to admins. Sidebar already reserves Media (`soon: true`,
  `/media`).

## Key facts (verified)

- **Every `MediaAsset` row is OWNED** — polymorphic `(ownerType TOUR|DESTINATION|USER|POST,
  ownerId, role hero|gallery|avatar)`, no unattached-media concept (uploads go straight to
  Cloudinary; the DB row appears only when the owner form is saved via `syncAssets`). The library
  is therefore a cross-owner VIEW plus per-asset detach, not an upload manager.
- **Deferred GC is intentional and WORKING** (user asked; verified live 2026-07-02): removing an
  image from an owner does NOT call Cloudinary — `recordGarbage` queues the `publicId` into
  `media_garbage`, and the pg-boss `media-reconcile` cron destroys a batch **once per day**
  (`MaintenanceService.reconcileMedia`, attempts/lastError on failure). Live check: 9 queued rows
  (today's destination deletions), 0 failures, no stale backlog. The ~24h delay is the UX gap the
  Garbage tab + "Run cleanup now" close.
- `MediaService` is the single owner of `MediaAsset` access (`syncAssets` replace-all,
  `deleteForOwner`, `attachToOwners` batched URL building via `buildCloudinaryUrl`);
  `CloudinaryService.destroy` exists for the cron. `@@index([ownerType, ownerId, role])`.
- **Reuse is a landmine, excluded by decision:** GC does not reference-check across owners — two
  owners sharing one `publicId` + one dropping it would destroy the other's Cloudinary asset. A
  future reuse wave needs copy-on-reuse (or a ref-checking GC) first.
- Current volume: 23 assets — small, but the API must paginate server-side (unbounded growth,
  same rationale as Bookings).
- Admin FE patterns available: Sheet drawer (Enquiries/Reviews) · DropdownMenu checkbox facet
  (Tours category filter) · `ServerTablePagination` (URL adapter) · AlertDialog confirm + toast ·
  `apiWrite` server actions · `next/image`.

## Decisions (user-confirmed)

1. **Scope = browse + search + delete + garbage visibility.** No reuse/picker (YAGNI + GC trap),
   no Cloudinary orphan scan (assets uploaded but never saved — needs the Cloudinary list API),
   no metadata editing.
2. **Garbage tab = view + "Run cleanup now"** (runs one reconcile batch on demand, reusing
   `reconcileMedia()`); no per-row retry/dequeue.
3. **Browse UX = thumbnail grid + detail drawer** (a media library is visual; drawer = the
   established Sheet pattern), NOT a 10th TanStack table.

## Slice 1 — BE: admin media endpoints

New `AdminMediaController` (`@Roles(ADMIN)` like every admin controller) in the existing media
module; logic in a NEW sibling `AdminMediaService` (list/owner-resolution/delete/garbage —
keeps `MediaService` a focused owner-sync unit; the new service reuses `buildCloudinaryUrl`
and mirrors `recordGarbage` semantics). All additive.

- **`GET /admin/media`** — paginated (`page`/`pageSize` ≤100, default 20), newest first.
  Filters AND-compose: `ownerType?` (enum) · `role?` (enum) · `type?` (enum) · `search?`
  (trimmed, MaxLength 160) matching `publicId` contains OR owner title/name contains (resolve
  matching owner ids first via parallel per-type indexed lookups: tour/destination/post `title
  contains`, user `fullName/email contains` → `OR [{publicId}, {AND [ownerType, ownerId in]}]`).
  Each item = `AdminMediaAssetDto`:
  `{ id, publicId, url, posterUrl, type, role, format, width, height, bytes, durationSec,
  sortOrder, createdAt, ownerType, ownerId, ownerTitle, ownerSlug }` — `url/posterUrl` built via
  `buildCloudinaryUrl`; `ownerTitle/ownerSlug` resolved batched per type for the page's rows
  (tours/destinations/posts → title+slug; users → fullName ?? email, `ownerSlug: null`).
  Owner rows deleted out-of-band → `ownerTitle: null` (FE shows "Unknown owner", no link).
- **`DELETE /admin/media/:id`** — detach one asset + queue Cloudinary destruction, atomic via a
  batch `$transaction([mediaGarbage.createMany(skipDuplicates), mediaAsset.delete])` (no
  interactive tx — pooler rule). Garbage rows mirror `recordGarbage` semantics (publicId with
  resource_type from media type, plus video `posterId` as image). **409 `MEDIA_USER_OWNED`** for
  `ownerType=USER` (customer avatars are not library content). 404 `MEDIA_NOT_FOUND` when
  missing. Response: the deleted asset's `{ id, publicId }`.
- **`GET /admin/media/garbage`** — paginated queue, oldest first (the cron's order):
  `{ id, publicId, resourceType, attempts, lastError, createdAt }`.
- **`POST /admin/media/garbage/reconcile`** — runs ONE `reconcileMedia()` batch immediately;
  returns `{ destroyed, failed }`. (JobsModule already exports/holds `MaintenanceService`; wire
  by importing the module — do not duplicate the destroy loop.)
- **Tests (TDD):** list mapping + filter AND-composition + search owner-resolution · delete
  happy/USER-blocked/missing + garbage rows recorded (incl. video posterId) · garbage list
  mapping · reconcile passthrough. Baselines: api 257.
- **Regen types** (standing routine) after green.

## Slice 2 — Admin FE: `/media` page

Route `apps/admin/src/app/(admin)/media/page.tsx` + `components/media/*`; sidebar drops
`soon: true`.

- **Tabs Library | Garbage** via `?tab=` (URL state, server-fetched both).
- **Library tab:** responsive thumbnail grid (`next/image`, square tiles, video shows poster +
  a small type glyph; role + ownerType as tiny overlay badges) · facet filters ownerType/role/
  type (DropdownMenu checkbox pattern) + search box → ALL URL params (`?ownerType=&role=&type=&q=`)
  feeding the server fetch · `ServerTablePagination` under the grid · empty state ("No media
  yet — images upload from the Tours, Destinations and Posts forms").
- **Detail drawer (Sheet, row-data only):** large preview · facts (dimensions · bytes
  human-readable · format · role · sortOrder · uploaded date) · publicId (mono, copyable) ·
  owner line "In {ownerTitle}" linking `/tours|/destinations|/posts/[ownerSlug]` (USER/unknown:
  plain text) · **Delete** button (hidden for USER assets) → AlertDialog confirm whose copy names
  the owner and states permanence ("Removes this image from {owner} and permanently deletes it
  from Cloudinary within the day — or run cleanup now from the Garbage tab.") → server action →
  toast + refresh.
- **Garbage tab:** count line + compact table (publicId mono · type · attempts · last error ·
  queued when) + **Run cleanup now** button → server action → toast "{destroyed} destroyed,
  {failed} failed" + refresh; empty state "Queue is clean — deleted media is already purged from
  Cloudinary."
- **TDD pure helpers** (`lib/media-library/`): `formatBytes` · `ownerHref(ownerType, ownerSlug)`
  · query-param narrowing (enum guards like `parseStatus`). Server actions in
  `lib/media-library/actions.ts` via `apiWrite`.
- Deploy-lag: the page is new — if Render hasn't shipped the endpoints yet the fetch fails and
  the standard `ErrorAlert` shows; acceptable (same-wave BE+FE) — no field-level guards needed.
- Baselines: admin 127.

## Out of scope

Reuse/library picker (future wave: copy-on-reuse or ref-checking GC first) · Cloudinary orphan
reconciliation · uploading FROM the library · editing metadata/sortOrder · deleting USER avatars
· bulk delete.

## Testing & process

- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile`.
- SDD: haiku transcription / sonnet reasoning + all task reviewers; `ecc:code-reviewer` on
  slice 1 (delete + Cloudinary surface). Straight quotes in code; no curly-quote "fixes" in
  existing copy; never stage unrelated dirty files.
- Merge to `main` after green slice pre-authorized; stop on CRITICAL/HIGH.

## Risks

- **Polymorphic owner resolution:** ≤4 batched lookups per page render + ≤4 more when searching
  — indexed, admin-only, fine. No joins exist for `(ownerType, ownerId)`; keep the resolution in
  one helper so a future FK refactor touches one place.
- **Delete leaves an owner hero-less** (tour/destination/post without hero until re-upload) —
  deliberate, surfaced in the confirm copy.
- **Race with owner forms:** an admin saving a Tours form while another deletes one of its
  assets from the library — last write wins (replace-all `syncAssets` recreates what the form
  still holds; the garbage `skipDuplicates` unique keeps GC consistent). Acceptable single-admin
  reality.
- **Run-now cost:** one Cloudinary destroy per queued row, batch-capped (same as the cron) — no
  new failure mode.

## Success criteria

- Admin can answer "what images exist, where are they used, how big are they" from one page;
  can remove a wrong image from anywhere without opening the owner form; can see the deferred
  Cloudinary purge working (the user's exact confusion this week) and force it on demand. The 9
  rows queued today make the first live validation: press Run cleanup now → they vanish from
  Cloudinary. Gate green per slice; slice 1 agent-reviewed.
