# Media library upgrade (Wave D1) — design spec

**Date:** 2026-07-11 · **Scope:** api + admin (+ web `alt` consumption) ·
**Status:** approved (user 2026-07-11: D1 = picker reuse + GC ref-safety +
metadata edit + bulk delete/selection; notifications · category imagery ·
admin e2e stay cut).

## Goal

Close the media-library debt (group A/D of the audit): an admin can **reuse an
existing library image** in any tour/destination/post form, **edit an asset's
alt text**, and **bulk-delete** assets — without the Cloudinary GC ever
destroying an image that another owner still references.

## Non-goals

- **Upload directly from the library page** — deliberately CUT: every asset
  must belong to an owner or it is untracked garbage the GC can never
  reconcile (the exact stranded-asset class the site-media review closed).
  The picker removes the need — upload happens in the owner's form.
- Video reuse in the picker (images only — matches every consumer).
- Editing `role`/`sortOrder` from the library (owner forms own arrangement).
- Cross-owner "usage list" UI (nice-to-have; the ref-check is server-side).

## Current state (verified 2026-07-11)

- `MediaAsset` unique is `(ownerType, ownerId, publicId)` — the same publicId
  MAY legally sit on several owners. No `alt` column exists anywhere.
- `MediaService.recordGarbage` (from `syncAssets` drops + `deleteForOwner`) and
  `AdminMediaService.deleteAsset` enqueue to `media_garbage` **without any
  cross-owner reference check**; `MaintenanceService.reconcileMedia` destroys
  **blindly** from the queue. Reuse is unsafe until both ends are fixed.
- Owner `PUT .../media` endpoints validate only shape — an existing publicId
  from another owner is already accepted (the picker's enabler).
- `syncAssets` is replace-all: anything not carried by the form payload is
  dropped — so a new `alt` value must round-trip through `MediaInput` /
  `assembleMediaSet` / `SetMediaDto` or every form save would wipe it.

## Design

### ① GC ref-safety (prerequisite — both ends, TDD)

- **Enqueue-side** (`recordGarbage`, runs inside the owner-mutation tx): before
  queueing a publicId, skip it when **any `media_assets` row (any owner) still
  references it** — the row deletions for the current owner happen in the same
  tx before the check. Applies to `syncAssets`, `deleteForOwner`, and
  `AdminMediaService.deleteAsset` (which builds its own garbage rows — route it
  through the same guarded helper).
- **Destroy-side backstop** (`reconcileMedia`): before `cloudinary.destroy`,
  `findFirst({ where: { publicId } })` — if still referenced, **drop the
  garbage row without destroying** (a legitimate later re-reference must not
  leave a live bomb in the queue). Belt-and-suspenders for any path that
  bypasses the enqueue guard.
- **Re-attach defuse**: `syncAssets` purges kept publicIds from
  `media_garbage` — re-attaching an image that a previous owner dropped hours
  ago removes the pending destroy immediately instead of racing the daily cron.
- **Accepted residual risks (adversarial review, 2026-07-11):** (1) two
  OVERLAPPING transactions each dropping the same shared publicId can both see
  the other's still-visible row (READ COMMITTED write skew) → neither enqueues
  → a Cloudinary orphan that is never destroyed — leak-only (storage cost,
  zero user-facing breakage), rare, accepted. (2) the reconcile backstop's
  check→destroy gap is a sub-second window once per row per daily run; with
  the re-attach defuse above, hitting it requires attaching a zero-row
  publicId from a stale picker in exactly that window — accepted.
- **Preserved-role conflict**: a payload publicId that survives under a
  preserved role (e.g. picking a post's inline body image as its cover) would
  violate the per-owner unique — `syncAssets` rejects it with a clean 400
  `MEDIA_ROLE_CONFLICT` instead of a P2002 500.

### ② Reuse picker (admin)

- `MediaField` gains a **"Choose from library"** button beside Upload: opens a
  dialog listing `GET /admin/media` (images only, search + owner-type facet,
  paginated) — selecting an asset pushes a normal `MediaInput`
  (`publicId/format/width/height/url` + the field's target role) into the
  field's items, then flows through the unchanged `PUT .../media`.
- Duplicate guard client-side: an image already in the field's items (same
  publicId) can't be added twice (the DB compound unique would reject the
  whole replace-all otherwise).
- Server actions: reuse the existing `listMedia` (new thin server action for
  client fetch, mirroring the notes-drawer pattern).

### ③ Alt text (net-new metadata, migration)

- Schema: `MediaAsset.alt String? @db.VarChar(300)` (additive migration).
- Write paths: `MediaInputDto.alt?` (≤300, trimmed) → `syncAssets` stores it;
  for KEPT rows alt updates only when the payload provides it (`undefined`
  preserves — forms that don't know about alt can't wipe it). `registerAsset`
  passes it through. New `PATCH /admin/media/:id` body `{ alt: string | null }`
  (null clears; 404 unknown) — the library drawer's edit surface.
- Read paths: `MediaItemDto.alt` (nullable) via `attachToOwners`; admin
  `MediaInput`/`assembleMediaSet`/`parseMediaField` round-trip it so owner-form
  saves preserve it.
- Web consumption: components that synthesize `alt` from owner text now prefer
  `media.alt ?? <current fallback>` (tour hero/gallery/cards, destination
  tiles, post cover — the surfaces already mapping media arrays).

### ④ Bulk delete + selection (admin)

- BE: `POST /admin/media/bulk-delete` body `{ ids: uuid[] (1..100) }` — one
  transaction: skips USER-owned (reported, not failed), enqueues garbage
  through the ref-check guard, deletes rows; returns
  `{ deleted: number, skipped: number }`.
- FE: the library grid gains a selection mode — tile checkboxes (click still
  opens the drawer; the checkbox is its own hit target), a floating action bar
  ("N selected · Clear · Delete") with a confirm `AlertDialog`, toast with the
  deleted/skipped summary, refresh.

## Error handling

- Picker fetch failure → inline error in the dialog, form untouched.
- PATCH alt 404 (asset deleted meanwhile) → toast; drawer closes on refresh.
- Bulk delete: partial skips surface in the toast ("Deleted 4 · skipped 1
  avatar"); atomicity per batch (single tx).
- GC: ref-checked skips log at debug level; the garbage row is dropped so the
  queue can't loop forever on a referenced publicId.

## Testing

- API TDD-first: `recordGarbage` skip-when-referenced (sync + deleteForOwner +
  admin delete paths) · `reconcileMedia` backstop (referenced → drop row, no
  destroy) · `alt` persist/preserve/clear semantics in `syncAssets` + PATCH ·
  bulk delete (mixed batch: deletable + USER-owned + unknown id).
- Admin: TDD pure additions (payload round-trip of `alt` in `lib/media.ts`) ·
  picker dedupe guard as a pure helper · view specs stay green.
- Web: existing specs green (alt fallback keeps old output when alt null).
- `/regen-types`; full gate; **adversarial review before merge** (migration +
  GC semantics — the highest-risk change of the debt program).

## Definition of done

Reusing one image across two owners then deleting it from one leaves the other
intact (and the garbage queue clean); alt text survives owner-form saves and
renders on the web; bulk delete works with USER-owned rows skipped; migration
applied live; gate green; docs swept.
