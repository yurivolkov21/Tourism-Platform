# Destinations overview — fixed 4 featured per region

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/destinations-featured-4`

## Problem

`RegionGroup` is designed for **exactly 4 tiles** (1 feature + 3 photo) in one
full-bleed row. The `/destinations` overview renders **every** destination per
region from the API (`groupByRegion(tiles).items`), so Northern Vietnam (5 seeded
destinations) overflows to 5 tiles — the row narrows and the rhythm breaks. The
set also grows unbounded as destinations are added, and its order follows DB
insertion (not a curated "featured" pick).

## Goal

Each region shows a **fixed, curated set of 4** featured destinations, in a
deterministic order (first = the larger feature tile), independent of how many
destinations exist in the DB.

## Approach — frontend curation map (mirrors `HOME_BENTO`)

`lib/featured-destinations.ts`:

```ts
FEATURED_DESTINATIONS: Record<string, string[]> = {
  'Northern Vietnam': ['ha-long-bay', 'sa-pa', 'ninh-binh', 'hanoi'], // drop Ha Giang
  'Central Vietnam':  ['hoi-an', 'hue', 'da-nang', 'phong-nha'],
  'Southern Vietnam': ['phu-quoc', 'mekong-delta', 'ho-chi-minh-city', 'mui-ne'],
};
```

`pickFeaturedDestinations(items, region, limit = 4)` (pure, TDD'd):
1. take the curated slugs that exist in `items`, **in curated order**;
2. **pad to 4** from the remaining items (input order) if a curated slug is
   missing (renamed/unpublished) — so the row stays full and the design holds;
3. cap at `limit`. Unknown region (no curated list) → first 4 by input order.

Deterministic: adding a DB destination never changes the overview; removing a
curated one degrades gracefully (padded).

The page applies it per group before rendering `RegionGroup`:
`items={pickFeaturedDestinations(group.items, group.region)}`.

### Why not the alternatives
- `.slice(0, 4)` — still DB-order dependent (not curated, can shift). ✗
- `isFeatured`/`order` on the `Destination` model + admin UI — flexible but needs
  a migration + DTO + admin screen. YAGNI now; revisit if admin-controlled
  featuring is wanted. The curation is an editorial decision, fine in web code.

## Scope

Only the `/destinations` overview. The region detail `/destinations/[region]`
still lists the full set (separate surface, currently fixtures). No backend
change.

## Tests

`lib/featured-destinations.spec.ts` (web jest): curated order (North drops Ha
Giang) · pad-to-4 when a curated slug is absent · caps at 4 · unknown region
falls back to first 4 · fewer than 4 available returns all · no mutation.
Verification: build against the live API → each region renders exactly 4 tiles.
