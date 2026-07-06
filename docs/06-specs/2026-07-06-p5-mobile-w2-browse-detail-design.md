# P5 mobile — Wave 2: Browse & detail (Explore + tour detail + enquiry)

- **Date:** 2026-07-06
- **Phase:** P5 (mobile), Wave 2 of 4 — follows
  [W1 Foundation](2026-07-06-p5-mobile-w1-foundation-design.md) (merged +
  on-device verified 2026-07-06).
- **Scope:** `apps/mobile` (real Explore tab · tour-detail stack screen ·
  enquiry modal) · `libs/mobile/ui` (three new generic primitives) ·
  `@tourism/i18n` (new `mobile.explore` / `mobile.tourDetail` /
  `mobile.enquiry` copy). **No backend changes** — every endpoint W2 needs
  already exists and is typed in `@tourism/core`.
- **Process note:** branch `feat/mobile-w2-browse-detail` in the **main
  checkout** (no worktree — standing user rule since 2026-07-06). Work runs
  **inline** (no implementation subagents) at the user's request.

## Locked decisions (brainstorming 2026-07-06)

1. **Full W2 scope as sketched in the W1 spec**: tours listing with search +
   filters, browse-by-destination, tour detail at **full parity with web's
   sections**, and the "Inquire now" enquiry form.
2. **Data strategy = load-all + client-side** (same as web): one query fetches
   all published tours (`pageSize=100`), then `searchTours` / `filterTours` /
   `sortTours` from `@tourism/core` run client-side. Instant-as-you-type
   search, no refetch per keystroke, minimal load on the Render free tier.
   Revisit only if the catalogue outgrows one page.
3. **Explore is a single screen.** Browse-by-destination = a horizontal
   destination chips rail inside Explore; tapping a chip toggles a destination
   filter on the list below. No separate destination screens this wave.
4. **Tour detail = full parity with web**: gallery, rating/badge, facts,
   next-departure + seats-left, overview, highlights, itinerary, included /
   excluded, reviews, FAQs, policies, sticky price + CTA bar.
5. **Enquiry = bottom-sheet modal route** (`presentation: 'modal'`) over the
   detail screen; success confirms inside the modal then returns to the tour.

## Verified facts (from code, 2026-07-06)

- `GET /api/v1/tours` supports `page/pageSize/category/destination/featured/
  search/sortBy/sortOrder` (schema.ts `ToursController_list`) — W2 uses only
  `pageSize` (client-side strategy). Response = `{ data, meta }` envelope of
  `TourSummaryDto`.
- `GET /api/v1/tours/{slug}` → enveloped `TourDetailDto` with **everything the
  detail screen renders**: `media[]`, `itinerary[]`, `highlights[]`,
  `included[]/excluded[]`, `faqs[]`, `policies[]`, `maxGroupSize`,
  `difficulty`, `suitableFor`, `badges`, `averageRating`/`reviewsCount`, and
  `nextDepartureDate`/`nextDepartureSeatsLeft` (seats-left needs no extra
  call). 404 on unknown/unpublished slug.
- `GET /api/v1/tours/{slug}/reviews` → enveloped `PublicReviewDto[]`
  (PII-stripped; web fetches `pageSize: 9`).
- `GET /api/v1/destinations` → destination list incl. media (web already maps
  name/slug/hero from it).
- `POST /api/v1/enquiries` is public + throttled (5/min per IP);
  `CreateEnquiryDto` = `name · email · phone? · message · tourId?` (+ optional
  nationality/travelDate/partySize the mobile form does not send). Web maps a
  429 to a tailored "too many requests" message — mobile mirrors that.
- `@tourism/core` pure helpers (TDD'd): `filterTours` (facet OR within /
  AND across; duration buckets `1|2-3|4+`, price buckets `<100|100-300|300+`),
  `searchTours` (accent/case-insensitive over title + destination +
  categoryName), `sortTours` (`popular|price-asc|price-desc|rating`).
  `FilterableTour` needs `destination · durationDays · basePrice · rating ·
  reviewCount · category?`; `SearchableTour` needs `title · destination ·
  categoryName?` — both structural.
- Mobile W1 already has: `TourCardVm`/`toTourCardVm` + `fetchFeaturedTours`
  (`src/lib/tours.ts`), `TourCard` (240-wide horizontal-shelf card, **not
  pressable yet**), api client singleton, TanStack Query provider, theme +
  primitives (`AppText/Screen/Spinner/Button/Card`), i18n `mobile.*` pattern,
  and the loading/error/empty + pull-to-refresh patterns on Home.
