# Real content authoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the photo-heavy region pages + destinations overview derive their imagery from real `Destination.media[]` (fixtures as fallback), and seed real, correctly-located images so the deployed site shows real photos.

**Architecture:** Two parts. **(A) Engineering (subagent-driven, TDD):** a pure `region-imagery.ts` helper derives a region's hero/pool/gallery (and the overview editorial gallery) from the region's live destination media, falling back entirely to the existing curated fixtures when there is no uploaded media (all-real-or-fixture). Wire the two pages to consume it. **(B) Real images (controller-led, human-gated):** curate → visually vet → user-approve via a contact sheet → seed into `mediaAssets.json` (Cloudinary builder's absolute-URL passthrough) → apply to the live `media_assets` table behind a GO gate.

**Tech Stack:** Next.js 16 (App Router, RSC + ISR) · `@tourism/core` OpenAPI client · Cloudinary URL builder (absolute-URL passthrough) · Supabase (live data update via MCP) · Jest-style specs.

**Spec:** `docs/06-specs/2026-07-06-real-content-authoring-design.md` — read it first.

## STATUS — COMPLETE (2026-07-06, branch `feat/real-content-authoring`)

All 7 tasks done. **Part A** (T1 `region-imagery.ts` `2edd1fa` · T2 region-page wire + `gallery`-gap fix `3e4e3fb` · T3 overview wire `998f639`) — each subagent-reviewed clean; web gate green (lint + **191 tests** + build). **Part B** (T4 curate 52 images → contact sheet, user-approved overall; Củ Chi → reuse HCMC hero since no genuine Unsplash photo exists · T5 seed `919796d` (83 rows = 48 dest + 23 tour + 10 post + 2 avatar kept, 51 unique Unsplash urls) · T6 live `media_assets` synced via Supabase MCP under user GO — verified 48/23/10 real + 2 avatar untouched, 0 fake). **Final whole-branch review caught a Critical: T5 hand-edited only `json/mediaAssets.json`, but the seed loader reads `sample-data.ts` (via `insert.ts`) and both are `gen.cjs` outputs — so a fresh reseed / `node gen.cjs` would revert to fake. FIX `0d96e1f`: authored the real URLs in `gen.cjs` (single source) + regenerated `sample-data.ts` + `json/mediaAssets.json`; dropped the fake promo VIDEO + fake tour-gallery rows; `@tourism/api` typecheck + test green.** Docs swept (this file · CLAUDE.md · HANDOFF.md · frontend.md · roadmap.md). Pending: user source review → rebase + `--ff-only` merge.

## Global Constraints

- **`apps/web` code + `apps/api/prisma/fixtures` data only** — no schema, no backend logic, no money-path.
- **All-real-or-fixture per region:** a region with ANY real destination media derives its imagery entirely from real media; a region with none falls back entirely to its `lib/regions.ts` fixture. Never mix real + stock in one gallery.
- **Image source: Unsplash preferred** (already in the `next/image` allow-list, no attribution). Pexels only if needed → then add `images.pexels.com` to `next.config.js` `remotePatterns`. No Wikimedia/attribution system.
- **Location correctness is human-gated:** tags are never trusted; the agent visually inspects each candidate (Read-on-image) and the **user approves a contact sheet before any image is seeded**.
- **Live DB update is GO-gated:** `media_assets` rows only, never bookings/users/other tables; the exact change is shown and applied only after the user says GO.
- Straight quotes · Conventional Commits · **TDD on the pure helper** · do not reformat lines a task doesn't name · `/gate` (lint + test + build) green before declaring done.
- **Part A is independently mergeable** — with no real media, every region falls back to fixtures (no visual regression), so the engineering can ship before the images.

---

## File Structure

- Create: `apps/web/src/lib/region-imagery.ts` — pure derivation helpers.
- Create: `apps/web/src/lib/region-imagery.spec.ts` — unit tests.
- Modify: `apps/web/src/app/destinations/[region]/page.tsx` — consume `deriveRegionImagery`.
- Modify: `apps/web/src/app/destinations/page.tsx` — consume `deriveOverviewGallery`.
- Modify: `apps/api/prisma/fixtures/gen.cjs` — real image rows (Part B). **NB (execution correction): the seed loader reads `sample-data.ts` (via `insert.ts`), and both `sample-data.ts` and `json/mediaAssets.json` are GENERATED outputs of `gen.cjs` (`fixtures/README.md`: edit the generator, not the outputs). Author the URLs in `gen.cjs` and re-run `node gen.cjs`; do not hand-edit the JSON.**
- Modify (only if Pexels used): `apps/web/next.config.js` — add `images.pexels.com`.
- Scratch (not committed): a contact-sheet artifact for user review.
- Docs (after merge): `CLAUDE.md` · `HANDOFF.md` · `docs/01-architecture/frontend.md`.

---

## Task 1: `region-imagery.ts` derivation helpers (TDD)

**Files:**

- Create: `apps/web/src/lib/region-imagery.ts`
- Test: `apps/web/src/lib/region-imagery.spec.ts`

**Interfaces:**

- Produces: `fillTo(urls: string[], n: number): string[]`;
  `deriveRegionImagery(tiles: { gallery: string[] }[], fixture: RegionImagery): RegionImagery`
  where `RegionImagery = { image: string; images: string[]; gallery: string[] }`;
  `deriveOverviewGallery(tiles: { gallery: string[] }[], fixtureFrames: GallerySection[]): GallerySection[]`
  (`GallerySection` imported from `../components/marketing/gallery`).

- [ ] **Step 1: Write the failing test** `apps/web/src/lib/region-imagery.spec.ts`:

```ts
import { deriveRegionImagery, deriveOverviewGallery, fillTo } from './region-imagery';

describe('fillTo', () => {
  it('cycles urls to reach n', () => {
    expect(fillTo(['a', 'b'], 5)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });
  it('returns [] for empty input', () => {
    expect(fillTo([], 5)).toEqual([]);
  });
});

describe('deriveRegionImagery', () => {
  const fixture = { image: 'fx', images: ['fx1', 'fx2'], gallery: ['g0', 'g1', 'g2'] };

  it('returns the fixture unchanged when no destination has real media', () => {
    expect(deriveRegionImagery([{ gallery: [] }, { gallery: [] }], fixture)).toEqual(fixture);
  });

  it('derives from real media (deduped), filling the gallery to the fixture length', () => {
    const tiles = [{ gallery: ['r1', 'r2'] }, { gallery: ['r2', 'r3'] }];
    const out = deriveRegionImagery(tiles, fixture);
    expect(out.image).toBe('r1');
    expect(out.images).toEqual(['r1', 'r2', 'r3']);
    expect(out.gallery).toEqual(['r1', 'r2', 'r3']); // fillTo(3 urls, gallery length 3)
  });
});

describe('deriveOverviewGallery', () => {
  const frames = [{ images: [{ alt: 'a' }, { alt: 'b' }] }];

  it('returns the placeholder frames when no real media', () => {
    expect(deriveOverviewGallery([{ gallery: [] }], frames)).toEqual(frames);
  });

  it('fills srcs from real media, keeping the frame alts', () => {
    const out = deriveOverviewGallery([{ gallery: ['r1', 'r2', 'r3'] }], frames);
    expect(out).toEqual([{ images: [{ src: 'r1', alt: 'a' }, { src: 'r2', alt: 'b' }] }]);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module not found).
Run: `pnpm nx test @tourism/web --skip-nx-cache -- region-imagery`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/web/src/lib/region-imagery.ts`.**

```ts
import type { GallerySection } from '../components/marketing/gallery';

/** The imagery bundle a region page consumes (mirrors RegionData's image fields). */
export interface RegionImagery {
  image: string;
  images: string[];
  gallery: string[];
}

/** Cycle `urls` to produce exactly `n` entries (real photos, repeated only if short). */
export function fillTo(urls: string[], n: number): string[] {
  if (urls.length === 0) return [];
  return Array.from({ length: n }, (_, i) => urls[i % urls.length]);
}

/** Deduped real media urls across a set of destination tiles (empty for un-uploaded tiles). */
function realMediaUrls(tiles: { gallery: string[] }[]): string[] {
  return Array.from(new Set(tiles.flatMap((t) => t.gallery)));
}

/**
 * Region hero/pool/gallery from the region's real destination media, falling back
 * ENTIRELY to the curated fixture when the region has no uploaded media
 * (all-real-or-fixture — never mixed). `tiles` are the region's live destination
 * tiles (their `gallery` is empty when a destination has no uploaded media).
 */
export function deriveRegionImagery(
  tiles: { gallery: string[] }[],
  fixture: RegionImagery,
): RegionImagery {
  const real = realMediaUrls(tiles);
  if (real.length === 0) return fixture;
  return {
    image: real[0],
    images: real,
    gallery: fillTo(real, fixture.gallery.length),
  };
}

/**
 * Overview editorial gallery from all destinations' real media, falling back to the
 * placeholder frames when there is no uploaded media. Keeps the fixture frame's alt
 * captions, filling `src` from real media.
 */
export function deriveOverviewGallery(
  tiles: { gallery: string[] }[],
  fixtureFrames: GallerySection[],
): GallerySection[] {
  const real = realMediaUrls(tiles);
  if (real.length === 0) return fixtureFrames;
  const frame = fixtureFrames[0];
  const count = frame?.images.length ?? real.length;
  const images = fillTo(real, count).map((src, i) => ({ src, alt: frame?.images[i]?.alt ?? '' }));
  return [{ ...frame, images }];
}
```

- [ ] **Step 4: Run it — expect PASS.**
Run: `pnpm nx test @tourism/web --skip-nx-cache -- region-imagery`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/web/src/lib/region-imagery.ts apps/web/src/lib/region-imagery.spec.ts
git commit -m "feat(web): region/overview imagery derivation from destination media"
```

---

## Task 2: Wire the region page to derived imagery

**Files:** Modify `apps/web/src/app/destinations/[region]/page.tsx`

**Interfaces:**

- Consumes: `deriveRegionImagery` (Task 1); `fetchRegionBookables(name).destinations` are tiles with a `gallery: string[]`. **(Correction, discovered during execution: `selectRegionBookables` originally narrowed each tile to `{ name, slug }` and dropped `gallery`; this task was expanded to thread `gallery` through `RegionTile`/`RegionDestination` + the selector + its spec so the derivation gets real media. Landed in the same commit `3e4e3fb`.)**

- [ ] **Step 1: Import + compute the derived imagery.** After `const live = await fetchRegionBookables(data.name);` (currently line 50), add:

```tsx
  const imagery = deriveRegionImagery(live.destinations, {
    image: data.image,
    images: data.images,
    gallery: data.gallery,
  });
```

  Add the import near the other `lib` imports:

```tsx
import { deriveRegionImagery } from '../../../lib/region-imagery';
```

- [ ] **Step 2: Replace the fixture image reads with `imagery.*`.** In the same file:
  - `const pool = data.images;` → `const pool = imagery.images;`
  - `const g = data.gallery;` → `const g = imagery.gallery;`
  - In `<RegionHero ... image={data.image} ... />` → `image={imagery.image}`
  - In `<RegionIntro ... images={data.images.slice(1)} ... />` → `images={imagery.images.slice(1)}`
  - The signature/valueprops fallbacks `pool[4] ?? pool[0] ?? data.image` and
    `pool[3] ?? pool[0] ?? data.image` → replace the trailing `data.image` with
    `imagery.image` (so the final fallback is also real when media exists).
  Do NOT change the `bookables` fallback logic (tabs/tours) or any non-image line.

- [ ] **Step 3: Verify.**
Run: `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache`
Expected: PASS (a region with no real media still renders via fixtures — no behavior change until media is seeded).

- [ ] **Step 4: Commit.**

```bash
git add "apps/web/src/app/destinations/[region]/page.tsx"
git commit -m "feat(web): region page imagery from destination media (fixture fallback)"
```

---

## Task 3: Wire the overview editorial gallery to derived imagery

**Files:** Modify `apps/web/src/app/destinations/page.tsx`

**Interfaces:**

- Consumes: `deriveOverviewGallery` (Task 1); `fetchDestinationTiles()` returns tiles with `gallery: string[]`.

- [ ] **Step 1: Derive the gallery sections.** In `apps/web/src/app/destinations/page.tsx`,
  import the helper (near the other `lib` imports):

```tsx
import { deriveOverviewGallery } from '../../lib/region-imagery';
```

  Then, after the `Promise.all` that produces `tiles` (line 41-45), compute:

```tsx
  const editorialSections = deriveOverviewGallery(tiles, galleryFrames);
```

- [ ] **Step 2: Feed it into the Gallery.** Change
  `<Gallery variant="editorial" sections={galleryFrames} />` (line 68) to
  `<Gallery variant="editorial" sections={editorialSections} />`.

- [ ] **Step 3: Verify.**
Run: `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache`
Expected: PASS (empty media → placeholder frames unchanged).

- [ ] **Step 4: Commit.**

```bash
git add apps/web/src/app/destinations/page.tsx
git commit -m "feat(web): overview editorial gallery from destination media"
```

> **Part A (Tasks 1–3) is independently mergeable here.** It introduces no visual
> change until real media exists (every region/overview falls back to fixtures).
> Part B seeds the real media that makes it visible.

---

## Task 4: Curate + visually vet real images → contact sheet (CONTROLLER-LED, USER GATE)

**This task is executed by the controller, not a code subagent** — it involves
image research, visual inspection, and a user approval gate. Its deliverable is an
approved image list, not code.

**Subjects (from fixtures):** 16 destinations (each: 1 hero + 2–3 gallery) across
Northern (Hà Nội, Hạ Long Bay, Ninh Bình, Sa Pa, Hà Giang, Cát Bà), Central (Đà
Nẵng, Hội An, Huế, Phong Nha, Đà Lạt), Southern (Hồ Chí Minh City, Mekong Delta,
Phú Quốc, Mũi Né, Côn Đảo); 23 tour heroes; 10 post heroes. (Destination ids/slugs
- tour/post slugs are in `apps/api/prisma/fixtures/json/{destinations,tours,posts}.json`.)

- [ ] **Step 1: Source candidates.** For each subject, find a real, correctly-located
  **Unsplash** image (prefer iconic, visually-verifiable landmarks). Use WebSearch to
  locate the Unsplash photo page for the place, then the direct
  `https://images.unsplash.com/photo-<id>?w=1600&q=70&auto=format&fit=crop` URL.
  Prefer Unsplash (allow-listed); note any Pexels use separately.
- [ ] **Step 2: Visually vet each candidate.** Download each to the scratch dir and
  `Read` it (view the image). Reject gross location mismatches (e.g. an obviously
  wrong country/landmark). Record per-image: subject, url, source, and a confidence
  note (high for iconic-and-confirmed; low for generic-and-uncertain).
- [ ] **Step 3: Build a contact sheet** for review — an Artifact HTML page (or a
  markdown grid) grouped by subject, each showing the image + source URL +
  confidence. Keep destinations (hero + gallery) first (in-scope surfaces), then
  tour/post heroes.
- [ ] **Step 4: STOP — user approval gate.** Present the contact sheet and ask the
  user to approve / flag images to replace. Iterate on flagged ones. **Only
  user-approved images proceed to Task 5.** Record the final approved list to a
  scratch file (`approved-media.json`: subject → { role, url } entries).

---

## Task 5: Seed approved images into `mediaAssets.json`

**Files:**

- Modify: `apps/api/prisma/fixtures/json/mediaAssets.json`
- Modify (only if any Pexels url was approved): `apps/web/next.config.js`

**Interfaces:**

- Consumes: the approved image list from Task 4.

- [ ] **Step 1: Rewrite the media rows.** For each approved image, write a
  `MediaAsset` row into `mediaAssets.json` keeping the existing row shape
  (`id`, `type: "IMAGE"`, `ownerType`, `ownerId` = the subject's fixture id,
  `role` = `hero`/`gallery`, `format`, `width`, `height`, `sortOrder`,
  `createdAt`/`updatedAt`), but set **`publicId` = the approved absolute image URL**
  (the Cloudinary builder passes absolute URLs through as-is). Destinations gain a
  `hero` (sortOrder 0) + 2–3 `gallery` rows; each tour + post gains a real `hero`
  row (replacing its fake `nexora/…` publicId). Use fresh unique `id`s for new rows
  (follow the existing `a5000001-0000-4000-8000-0000000000NN` pattern).
- [ ] **Step 2: Allow-list Pexels only if used.** If any approved url is on
  `images.pexels.com`, add it to `apps/web/next.config.js` `images.remotePatterns`
  (mirror the existing `res.cloudinary.com`/`images.unsplash.com` entries). If all
  urls are Unsplash, skip this step.
- [ ] **Step 3: Validate the JSON + build.**
Run: `node -e "JSON.parse(require('fs').readFileSync('apps/api/prisma/fixtures/json/mediaAssets.json','utf8')); console.log('valid json')"`
Then: `pnpm nx build @tourism/web --skip-nx-cache` (next/image host validation passes).
Expected: valid JSON + build PASS.
- [ ] **Step 4: Commit.**

```bash
git add apps/api/prisma/fixtures/json/mediaAssets.json apps/web/next.config.js
git commit -m "feat(content): seed real destination/tour/post imagery (user-approved)"
```

---

## Task 6: Apply the real media to the live DB (GO-GATED, CONTROLLER-LED)

**This task mutates production data** (the live Supabase `media_assets` table). It
is media-only and runs only after an explicit user GO.

- [ ] **Step 1: Compose the exact change.** From the approved rows, build an
  idempotent SQL script that upserts the `media_assets` rows for the destination /
  tour / post owners (insert new rows, update the `public_id` of existing rows to
  the approved URL). Touch ONLY `media_assets` — no bookings/users/other tables.
- [ ] **Step 2: STOP — show the SQL + summary, ask for GO.** Post the row count +
  the exact statements. Do not apply until the user says GO.
- [ ] **Step 3: On GO — apply + verify.** Apply via the Supabase MCP
  (`execute_sql`, project `zxryyqhczgrbidjocwly`). Then verify with a read query
  (count of `media_assets` per ownerType + a spot-check that a destination's
  `public_id` is now the approved URL). Report the result.

---

## Task 7: Gate + docs sweep + merge gate

- [ ] **Step 1: Full gate.** `pnpm nx run-many -t lint test build --projects=@tourism/web --skip-nx-cache` → green.
- [ ] **Step 2: Manual smoke** (deployed preview): region pages + overview show the
  real images; a region whose destinations have no media still shows fixtures (no
  regression); no broken-image icons.
- [ ] **Step 3: Docs sweep (rule 9).** `CLAUDE.md` `@tourism/web` row +
  `docs/01-architecture/frontend.md` (region/overview imagery now derives from
  `Destination.media[]`, fixtures = fallback); `HANDOFF.md` (drop "curated editorial
  imagery stays static" for region/overview; record the seeded real images + the
  live media update); web test-count baseline if it changed (Task 1 adds ~6 tests).
- [ ] **Step 4: STOP for user source review → rebase + `--ff-only` merge** of
  `feat/real-content-authoring`.

---

## Self-Review (against the spec)

**Spec coverage:** Part 1 derivation helpers → Task 1; region wiring → Task 2;
overview wiring → Task 3; all-real-or-fixture → Task 1 logic (`real.length === 0`
guard); Part 2 curate/vet/contact-sheet → Task 4; seed via passthrough → Task 5;
Pexels allow-list → Task 5 Step 2; live GO-gated update → Task 6; image breadth
(16 dest + tour/post heroes) → Task 4/5; docs sweep → Task 7.

**Placeholder scan:** Tasks 1–3, 5, 7 carry exact code/commands. Tasks 4 & 6 are
deliberately procedural (image research + a production data change are human-gated,
not deterministic code) — their steps name concrete actions + STOP gates, not
"TBD". No vague "handle errors" steps.

**Type consistency:** `RegionImagery { image, images, gallery }` (Task 1) is the
exact shape the region page consumes (Task 2, replacing `data.image/images/gallery`).
`deriveOverviewGallery` returns `GallerySection[]` (Task 1) consumed by `<Gallery
sections>` (Task 3). `fillTo`/`deriveRegionImagery`/`deriveOverviewGallery` names
match across tasks. Tile shape `{ gallery: string[] }` matches the
`DestinationTileVM` field the pages pass.

**Deviation note:** Part B (Tasks 4–6) is controller-led + user-gated rather than
subagent-dispatched code — flagged for the executor so it doesn't try to hand image
curation to a code subagent.
