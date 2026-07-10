# Mobile Destinations Listing — Implementation Plan

**Spec:** [`2026-07-09-mobile-destinations-listing-design.md`](../06-specs/2026-07-09-mobile-destinations-listing-design.md)

## Tasks

### 1. `@tourism/core` — `destination-listing.ts` (TDD)

- [x] `filterDestinations`, `searchDestinations`, `sortDestinations`
- [x] `tallyToursByDestination`, `applyTourCounts`, `toDestinationCard`
- [x] `destination-listing.spec.ts`
- [x] Export from `index.ts`

### 2. Mobile API + hooks

- [x] `apps/mobile/src/lib/api/destinations.ts` — fetch tiles + tour counts
- [x] `use-destination-catalog.ts`
- [x] `destination-filter-types.ts`
- [x] `use-destinations-listing-state.ts`

### 3. UI components

- [x] `destination-card.tsx`
- [x] `destinations-catalog-list.tsx`
- [x] `destinations-filter-sheet.tsx` (region facet)
- [x] `destinations-sort-sheet.tsx`

### 4. Wire `tours.tsx`

- [x] Tab-aware `discoveryControls` (tours vs destinations)
- [x] Replace placeholder with `DestinationsCatalogList`
- [x] `prefilterDestination` on tours hook for card tap

### 5. i18n + verify

- [x] `messages.mobile.destinations`
- [x] `pnpm nx run @tourism/core:test --testPathPatterns=destination-listing`
- [x] `pnpm nx run @tourism/mobile:typecheck`
