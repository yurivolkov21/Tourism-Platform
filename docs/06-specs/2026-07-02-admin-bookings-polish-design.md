# Admin Bookings polish (Wave 6) — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/admin` booking-detail enrichment (customer identity + other bookings ·
  PaymentEvent trail · session reference · seats-remaining) with one additive `@tourism/api`
  detail-DTO change + one list-filter param, plus the Wave-5 follow-up `@@index([tourId])`
  migration. Wave 6 of the enrichment roadmap
  (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction, spec for execution
- **Trigger (audit findings):** Bookings has "good lifecycle/audit; customer blind spot" — the
  `user` relation is never joined (admin sees only the contact snapshot, cannot jump to the
  customer's other bookings), `PaymentEvent` webhook history is never surfaced (debugging stuck
  payments), `providerSessionId` is missing from the detail DTO (pre-capture debugging), and the
  Trip card shows no departure capacity context.

## Key facts (verified)

- `Booking.userId` is a required FK (`user` relation always present) → the `customer` block on
  the detail is non-nullable.
- `PaymentEvent` has **no FK to Booking** — linkage lives in the payload, exactly where the
  webhook handlers read it: Stripe `payload->'data'->'object'->'metadata'->>'bookingId'`
  (set at checkout-session mint), PayPal `payload->'resource'->>'custom_id'`. Both carry OUR
  booking id → a JSONB `OR` query per provider path recovers the trail 1:1, no schema change.
- `payment_events.payload` stores the FULL webhook body (provider payment data / PII) →
  **metadata-only** exposure decided: `{ id, provider, type, eventId, receivedAt, processedAt }`,
  never the payload. `processedAt NULL` = handler crashed mid-flight (the prime debug signal).
- `AdminBookingDetailDto extends BookingDto` with an explicit allow-list mapper
  (`toAdminBookingDetail`, no spread) — the established admin-detail enrichment pattern; new
  fields slot into DTO + interface + mapper + `BOOKING_DETAIL_INCLUDE`.
- `ListAdminBookingsQueryDto` already has optional uuid filters `tourId` + `departureId`
  (Wave 5) → `userId` is symmetric and AND-composes the same way.
- `Booking` already has `@@index([userId, status])` → the other-bookings reads are index-served;
  the missing indexes are `Booking.tourId` + `Enquiry.tourId` (Wave-5 reviewer finding: ops
  aggregates + `?tourId=` filter seq-scan). `Wishlist` already has its index.
- Supabase transaction pooler: no batch `$transaction` — parallel reads via `Promise.all`.

## Slice 0 — `@@index([tourId])` migration (Wave-5 follow-up)

- `schema.prisma`: add `@@index([tourId])` to `Booking` and `Enquiry`. No DTO/code change.
- `prisma migrate dev --name add_tour_id_indexes` against the live Supabase DB — **pause and
  confirm with the user immediately before applying** (decided: assistant runs it, user gets a
  final go/no-go). Tiny tables → plain `CREATE INDEX` is safe.
- Own commit (`chore(api): ...` or `perf(api): ...`), no regen needed (schema-only, no API shape
  change).

## Slice 1 — BE: detail enrichment + `userId` list filter

All additive on `GET /admin/bookings/:code` (customer endpoints untouched):

- **`AdminBookingDetail` interface + `AdminBookingDetailDto` + mapper gain:**
  - `providerSessionId: string | null` — Checkout session / PayPal order id (pre-capture ref).
  - `departure` grows `seatsTotal: number` + `seatsBooked: number` (FE derives seats-left; same
    numbers the departure pages already show).
  - `customer: { id: string; fullName: string | null; email: string; createdAt: string }` —
    joined `user` relation (account identity vs. the contact snapshot).
  - `otherBookings: { total: number; items: OtherBookingItem[] }` — same `userId`, current
    booking excluded, newest first, `take 5`;
    `OtherBookingItem = { code, status, createdAt, tourTitle, totalAmount, currency }`.
  - `paymentEvents: { id, provider, type, eventId, receivedAt, processedAt }[]` — newest first,
    metadata-only (payload NEVER selected).
- **Reads:** `BOOKING_DETAIL_INCLUDE` grows `user` + departure seat fields; then
  `Promise.all([otherBookings findMany + count, paymentEvents $queryRaw])` (pooler-safe).
  PaymentEvent raw query:
  `WHERE (provider = 'STRIPE' AND payload->'data'->'object'->'metadata'->>'bookingId' = $id)
  OR (provider = 'PAYPAL' AND payload->'resource'->>'custom_id' = $id) ORDER BY received_at DESC`
  — selecting metadata columns only.
- **List filter:** `ListAdminBookingsQueryDto` += optional `userId` (`@IsUUID()`); service
  where-clause AND-composes with status/search/tourId/departureId (assert in a test).
- **Tests (TDD):** mapper maps the new fields · other-bookings excludes self + caps at 5 ·
  paymentEvents empty → `[]` · `userId` filter AND-composition. Baseline: api 254.
- **Regen types** after green: boot API → poll `/api/docs-json` → `nx run
  @tourism/core:api-types` → kill port-3000 tree → build 3 consumers → separate `schema.ts`
  commit.

## Slice 2 — Admin FE (detail page + list deep-link)

All on `/bookings/[code]` unless noted; **every new field deploy-lag-guarded** (`?? null` /
`?? []` / optional block — Render ships after Vercel):

- **Trip card:** new "Seats" fact — `{seatsBooked}/{seatsTotal} booked · {left} left`; hidden
  until the fields arrive.
- **Customer card:** contact snapshot rows stay; new "Account" section — account name/email +
  "Customer since {date}". Below it the **Other bookings** mini-list (≤5 rows: code →
  `/bookings/[code]` · tour title · status badge · date) + "View all (N)" →
  `/bookings?userId=<id>` when `total > 5`; "No other bookings" empty state.
- **New "Payment events" card (main column, below Customer):** one row per event — `type`
  (mono) · provider · `receivedAt` (absolute + relative) · Processed badge / "Unprocessed"
  warning badge when `processedAt` is null. Empty state: "No webhook events received yet."
- **Order summary rail:** "Session reference" (mono, break-all) under the existing payment
  reference block, rendered when `providerSessionId` present.
- **Bookings list page:** add `userId` to the page's `searchParams` and pass it through to the
  API (the page currently forwards only `status`/`q`/`page`/`pageSize` — Wave 5's
  `tourId`/`departureId` filters are BE-only, used from the departure page fetch, so this is the
  FIRST list deep-link param). Show a clearable "Filtered by customer" indicator above the table
  (the Wave-3 enquiries search-indicator treatment), since the uuid itself is meaningless to read.
- **Tests:** TDD any new pure helper (e.g. seats/trail formatting in `lib/bookings/`); layout
  is build-guarded reuse of reviewed patterns. Baseline: admin 124.

## Out of scope

- Users admin module (roadmap: revisit after this wave) · payload viewer on payment events
  (PII, decided against) · PaymentEvent FK/backfill (YAGNI at current volume) · refund actions
  beyond the existing button · customer web changes · media library (Wave 7).

## Testing & process

- Gate per slice: `pnpm nx affected -t lint test build --exclude=@tourism/mobile` (build is the
  TS gate for admin/web).
- Execution: subagent-driven — haiku for transcription tasks, sonnet for reasoning tasks and ALL
  task reviews; `ecc:code-reviewer` on slice 1 (BE surface). Straight quotes ONLY in code;
  implementers must not "fix" curly quotes in existing copy (recurring haiku gotcha — grep-check
  at review).
- Merge to `main` after each green slice is pre-authorized (user reviews on deploys); stop on any
  CRITICAL/HIGH finding. Never stage unrelated dirty files (`docs/07-plans/*.md`,
  `playground.md`).

## Risks

- **JSONB trail query:** no index on `payload` — a per-detail-page scan of `payment_events` is
  acceptable at current volume (low hundreds); revisit with a GIN index only if it ever shows up
  in latency. Older/edge events lacking the metadata path simply don't match (correct: they
  weren't booking-routed).
- **Detail fan-out:** detail read + 3 parallel queries per page view — fine for an admin detail
  (mirrors the Wave-5 tour-ops pattern).
- **Deploy-lag:** the detail page renders pre-deploy API payloads → every new block guards.
- **Migration on live DB:** additive `CREATE INDEX` on tiny tables; user confirms before apply.

## Success criteria

- Booking detail answers "who is this customer and what else did they book?", "did the webhook
  arrive and finish?", and "which checkout session was this?" without leaving the page; the Trip
  card shows departure capacity; `?userId=` deep-links work. `tourId` filters/aggregates stop
  seq-scanning. Gate green per slice; slice 1 agent-reviewed.
