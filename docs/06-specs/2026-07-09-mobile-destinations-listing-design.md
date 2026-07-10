# Mobile Destinations Listing — Design Spec

**Date:** 2026-07-09 · **Phase:** P5 mobile · **Status:** approved for implementation

## Problem

The Destinations browse tab is a placeholder. Users expect parity with Tours: live data,
search, region filter, and sort — in the same discovery toolbar as header search.

## Goals

1. Replace `ToursDestinationsPlaceholder` with a real FlatList of destinations from API.
2. Client pipeline: `filterDestinations → searchDestinations → sortDestinations` (parity with Tours).
3. Tab-aware discovery controls: Tours facets vs Destinations facets (region only for MVP).
4. Tap destination → switch to Tours tab with that destination pre-filtered.

## Non-goals (MVP)

- Region detail screens (`/destinations/[region]`) — follow-up.
- Styles/themes facets (not on destination model).
- Persist filters / deep links.
- Server-side destination search (client over loaded set; API `search` param optional later).

## Data

| Source | Endpoint | Usage |
|--------|----------|--------|
| Destinations | `GET /api/v1/destinations?pageSize=100` | List tiles |
| Tour counts | `GET /api/v1/tours?pageSize=100` (raw summaries) | `tallyToursByDestination` |

`DestinationCardData` = `DestinationSummary` + `image` (hero media or fallback).

## Filter / sort facets

| Facet | Values | Notes |
|-------|--------|-------|
| Region | `Northern Vietnam`, `Central Vietnam`, `Southern Vietnam`, `Other` | OR within facet; matches `groupByRegion` buckets |
| Sort | `tours-desc` (default), `name-asc`, `name-desc` | Client-side |

Search (shared header) filters `name`, `description`, `region` — accent-insensitive via `normalizeText`.

## Layout

Same discovery block as Tours (header):

```text
[Profile]
[Recommendation + Search]
[Filters | N destinations | Sort]   ← tab-specific
[Region chips if filtered]
──────── divider ────────
[Tours | Destinations]
[List]
```

Controls visible on Destinations tab always (including search overlay).

## Empty states

| Condition | UI |
|-----------|-----|
| `debouncedQuery` + 0 results | `ToursSearchEmptyState` (destination copy) |
| region filter, no query, 0 | `empty` + clear filters CTA |
| no filter, no query, 0 API rows | generic empty |

## Navigation

Tap destination card → `selectBrowseTab('tours')` + `prefilterDestination(name)`.

## Tours vs Destinations (IA)

- **Destinations tab** is the only place users pick *where* to go (region filter + browse).
- **Tours filter sheet** excludes the destination facet (category · duration · price only).
- Destination context on Tours appears as a prefilter bar after drilling from Destinations, not as a filter chip.

## Shared logic (`@tourism/core`)

New module `destination-listing.ts`:

- `DestinationFilters`, `DestinationSort`, `DestinationCardData`
- `filterDestinations`, `searchDestinations`, `sortDestinations`
- `tallyToursByDestination`, `applyTourCounts`, `toDestinationCard`

## i18n

New `messages.mobile.destinations` — labels for facets, sort, counts, empty/error.
