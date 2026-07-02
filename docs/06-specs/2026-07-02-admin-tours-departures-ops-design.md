# Admin Tours + Departures ops visibility (Wave 5) — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/admin` list columns sweep · new departure detail page · tour detail ops
  cards, with three small additive `@tourism/api` changes. Wave 5 of the enrichment roadmap
  (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`) — the largest remaining wave.
- **Status:** approved direction, spec for execution
- **Trigger (audit findings):** Tours is "content-rich, commercially blind" (no bookings/revenue/
  wishlist/enquiry signals on the detail; list lacks thumbnail/rating/next-departure columns despite
  the data already shipping in `TourSummaryDto`); Departures is the thinnest module (no detail page,
  bookings never surfaced, `createdAt/updatedAt` rendered nowhere); Destinations/Categories lists
  lack thumbnail/tours-count columns.

## Key facts (verified)

- `TourSummaryDto` already carries `media[]`, `averageRating`, `reviewsCount`,
  `nextDepartureDate`, `nextDepartureSeatsLeft` → tours-list columns are pure FE.
- Destination list rows already carry `media[]` → destinations thumbnail is pure FE.
- `GET /admin/bookings` has NO `tourId`/`departureId` filter → the departure-detail bookings list
  needs two optional uuid filters added (small BE).
- `TourDeparture` rows already carry `seatsBooked/seatsTotal` → utilization is pure FE.
- Per-tour bookings/revenue/wishlist/enquiry aggregates do not exist → admin-only `ops` block on a
  new `AdminTourDetailDto` (the established admin-detail enrichment pattern).

## Slice A — List columns sweep

- **BE (small):** destinations + categories admin LIST payloads gain a `toursCount: number`
  (Prisma `_count` on the existing list queries; destinations count the M:N join rows, categories
  the 1:N tours). Additive DTO fields on the admin list DTOs only; public list behavior unchanged
  (if the DTO is shared, the field is harmless-additive there too). Regen.
- **FE:**
  - **Tours list** (`tours-table.tsx`): leading thumbnail column (hero from `media`, `FileText`-style
    placeholder box — the Posts cover-column treatment) · **Rating** column (★ `averageRating` ·
    `reviewsCount`, hidden at 0 reviews → "—") · **Next departure** column (date + "N seats left",
    "—" when null). All hideable; existing columns/filters untouched.
  - **Destinations list**: leading thumbnail column (same treatment) + **Tours** count column.
  - **Categories list**: **Tours** count column.
  - Deploy-lag guards: `toursCount ?? null` → render "—" until the API ships.

## Slice B — Departure detail page

- **BE (small):** `ListAdminBookingsQueryDto` += optional `tourId` + `departureId`
  (`@IsUUID()` each); the bookings service where-clause AND-composes them with the existing
  status/search filters. Additive; regen.
- **FE:** new read-only route **`/tours/[slug]/departures/[id]`** (template detail layout:
  back link to the departures list · header "Departure <start date>" + status Badge + Departed
  chip + Edit button + `RowActions` delete with `redirectTo`):
  - **Main column:** Bookings card — fetches `GET /admin/bookings?departureId=<id>&pageSize=100`
    server-side; compact table (Code → `/bookings/[code]` · Guest · Guests count · Total · Status);
    empty state "No bookings on this departure yet."
  - **Rail:** Details card (Start/End dates · Status · Price override or "Tour base" · Compare-at ·
    Created/Updated with relative time) + **Utilization card** (big `seatsBooked / seatsTotal`
    figure + percent bar — reuse the pipeline-bar treatment).
  - Departures list: the Start-date cell links to this detail (mirrors how every other list links
    its lead cell).
- The nested departures pages keep their per-tour context (back links, tour title).

## Slice C — Tour detail ops cards

- **BE:** new `AdminTourDetailDto extends TourDetailDto` with an admin-only `ops` block —
  `{ bookingsTotal: number; bookingsPaid: number; revenue: string; wishlistCount: number;
  enquiriesCount: number }` — returned ONLY by the admin `GET /admin/tours/:slug` (public tour
  reads untouched; same pattern as `AdminPostDetailDto`/`AdminDestinationDetailDto`). Aggregates:
  booking count / PAID count + PAID revenue sum / wishlist count / enquiry count, all by `tourId`,
  batched via `Promise.all` (pooler-safe). Service tests. Regen.
- **FE on `/tours/[slug]`:**
  - **Performance card** (main column, above or beside the merchandising rail): Bookings
    (`paid/total`) · Revenue (`formatMoney`) · Wishlist saves · Enquiries — 4 compact stat rows;
    link "View bookings" → `/bookings?q=` is NOT possible by tour, so the card links to
    `/tours/[slug]/departures` (the operational drill-down) instead — no fake links.
  - **Departures summary card:** next 3 upcoming departures (date + seats left + utilization mini-
    bar) via the existing `listDepartures(slug)` fetch, "View all" → the departures page; empty
    state "No upcoming departures — travellers see Private request only."
  - **Reviews row in the rail:** ★ `averageRating` (`reviewsCount` reviews) + link → `/reviews`.
  - Deploy-lag guard: `ops` optional on the FE type — cards hidden until the API ships it.

## Out of scope

- Per-departure revenue analytics · Users/customer module (wave 6 evaluates) · media library
  (wave 7) · any public web change · bookings-by-tour deep-link filters in the Bookings LIST UI
  (the BE filter lands for the departure page; a Bookings-page filter UI is deferred).

## Testing

- BE: service specs per slice (counts mapping; bookings where-composition incl. AND with
  status/search; tour ops aggregates incl. zero-safe). TDD.
- FE: columns/cards are typecheck/build-guarded reuse of reviewed patterns; utilization percent is
  trivial inline math (no new pure lib unless a helper emerges — if one does, TDD it in
  `lib/departures/format.ts`).
- Gate per slice; slices B + C → `ecc:code-reviewer` (BE surface); slice A self-certified if the
  `toursCount` BE addition survives its task review cleanly (it is two `_count` selects).
- Merging after green slices is pre-authorized.

## Risks

- **Aggregate cost (slice C):** five aggregates per tour-detail request on a sleepy Render
  instance — all indexed by `tourId` and batched; acceptable at this scale (detail page, not list).
- **Bookings filter (slice B):** must AND-compose (a `departureId` + `status` query must apply
  both); assert in a test.
- **Deploy-lag:** every new FE consumer guards (`?? null`/`?? []`/optional `ops`).
- **Route shape:** `/tours/[slug]/departures/[id]` sits beside the existing `[id]/edit` — verify no
  Next.js route collision (edit lives at `departures/[id]/edit`, detail at `departures/[id]` —
  standard nesting, no conflict).

## Success criteria

- Tours/Destinations/Categories lists show the sweep columns; a departure has a real detail page
  with its bookings + utilization; the tour detail answers "how is this tour doing commercially?"
  at a glance. Gate green per slice; B/C agent-reviewed.
