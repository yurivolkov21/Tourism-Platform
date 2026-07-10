# Site-media / Appearance — implementation plan

**Spec:** [`docs/06-specs/2026-07-10-site-media-appearance-design.md`](../06-specs/2026-07-10-site-media-appearance-design.md)
**Branch:** `feat/site-media-appearance`

## STATUS

- **State:** 🔎 IN REVIEW — Tasks 1–5 + gate + adversarial review done (2026-07-10); awaiting user OK for the live migration + merge
- **Done:** Tasks 1–5; gate green (api 349 · web 230 · admin 164); adversarial review: 1 finding (gallery-upload Cloudinary leak) FIXED, all other surfaces verified sound
- **Next action:** user confirms → `prisma migrate deploy` on live Supabase → commit → ff-merge → docs sweep

## Tasks

### Task 1 — schema + migration (api)

- [x] `schema.prisma`: add `SITE` to `MediaOwnerType`; add
      `model SiteMediaSlot { id uuid pk default(uuid()), key @unique varchar(60), createdAt, updatedAt } @@map("site_media_slots")`.
- [x] Migration (`prisma migrate dev`): enum value + table + seed the 9 keys
      (`home-hero`, `home-experiences`, `home-why-choose`, `home-trust`, `cta-band`,
      `content-hero`, `destinations-hero`, `auth-panel`, `about-story`) via
      `INSERT … ON CONFLICT (key) DO NOTHING`.

### Task 2 — site-media module (api, TDD)

- [x] Slot catalog const (`site-media/slot-catalog.ts`): key → `{ kind: 'single'|'gallery', label, group }`.
- [x] `SiteMediaService` (spec first): `getPublicMap()` · `findAllForAdmin()` ·
      `setSlotMedia(key, MediaInputDto[])` (kind validation: single ⇒ ≤1 `hero`;
      gallery ⇒ ≤8 `gallery`; empty = reset) delegating to `MediaService.syncAssets`
      in a tx + `attachToOwner` for reads (destinations `setMedia` is the template).
- [x] Controllers + DTOs: public `GET /site-media` · admin `GET /admin/site-media`,
      `PUT /admin/site-media/:key/media`; wire module into `app.module`.
- [x] `UploadPurpose.SITE_CHROME` (dto enum + `uploads.service.ts` folder `site`,
      image resource type).

### Task 3 — regen types + web lib (TDD)

- [x] `/regen-types` against the updated spec (new DTOs land in `@tourism/core`).
- [x] `apps/web/src/lib/site-media.ts` (spec first): `siteImage(map, key, fallback)`
      + `siteGallery(map, key, fallbacks)` (all-real-or-fixture).
- [x] `apps/web/src/lib/api/site-media.ts`: `getSiteMedia()` — ISR 300s, `{}` on
      any error, React `cache()`.

### Task 4 — web consumption (9 components)

- [x] Rename hardcoded consts → `DEFAULT_*`; server components call
      `getSiteMedia()` + `siteImage(...)`; client components get the resolved URL
      as a prop (default = the `DEFAULT_*`) threaded from their server parent.
      Files: `marketing/hero.tsx`, `marketing/experiences.tsx`,
      `marketing/why-choose.tsx`, `marketing/trust.tsx`, `marketing/cta-band.tsx`,
      `content/content-hero.tsx`, `destinations/destinations-hero.tsx`,
      `auth/auth-shell.tsx`, `about/story.tsx` (gallery, index-aligned to
      milestones — all-real-or-fixture).

### Task 5 — admin Appearance page

- [x] Nav item **Appearance** (Catalog group, e.g. `Palette` icon) → `/appearance`.
- [x] `lib/appearance/data.ts` (GET admin list) + `actions.ts`
      (`setSlotMedia(key, media)` / `resetSlot(key)` → PUT; revalidate `/appearance`).
- [x] Page (Server Component) + `slot-card.tsx` client component: preview /
      "Default" badge · Replace (signed upload, purpose `SITE_CHROME`, reuse
      `lib/uploads.ts`) · Reset (AlertDialog confirm). `about-story` → gallery
      editor reusing the existing media-field flow. `loading.tsx` skeleton.
- [x] Action tests per house pattern.

### Task 6 — gate + adversarial review + merge + docs

- [x] Kill orphan node → `pnpm nx affected -t lint typecheck test build` green.
- [x] Adversarial review (schema migration + GC interplay + web fallback semantics).
- [ ] Apply the migration to the live DB (Supabase) — coordinate with the user.
- [ ] Report → user confirms → commit → ff-only merge → push.
- [ ] Docs sweep: this STATUS · roadmap · CLAUDE.md (api/admin/web rows + test
      counts) · HANDOFF · `docs/01-architecture/frontend.md` + `data-model.md` +
      `03-reference` endpoint catalogs (brand-chrome no longer hardcoded).
