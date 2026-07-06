# Real content authoring — region/overview imagery from MediaAsset + real seed images

- **Date:** 2026-07-06
- **Candidate:** HANDOFF §Next action — "real content authoring". The catalog
  authoring loop (tour/destination/post/avatar text + images) is already
  engineering-complete; this closes the remaining gap: the photo-heavy
  **region pages** and **destinations overview** ignore `MediaAsset` and always
  render curated Unsplash fixtures, so an admin upload never surfaces there.
- **Scope:** two parts — (1) **Engineering (deterministic):** wire region-page
  hero/gallery/signature + overview editorial gallery to derive from the region's
  `Destination.media[]`, with the existing fixtures as fallback (`apps/web` only,
  no schema). (2) **Real images (human-gated):** curate real, correctly-located
  images (Unsplash/Pexels), visually vet + user-approve via a contact sheet, then
  seed them into `mediaAssets.json` (via the Cloudinary builder's absolute-URL
  passthrough) and apply to the live DB behind a GO gate.
- **Not a money-path feature.** No schema change. The live-DB media update is a
  data-only change (`media_assets` rows), gated on the user's GO.

## Locked decisions (brainstorming 2026-07-06)

1. **Wire only the Destination-media-backed surfaces this round:** region pages
   (hero + gallery + signature) + destinations-overview editorial gallery. The
   model-less brand chrome (home hero, experiences/why-choose/trust backdrops,
   about/FAQ/legal/CTA heroes) is **deferred** — it needs a new "site/page media"
   model + admin surface (a separate future feature).
2. **All-real-or-fixture per region (decision "a"):** if a region has ANY real
   uploaded destination media, its imagery is derived entirely from real media;
   if it has none, it falls back entirely to the region's curated fixture. Never
   mix real photos and stock fixtures in one gallery.
3. **Image source preference: Unsplash/Pexels** (licenses require no attribution)
   → no attribution field/system needed. Prefer **iconic, visually-verifiable
   landmarks**. Wikimedia (attribution-required) only if a place is otherwise
   uncoverable — and if so, we skip that place (fixture fallback) rather than
   build an attribution system.
4. **Location correctness is human-gated.** Tags are not trusted. Verification =
   three layers: (i) prefer place-authoritative / iconic sources; (ii) the agent
   downloads each candidate and **visually inspects it** (Read-on-image) to reject
   gross mismatches + records a confidence note; (iii) the user eyeballs a
   **contact sheet** and approves before anything is seeded to production.
5. **Image breadth:** all **16 destinations** (hero + 2–3 gallery each — enough for
   a real region gallery) + **tour and post heroes** (replace the fake `nexora/…`
   publicIds that currently 404, for a coherent site). Tour gallery / video and
   post body images are out of scope this round.
6. **Live rollout is GO-gated:** update the committed fixtures (for future
   re-seeds) AND apply the same real-image rows to the live Supabase
   `media_assets` table (media-only, never touching bookings/users) — only after
   the user approves the contact sheet and says GO.

## Verified facts (from code/fixtures, 2026-07-06)

- **Region pages ignore MediaAsset for imagery:** `app/destinations/[region]/page.tsx`
  renders `<RegionHero image={data.image}>` + gallery/signature from
  `lib/regions.ts` fixtures (Unsplash builders). Live data (`fetchRegionBookables`)
  is used ONLY for the destination tabs + tour cards. An admin destination upload
  never reaches the region hero/gallery/signature.
- **Overview editorial gallery is alt-only placeholders:** `app/destinations/page.tsx`
  `galleryFrames` have no `src` → gradient tiles (comment: "maps to MediaAsset later").
- **The destination VM already carries real media:** `toDestinationTile(dto)`
  (`lib/api/destinations.ts:24-39`) sets `image: hero?.url ?? PLACEHOLDER_IMG` and
  `gallery: dto.media.map(m => m.url)` — `gallery` is **empty when the destination
  has no uploaded media**, so `gallery.length > 0` is a reliable "has real media"
  signal. `fetchRegionBookables(regionName)` (`:56-68`) returns the region's
  destination tiles (+ tours) and is already called by the region page.
- **Cloudinary builder has an absolute-URL passthrough:** `lib/cloudinary-url.ts`
  returns an absolute `http(s)` `publicId` as-is (instead of composing a Cloudinary
  URL). So a `MediaAsset.publicId` storing a real Unsplash URL renders directly.
- **Current seed media is fake + broken:** `prisma/fixtures/json/mediaAssets.json`
  (23 rows) stores `nexora/<type>/<slug>/<role>` publicIds that don't exist in the
  configured Cloudinary cloud → **404** on every wired surface (tour cards/detail,
  destination tiles, blog covers). Only 3 destinations have a (fake) hero, no
  gallery. All 23 tours + 10 posts + 16 destinations otherwise lack real imagery.
- **Fixtures:** 16 destinations across 3 regions — **Northern Vietnam** (Hà Nội,
  Hạ Long Bay, Ninh Bình, Sa Pa, Hà Giang, Cát Bà), **Central Vietnam** (Đà Nẵng,
  Hội An, Huế, Phong Nha, Đà Lạt), **Southern Vietnam** (Hồ Chí Minh City, Mekong
  Delta, Phú Quốc, Mũi Né, Côn Đảo); 23 tours; 10 posts.