- Expo Go constraint holds (W1 decision #2): Expo-Go-compatible deps only. W2
  needs **no new native dependency** — gallery paging, chips, accordion are
  all core RN + `expo-image`.

## Design

### 1. Routes (expo-router)

```text
apps/mobile/src/app/
  (tabs)/explore.tsx           ← real Explore screen (replaces placeholder)
  tours/[slug]/index.tsx       ← tour detail — stack screen over the tabs (back button)
  tours/[slug]/enquiry.tsx     ← enquiry modal (presentation: 'modal' via root _layout)
```

Root `_layout.tsx` declares the two new `Stack.Screen`s (detail: default card
presentation, themed header with back; enquiry: `presentation: 'modal'`).
`TourCard` becomes pressable everywhere it appears — Home's featured shelf and
Explore's list both `router.push('/tours/<slug>')`.

### 2. Data layer (`apps/mobile/src/lib/` — every mapper/pure fn TDD)

- **`tours.ts` (extend):** `TourCardVm` gains `basePrice` (rename of `price`),
  `compareAtPrice?`, `rating`, `reviewCount`, `category?`, `categoryName?` so
  it is **structurally compatible with `FilterableTour` + `SearchableTour`**
  and core helpers apply directly. `toTourCardVm` maps the new fields
  (`Number(dto.basePrice)`, `averageRating`, `reviewsCount`, category
  slug/name). New `fetchAllTours(): Promise<TourCardVm[]>` (`pageSize: 100`,
  no `featured` flag). Home's `TourCard` price line updates to `basePrice`.
- **`explore-state.ts` (new, pure — the wave's TDD core):**

  ```ts
  interface ExploreState {
    query: string;
    destination?: string;        // destination *name* (filterTours matches on name)
    durations: DurationBucket[];
    prices: PriceBucket[];
    sort: TourSort;              // default 'popular'
  }
  applyExploreState(tours: TourCardVm[], state: ExploreState): TourCardVm[]
  ```

  Composition: `searchTours(query)` → `filterTours({ destinations, durations,
  prices })` → `sortTours(sort)`. Also a `defaultExploreState` constant and a
  tiny `toggleBucket` helper for chip toggling. No I/O.
- **`tour-detail.ts` (new):** `TourDetailVm` (id, slug, title, destination,
  durationDays, maxGroupSize, difficulty?, basePrice, compareAtPrice?,
  currency, rating, reviewCount, badge?, nextDepartureDate?,
  nextDepartureSeatsLeft?, overview, gallery: string[], highlights,
  itinerary: {day,title,body}[], included, excluded,
  faqs: {question,answer}[], policies: {kind,title,body}[]) +
  `toTourDetailVm(dto)` (pure, TDD — web's meals/transport/accommodation
  parsing is **not** ported; mobile shows facts the DTO actually has) +
  `fetchTourDetail(slug)` (unwraps envelope, `null` on 404) +
  `fetchTourReviews(slug)` → `{id, author, date, rating, quote}[]`
  (`pageSize: 6`).
- **`destinations.ts` (new):** `DestinationChipVm { slug, name, image? }` +
  `toDestinationChipVm` (pure, TDD) + `fetchDestinations()`.
- **`enquiry.ts` (new):** `validateEnquiry(input)` — pure, TDD: name
  non-empty · email matches a pragmatic regex · message non-empty · phone
  optional; returns per-field error keys (i18n keys, not strings). +
  `submitEnquiry(input & { tourId })` → `POST /api/v1/enquiries`.

TanStack Query keys: `['tours','all']` · `['tours','detail',slug]` ·
`['tours','reviews',slug]` · `['destinations']`. Same retry/staleness defaults
W1 set globally; Home's existing `['tours','featured']` stays as-is.

### 3. `@tourism/mobile-ui` — three new generic primitives (tests like W1)

- **`TextField`** — label + input + error slot, themed borders/placeholder;
  multiline variant (enquiry message). Used by Explore search + enquiry form.
- **`Chip`** — selectable pill (selected/unselected themed states, optional
  leading image for destination chips), `accessibilityState.selected`.
- **`Accordion`** — self-contained expand/collapse item (title row + chevron,
  `LayoutAnimation`-free simple conditional render for Go compatibility).

Product-specific composites stay in the app (`components/`): full-width
`TourListCard` variant (or a `variant` prop on the existing `TourCard`),
`GalleryPager` (horizontal paging `FlatList` of `expo-image` + dot
indicators), `RatingRow`, `SectionHeading`, `EnquiryForm`.

### 4. Explore screen (`(tabs)/explore.tsx`)

Layout top → bottom (single `FlatList` with header components so the whole
screen scrolls):

1. Search `TextField` (instant filter as you type — no debounce, no refetch).
2. Destination chips rail (horizontal; chip = image + name; tap toggles the
   single active destination filter).
3. Filter chips row: duration buckets (`1` / `2–3` / `4+` days) · price
   buckets (`<$100` / `$100–300` / `$300+`) · sort selector (popular ·
   price ↑ · price ↓ · rating) — sort rendered as chips too (one active).
4. Result count line ("N tours").
5. Vertical list of full-width tour cards (image · destination + duration ·
   title · rating + review count · from-price) — pressable → detail.

States mirror Home's W1 patterns: skeleton cards + cold-start hint (loading) ·
friendly error + Retry · empty results with a "clear filters" action ·
pull-to-refresh. All copy under `messages.mobile.explore`.

### 5. Tour detail (`tours/[slug]/index.tsx`)

Scroll body: `GalleryPager` (all `media[]` urls, dots) → title + rating row +
merchandising badge → facts row (duration · max group size · difficulty when
present) → **next departure line with seats-left** (hidden when
`nextDepartureDate` is null) → overview (summary) → highlights (bulleted) →
itinerary (`Accordion` per day) → included / excluded (two check/cross lists)
→ reviews (first 6: author · date · stars · quote; section hidden when empty)
→ FAQs (`Accordion`) → policies. Compare-at price renders struck-through next
to the base price where shown.

**Sticky bottom bar** (outside the scroll): "From $X" + primary **Inquire
now** button → pushes the enquiry modal. (W4 will add "Book" beside it.)

Edge cases: unknown slug / 404 → in-screen "tour not found" state with a back
action (no crash); loading → spinner screen; error → retry. Copy under
`messages.mobile.tourDetail`.

### 6. Enquiry modal (`tours/[slug]/enquiry.tsx`)

Bottom-sheet modal titled with the tour name. Form: name · email · phone
(optional) · message via `TextField`s; validate on submit with
`validateEnquiry` (field-level errors, i18n); keyboard-avoiding view. Submit →
TanStack `useMutation` → success swaps the form for a thank-you state (icon +
copy) and auto-dismisses after ~1.5s; failure shows an inline error banner and
**keeps the typed input** — a 429 gets the dedicated "too many requests, try
again in a minute" copy (like web), any other failure the generic one. No auth
required (public endpoint). `tourId` comes from the detail query already in
the cache for the same slug. Copy under
`messages.mobile.enquiry`.

### 7. Testing & gate

- **TDD (pure):** `applyExploreState` + `toggleBucket` (search+filter+sort
  composition, empty facets, ordering) · `validateEnquiry` · `toTourDetailVm`
  (field mapping, nulls, seats-left absent) · `toDestinationChipVm` · extended
  `toTourCardVm`.
- **Component tests (mocked query client, jest-expo):** Explore loading /
  error / empty / success + chip toggle filters the list + search narrows it ·
  detail renders sections + 404 state · enquiry validates, submits, success +
  error paths · `TextField` / `Chip` / `Accordion` render + interact.
- **Gate:** `pnpm nx run-many -t lint typecheck test` for `@tourism/mobile`,
  `@tourism/mobile-ui` (+ `nx affected` to prove web/admin untouched); mobile
  `build` stays excluded (EAS cloud). Manual verification: Expo Go on the
  user's Android phone — browse, filter, open detail, submit a real enquiry
  against the Render API.

### 8. Out of scope (explicit)

- Wishlist hearts on cards / Saved tab (W3) · auth (W3) · booking CTA +
  departures picker (W4) · destination detail screens · category facet UI
  (API supports it; chips row stays duration/price/sort this wave) · blog /
  contact / newsletter (cut from P5) · offline caching · push notifications.

### 9. Risks / notes

- **Expo SDK 54 / expo-router are post-training** — read live docs (context7 /
  Expo MCP) before writing the modal route + nested `[slug]` layout config.
- **Render cold start** hits Explore's first load the same way as Home — reuse
  the "waking the server…" hint pattern.
- **`TourCardVm.price` → `basePrice` rename** touches W1's Home card + tests —
  small, mechanical, but don't forget the spec updates.
- **Destination chip filter matches on destination *name*** (that's what
  `FilterableTour.destination` holds) — the chips VM must pass names, not
  slugs, into the filter state.
- `origin/nghia` stays untouched (standing rule).
