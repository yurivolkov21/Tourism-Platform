# ADR-0011 — Reference-safe media GC (assets may be shared across owners)

**Status:** Accepted · **Date:** 2026-07-12 (retroactive record — decision
shipped earlier; see date in Context)

## Context

`MediaAsset`'s unique key is `(ownerType, ownerId, publicId)` — the same
Cloudinary `publicId` may legally sit on several owner rows at once (the wave
D1 "choose from library" reuse picker depends on this). The original garbage
collector enqueued a `publicId` for Cloudinary destruction the moment one
owner dropped it, with no check for other owners still referencing the same
asset — a live image attached elsewhere could be destroyed out from under it.

## Decision

Wave D1 (2026-07-11), three-layer safety in
`apps/api/src/modules/media/media.service.ts` +
`apps/api/src/modules/jobs/maintenance.service.ts`:

1. **Guarded enqueue** — `recordGarbage` (media.service.ts ~L155–195) only
   queues a `publicId` when no `media_assets` row (any owner, including as a
   video's `posterId`) still references it, checked **after** the same-tx
   owner-row deletions (`syncAssets` ~L91–92, `deleteForOwner` ~L138–139)
   remove the rows being dropped.
2. **Destroy-time backstop** — `reconcileMedia` (maintenance.service.ts
   ~L54–79) re-checks reference (asset OR poster) immediately before calling
   `cloudinary.destroy`; still-referenced → drop the queue row without
   destroying.
3. **Re-attach defuse** — `syncAssets` (media.service.ts ~L95–101) purges any
   kept/re-attached `publicId`s from `media_garbage` before recreating rows,
   so a publicId re-attached shortly after being dropped can't be destroyed by
   a cron run that already had it queued.

Accepted residuals (adversarial review, wave D1): a READ COMMITTED
double-drop write-skew can leak a Cloudinary asset as an orphan (never a
false destroy) · the reconcile job still has a sub-second TOCTOU window
between its re-check and the destroy call.

## Consequences

- Cloudinary assets are safely shareable across owners — the reuse picker
  requires no special-casing.
- Deletion UX stays simple (delete = drop this owner's row); the system
  decides destroy-vs-keep, not the caller.
- A small storage-leak class (orphaned-but-undestroyed assets) is tolerated
  in exchange for not taking cross-owner locks.

See `apps/api/src/modules/media/media.service.ts` +
`apps/api/src/modules/jobs/maintenance.service.ts` and the wave D1 spec
(`docs/06-specs/2026-07-11-admin-media-library-design.md`).
