# Spec — Admin Destination images (hero + gallery upload)

**Date:** 2026-06-30 · **Phase:** P4 admin (Media) · **Status:** approved design → plan
next · **Branch:** `feat/admin-destination-media` (to create)

Add image management to the destination create/edit form so the Destinations module
is complete: one **hero** image + up to **9 gallery** images per destination, uploaded
straight to Cloudinary via the existing signed-upload flow. Mirrors the proven web
avatar uploader (`apps/web/.../account/avatar-uploader.tsx`).

## Goals

- Attach a hero image and a small gallery to a destination, from **both** the create
  and edit forms, in a single submit.
- Reuse the existing direct-to-Cloudinary signed-upload pipeline (server never touches
  bytes). No new upload infrastructure.
- Keep the catalog consistent: ≤ 10 images per destination (1 hero + ≤ 9 gallery).

## Non-goals

- No video (BE has `DESTINATION_VIDEO`, out of scope here — images only).
- No standalone Media library page (images live with the destination, per the BE's
  per-owner media-set design).
- No cropping/editing; Cloudinary delivery transforms are applied at read time by the BE.
- Not touching Tours/Categories/etc. (Destinations only; the widget is reusable later).

## Backend change (one additive purpose)

`UploadPurpose` (`apps/api/src/modules/uploads/dto/create-signed-upload-url.dto.ts`) has
`DESTINATION_HERO` + `DESTINATION_VIDEO` but **no destination gallery slot** (only
`TOUR_GALLERY` exists). Add **`DESTINATION_GALLERY`**:

- Add the enum case `DESTINATION_GALLERY = 'DESTINATION_GALLERY'`.
- Map it in `uploads.service.ts` everywhere the purpose is switched on (folder +
  allowed `resourceType`/formats) — mirror `TOUR_GALLERY` (image folder, image formats).
  The DTO comment states the two mapping sites; update both.
- Extend `uploads.service.spec.ts`: a `DESTINATION_GALLERY` request signs into the
  expected folder and accepts an image format.
- Re-run `/regen-types` so `@tourism/core` knows the new enum value (optional — the FE
  sign call uses native `apiWrite` with a string purpose, so it does not block on regen).

The media model already supports this: `MediaRole` = `hero | gallery | avatar`,
`SetMediaDto` is replace-all (≤ 30 items), `DestinationDto.media: MediaItemDto[]`.

## Upload flow (per image, mirrors the web avatar uploader)

1. Admin picks a file in the widget.
2. Client calls the server action `signDestinationUpload(purpose, filename, contentType)`
   → `POST /admin/uploads/signed-url` (via `apiWrite`) → returns
   `{ signature, timestamp, apiKey, cloudName, folder, publicId, uploadUrl }`.
3. Client `fetch(uploadUrl, { method: 'POST', body: FormData })` straight to Cloudinary
   (`file`, `api_key`, `timestamp`, `signature`, `folder`, `public_id`) → response
   `{ public_id, format, width, height }`.
4. The item is added to the widget's in-memory list with its `role`, dims, and
   `sortOrder`. Nothing is persisted to our DB until the form is submitted.

`purpose` = `DESTINATION_HERO` for the hero slot, `DESTINATION_GALLERY` for gallery items.

## Frontend — `DestinationMediaField` (client component)

A new "Images" `FieldSet` section in `destination-form.tsx`, managing one media list in
React state (seeded from `destination.media` when editing):

- **Hero slot:** a single large drop target. Upload → preview; replace; remove. Role `hero`.
- **Gallery grid:** thumbnails. "Add images" (multi-select) appends; each tile has a
  remove button; **drag-to-reorder** via `@dnd-kit` (already a dep) sets `sortOrder`.
  Capped at **9**; the add control disables at the cap with a hint.
- Each upload shows a per-item busy state; a failed upload shows an inline error and is
  dropped from the list.

State item shape: `{ publicId: string; role: 'hero' | 'gallery'; format?: string;
width?: number; height?: number }`. The widget renders previews from the Cloudinary URL
it builds from `cloudName` + `publicId` (returned by the sign call), or from the
`MediaItemDto.url` for pre-existing items on edit.

## Form integration + save (create AND edit)

The widget serialises its list into a hidden input: `<input type="hidden" name="media"
value={JSON.stringify(list)} />`. On submit the server action:

- **Edit** (`updateDestination`): update the destination, then
  `PUT /admin/destinations/:slug/media` with the full set (replace-all).
- **Create** (`createDestination`): create → read the new `slug` from the response →
  `PUT /admin/destinations/:slug/media` with the set.
- Empty list → `media: []` (clears all images). The hero is optional (a destination may
  have none yet).
- An upload that is never submitted leaves an orphan Cloudinary asset; the BE's
  media-reconcile cron (already shipped) destroys unreferenced assets.

## Server actions (`lib/destinations/actions.ts` + a small media lib)

- `signDestinationUpload(purpose: 'DESTINATION_HERO' | 'DESTINATION_GALLERY', filename,
  contentType): Promise<{ params?: {...}; error?: string }>` — `apiWrite` POST to
  `/api/v1/admin/uploads/signed-url`; returns the Cloudinary params or a mapped error.
- Extend `createDestination` / `updateDestination`: after the create/update succeeds,
  parse the `media` field and `apiWrite` PUT `/api/v1/admin/destinations/{slug}/media`.
  A media PUT failure surfaces as a non-fatal warning on the returned state (the
  destination itself was saved) — wording: "Saved, but images couldn't be attached: …".

## Pure logic (TDD, ≥ 80% on new logic) — `lib/destinations/media.ts`

- `parseMediaField(json: string): MediaInput[]` — safe-parse, drop malformed entries,
  clamp gallery to 9, ensure at most one hero.
- `assembleMediaSet(items): MediaInput[]` — emit the hero first (role `hero`,
  `sortOrder` 0) then gallery in list order (role `gallery`, `sortOrder` 1..n), shaped as
  the API's `MediaInputDto` (`{ publicId, type: 'IMAGE', role, format?, width?, height?,
  sortOrder }`).
- `cloudinaryUrl(cloudName, publicId, format?)` — build a preview URL for just-uploaded
  items.

## Error / empty / edge

- Cloudinary upload fails → inline per-item error, item dropped, form stays usable.
- Sign 403 (`MEDIA_FORMAT_REJECTED`, wrong format) → inline error from the mapped message.
- Set-media 409 / 4xx → the "Saved, but images couldn't be attached" warning.
- No images → the section shows an empty hero drop target + an empty gallery hint.
- Accept `image/png, image/jpeg, image/webp` (match the avatar uploader).

## File / task breakdown (for the plan)

1. **BE**: `DESTINATION_GALLERY` purpose + service mapping + spec; `/regen-types`.
2. **FE media lib**: `lib/destinations/media.ts` pure helpers + spec (TDD).
3. **FE sign action**: `signDestinationUpload` in `lib/destinations/actions.ts`.
4. **FE widget**: `components/destinations/destination-media-field.tsx` (hero slot +
   gallery grid + dnd reorder + per-item upload).
5. **Form + actions**: wire the widget into `destination-form.tsx` (hidden `media` JSON,
   seed from `destination.media`); extend create/update actions to PUT the media set.
6. `/gate` + manual review on the deploy (upload hero + gallery, reorder, remove, save;
   create-with-images and edit-existing).

## Out of scope / follow-ups

- Destination video; a reusable media widget for Tours (Tours already has its own
  hero/gallery/video sub-forms pending in "Tours increment-2").
- Bulk upload / cropping.
