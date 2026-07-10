# Site-media / Appearance (admin-managed brand chrome) — design spec

**Date:** 2026-07-10 · **Scope:** api + admin + web · **Status:** approved
(user 2026-07-10: all 13 images, dedicated admin "Appearance" page, model option A).

## Goal

The web app's brand-chrome imagery (home hero, Experiences/Why-choose/Trust backdrops,
CTA band, content-page hero, `/destinations` hero, auth panel, the 5 About-story
milestone photos) is hardcoded in components. Give the admin an **Appearance** surface
to replace any of them (Cloudinary upload) or reset to the built-in default, with the
web consuming the managed set — never breaking when a slot is empty.

## Non-goals

- Managing copy/text (i18n catalog stays the source; EN-only per ADR-0005).
- Attribution system, per-region cover entity, category imagery (separate debts).
- Blog-teaser fixture covers (they are an API-error fallback, not chrome).

## Slot catalog (code-defined, DB-backed)

| key | kind | web component (default stays as fallback) |
| --- | --- | --- |
| `home-hero` | single | `marketing/hero.tsx` |
| `home-experiences` | single | `marketing/experiences.tsx` |
| `home-why-choose` | single | `marketing/why-choose.tsx` |
| `home-trust` | single | `marketing/trust.tsx` |
| `cta-band` | single | `marketing/cta-band.tsx` |
| `content-hero` | single | `content/content-hero.tsx` (FAQ/Privacy/Terms) |
| `destinations-hero` | single | `destinations/destinations-hero.tsx` |
| `auth-panel` | single | `auth/auth-shell.tsx` |
| `about-story` | gallery (≤8, sorted) | `about/story.tsx` (5 milestone images) |

The catalog (keys, kind, admin labels, page grouping) lives in API code as a const;
the DB stores one row per slot so assets have a real `ownerId`.

## Architecture (approved option A — full media-pipeline reuse)

### API (`apps/api`)

- **Schema:** `MediaOwnerType` gains `SITE`; new model
  `SiteMediaSlot { id uuid pk, key varchar unique, createdAt, updatedAt }`; the
  migration seeds the 9 slot rows (INSERT … ON CONFLICT DO NOTHING by key).
  Assets live in `media_assets` (`ownerType=SITE`, `ownerId=slot.id`, role `hero`
  for singles / `gallery` for `about-story`) → **Media Library sees them, the
  Cloudinary GC protects them** — no GC changes needed.
- **Module `site-media`:**
  - `SiteMediaService` (TDD): `getPublicMap()` → `{ [key]: { url, width, height } | { images: [...] } }`
    (only slots that have assets — web falls back per-slot);
    `findAllForAdmin()` → catalog + current assets;
    `setSlotMedia(key, MediaInputDto[])` → validates key exists + kind (single ⇒ ≤1
    item, role hero; gallery ⇒ ≤8, role gallery) then `MediaService.syncAssets` in a
    tx (the `destinations.setMedia` pattern). Empty array = reset (assets removed →
    recorded as deferred Cloudinary garbage, same as every other owner).
  - Controllers: public `GET /site-media` (no auth, cacheable) · admin
    `GET /admin/site-media` + `PUT /admin/site-media/:key/media` (AdminGuard, same
    envelope/DTO conventions).
- **Uploads:** `UploadPurpose.SITE_CHROME` → folder `site`, image-only.

### Admin (`apps/admin`)

- Nav: **Appearance** item (Catalog group).
- `/appearance` page (Server Component): fetch admin list; sections by page group
  (Home · About · Destinations · Content · Auth); each single slot renders a card
  with preview (or "Default" badge), **Replace** (signed upload → PUT) and **Reset**
  (PUT `[]`, confirm dialog); `about-story` reuses the existing gallery-style media
  field flow (upload + reorder + remove → PUT).
- Server actions (`lib/appearance/actions.ts`): `setSlotMedia` / `resetSlot`
  (revalidatePath). Standard toasts/flash + `noValidate` conventions.

### Web (`apps/web`)

- `lib/api/site-media.ts`: `getSiteMedia()` — typed fetch of `GET /site-media`,
  ISR (`revalidate: 300`), returns `{}` on error (never throws into a page).
- `lib/site-media.ts` (pure, TDD): `siteImage(map, key, fallback)` → managed URL or
  fallback; `siteGallery(map, key, fallbacks)` → **all-real-or-fixture** (managed set
  only when non-empty, else the full fixture list — the region-imagery rule).
- The 9 components keep their current constants renamed `DEFAULT_*` and read the
  managed value: server components call `getSiteMedia()` directly; client components
  receive the resolved URL via a prop with the default as initializer (threaded from
  their server parent). `res.cloudinary.com` is already in `next/image`
  `remotePatterns` (real-content-authoring wave).

## Error handling

- Web: `getSiteMedia()` failure → empty map → every slot falls back to defaults
  (page never breaks; same degradation story as today).
- API: unknown slot key → 404 `SITE_SLOT_NOT_FOUND`; kind violations → 400 with a
  stable code; writes are transactional.

## Testing

- API: TDD `SiteMediaService` (map shape, kind validation, reset, unknown key) +
  e2e-light controller coverage consistent with other admin modules.
- Web: TDD `siteImage`/`siteGallery`; existing pages keep rendering with an empty map.
- Admin: action validation tests per house pattern.
- Adversarial review before merge (schema migration + GC interplay — standing rule).

## Definition of done

- Admin can replace/reset all 9 slots; changes appear on the deployed web after ISR
  revalidate; reset returns the exact current visuals; Media Library lists site
  assets; GC never collects a live site image; gate green across api/admin/web.
