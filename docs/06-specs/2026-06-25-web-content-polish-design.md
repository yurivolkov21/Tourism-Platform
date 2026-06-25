# Web content polish — bento casing · real tour counts · detailed itineraries

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/web-content-polish`

Two user-requested polish items, one branch (separate commits).

## #1 Destination bento tiles

### 1a — drop the ALL-CAPS tagline

`DestinationTile` renders `d.tagline` (a full-sentence description) with
`uppercase tracking-widest` in all 3 variants (eyebrow style meant for short
labels). Fix: render in the data's **natural sentence case** (remove
`uppercase tracking-widest`; keep size/opacity). Per-word Title Case reads
unnaturally on full sentences (e.g. "A UNESCO Seascape Of Thousands Of…"), so we
keep the sentence as written in the DB. CSS-only, one component.

### 1b — real tour counts (no fake/zero)

The home bento (`default` variant) shows `{d.tourCount} tours`, but the adapter
hardcodes `tourCount: 0` → every tile reads "0 tours". (The overview
feature/photo tiles don't show a count.) Compute the **real** count of published
tours that include each destination:

- `tallyToursByDestination(tours)` (pure, TDD) tallies each published tour's
  `destinations[].destination.slug` (M:N — a tour counts for every destination
  it visits).
- `fetchTourDestinationCounts()` GETs `/tours?pageSize=100` (raw summaries, which
  carry the full `destinations[]`) and tallies; the home page applies the counts
  to its bento tiles.
- i18n gains a small `toursCountLabel(n)` for "1 tour" / "N tours".
- **Seed:** add a **Mui Ne** day tour so every featured destination has ≥1
  published tour (Mui Ne currently has 0). No backend DTO change — counts are
  derived client-side from real published tours.

## #2 Tour-detail itinerary — timed milestones (Lily-style)

Lily breaks each day into **time-stamped milestones** (e.g. `07:30–08:00 Pickup`,
`10:30 Visit Hoa Lu`, `11:45 Lunch`, …), lighter on arrival/departure days. Our
seed has a single short sentence per day, rendered as one `<p>` (newlines
collapse), so travellers can't see what a day actually involves.

### Approach (seed data + small UI; no schema change)

- **Seed:** rewrite each day's `description` as **newline-separated milestone
  lines** (a leading `HH:MM`/`HH:MM–HH:MM` where it makes sense, Lily-style),
  within the existing `VarChar(2000)` per day (~6–8 lines ≈ 600–900 chars — well
  under the cap).
  - Enrich the 6 multi-day tours' itineraries (~26 days).
  - Add a **single timed day** to the day tours (they currently seed no
    itinerary → the detail page renders an empty itinerary section).
- **UI:** `parseItinerary(body)` (pure, TDD) splits the body into
  `{ time?, text }[]`; `TourItinerary` renders a **timeline list** (time
  emphasised, text beside) instead of one paragraph. Plain single-line
  descriptions still render fine (backward compatible).
- **Re-seed** the live DB (idempotent — the seed deletes+recreates itinerary,
  destinations, FAQs, policies per tour, and creates the new Mui Ne tour).

### Why not a `milestones` table (time + activity columns)

Accurate but heavy: migration + DTO + admin UI + more FE. The
newline-string + parser yields the same timeline visually with zero schema/admin
churn. Revisit only if admins must edit individual milestones.

## File organisation

The detailed timed itineraries (keyed by tour slug) are extracted from
`prisma/seed.ts` into `prisma/seed-itineraries.ts` so they don't push the seed
past the 800-line guideline; `seed.ts` reads `ITINERARIES[tour.slug]` and keeps
the catalog + upsert/runner logic.

## Tests / verification

- web jest: `tallyToursByDestination`, `parseItinerary`.
- `/seed` re-run is clean; live verify: home bento shows real counts + natural
  casing; a tour-detail itinerary renders timed milestones.

## Out of scope

Backend `toursCount` on `DestinationDto` (client-side tally is enough now);
region detail `/destinations/[region]` (still fixtures); booking/auth.