- **next/image allow-list** (`apps/web/next.config.js`): `images.unsplash.com` +
  `res.cloudinary.com`. Unsplash passthrough URLs render; **Pexels
  (`images.pexels.com`) would need adding to `remotePatterns`** if used.

## Design

### Part 1 — Engineering: derive region/overview imagery from MediaAsset

**New pure helper** `apps/web/src/lib/region-imagery.ts` (+ `.spec.ts`, TDD):

- `deriveRegionImagery(regionDestinations, fixture)` where `regionDestinations` is
  the region's tiles (each has `image` + `gallery: string[]`) and `fixture` is the
  region's existing `lib/regions.ts` imagery (`{ hero, gallery, signature }`):
  - Compute `realUrls = dedupe(regionDestinations.flatMap(d => d.gallery))`
    (real media only — `gallery` is empty for un-uploaded destinations).
  - If `realUrls.length > 0` → return `{ hero: realUrls[0], gallery: realUrls (capped, e.g. ≤ N), signature: pick from realUrls }`.
  - Else → return the `fixture` unchanged.
- `deriveOverviewGallery(allTiles, fixtureFrames)`:
  - `realUrls = dedupe(allTiles.flatMap(t => t.gallery))`.
  - If non-empty → build gallery frames from `realUrls` (capped); else the existing
    alt-only `fixtureFrames`.

**Wiring:**
- `app/destinations/[region]/page.tsx`: after fetching `fetchRegionBookables(data.name)`,
  pass `regionBookables.destinations` + the region's `data` fixture through
  `deriveRegionImagery`; feed the result into `<RegionHero>`, the gallery sections,
  and the signature blocks (replacing the always-fixture `data.image`/`data.gallery`).
- `app/destinations/page.tsx`: feed `fetchDestinationTiles()` + the current
  `galleryFrames` through `deriveOverviewGallery` for the editorial gallery.
- The destination tabs + tour cards (already live) are unchanged. `lib/regions.ts`
  is retained as the fallback source.

### Part 2 — Real images: curate → vet → approve → seed

1. **Curate** real images per subject (16 destinations: hero + 2–3 gallery;
   23 tour heroes; 10 post heroes) from Unsplash/Pexels, preferring iconic,
   correctly-located landmarks. Prefer Unsplash (already allow-listed); if Pexels
   is used, add `images.pexels.com` to `next.config.js` `remotePatterns`.
2. **Agent visual vet:** download each candidate and inspect it (Read-on-image);
   reject gross location mismatches; record a per-image confidence + source URL.
3. **Contact sheet:** produce a reviewable artifact (an HTML/markdown grid: subject
   → image → source → confidence) and **stop for the user to eyeball + approve**.
   Only approved images proceed.
4. **Seed:** write the approved absolute image URLs into
   `prisma/fixtures/json/mediaAssets.json` as `MediaAsset` rows (publicId = the
   URL, via the passthrough). Expand destination media to hero + gallery; replace
   the fake tour/post hero publicIds. Keep the existing row shape (id, type, owner,
   role, sortOrder, dimensions).
5. **Apply to live (GO-gated):** update the live Supabase `media_assets` rows to
   match (idempotent, media-only — no bookings/users/other tables). Present the
   exact change for the user's GO before applying. (Fixtures cover future
   re-seeds; the live update makes the deployed site show them now.)

### Fallback + edge behavior

- A region with zero uploaded destination media renders exactly as today (fixtures)
  — no visual regression while content is incomplete.
- `next/image` only accepts allow-listed hosts; every seeded URL must be Unsplash
  (or Pexels after the allow-list addition) so region/overview images load.

## Testing

- **TDD (pure logic):** `region-imagery.spec.ts` — real media present → derived
  from real (hero = first, gallery deduped/capped, signature picked); empty →
  fixture returned unchanged; dedupe; cap. Mirror the web pure-helper spec idiom.
- **Visual:** manual on the deployed preview (region pages + overview show the real
  images; a media-less region still shows fixtures). No component unit tests.
- **Image correctness:** the contact-sheet review gate is the test for location
  accuracy — not automatable.

## Docs sweep (rule 9, after merge)

- `CLAUDE.md` `@tourism/web` row + `docs/01-architecture/frontend.md`: note region/
  overview imagery now derives from `Destination.media[]` (fixtures = fallback).
- `HANDOFF.md`: drop "Only curated editorial imagery stays static" for region/
  overview; record the seeded real images + the live media-data update.
- Web test-count baseline if the new spec changes it.

## Out of scope / future

- **Brand chrome imagery** (home hero, experiences/why-choose/trust, about/FAQ/
  legal/CTA heroes) — needs a "site/page media" model + admin settings surface;
  separate future feature.
- **Attribution system** (would only be needed for Wikimedia/CC-BY sources — avoided
  by preferring no-attribution sources).
- **Tour gallery/video + post body images** beyond heroes — later content work.
- A real per-region "cover" entity — regions remain a `Destination.region` string;
  imagery is derived, not a first-class field.

## Open questions

None blocking. Real-world image quality + the exact per-place source is assessed
during implementation and gated by the contact-sheet review (user, 2026-07-06).
