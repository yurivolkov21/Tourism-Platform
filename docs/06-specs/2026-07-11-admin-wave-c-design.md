# Admin wave C (bookings polish · post SEO+scheduling · profile · ops) — design spec

**Date:** 2026-07-11 · **Scope:** api + admin (+1 web metadata touch) ·
**Status:** approved (user 2026-07-11: single branch for all of wave C).

## Goal

Close the wave-C debts from the 2026-07-10 audit (as re-scoped after the B1/B2
merges): ① booking-detail **price breakdown** + bookings-list **status tab
counts** · ② post **SEO fields** + **scheduled publishing** · ③ **admin
self-profile** edit · ④ **subscriber delete** · ⑤ **outbox row delete** +
**PaymentEvent viewer**.

## Non-goals / already done

- Booking-detail **seats-left** — already shipped (Trip card renders
  "7/12 booked · 5 left"); the audit item was stale.
- Dashboard analytics/date-range · real notifications (cut to D, user-approved).
- No cron for scheduled publishing — the public post queries already filter
  `publishedAt <= now()` at read time, so a future date simply works.
- PayPal dashboard deep-link (Stripe-only stays).
- Avatar upload on the admin profile (name + phone only; web account keeps the
  full flow).

## Design

### ① Bookings

- **Status tab counts** (respecting the active tour/departure/userId/search
  scope, unlike the dashboard's global numbers): `findAllForAdmin` adds one
  `booking.groupBy({ by: ['status'] })` over the SAME where minus `status`,
  returned as `statusCounts: Record<BookingStatus, number>` on the list
  response (`PaginatedAdminBookingsDto` gains the field). Defensive: groupBy
  failure → omit counts, list still renders. FE: `BookingsFilters` tabs render
  count badges when provided (All = sum).
- **Price breakdown card** on the detail rail (between Guests and Payment):
  derived **from the booking's own snapshot** — `perTraveller =
  totalAmount / (numAdults + numChildren)` (uniform per-guest pricing, matching
  the BE's charge model) — NOT from current tour/departure prices (those drift
  after price edits). Pure TDD'd helper `bookingBreakdown(detail)` in
  `apps/admin/src/lib/bookings/detail.ts` returning rows
  (`N adults × unit`, `M children × unit`, total) with clean division guards
  (0 guests, non-numeric) → render `null` (no card) on anomalies.

### ② Posts — SEO + scheduling (schema change)

- **Schema:** `Post` gains `metaTitle String? @db.VarChar(70)` and
  `metaDescription String? @db.VarChar(160)` (migration, additive only).
- **DTOs:** create/update accept both (optional, trimmed, max-length
  validated); public + admin Post DTOs expose them. `update`/`create` accept an
  optional **`publishedAt` (ISO date-time)** — when status=PUBLISHED and a
  future date is given, keep it (schedule); when omitted, today's behavior
  (stamp `now()` on the DRAFT→PUBLISHED flip) is unchanged; setting a past
  date is allowed (backdating).
- **Admin form:** an "SEO" section (meta title + meta description with
  live character counters vs 70/160) + a "Publish date" datetime-local input
  shown when status=PUBLISHED (empty = publish now). Posts list: status cell
  shows a **Scheduled** badge when `status=PUBLISHED && publishedAt > now`.
- **Web:** `generateMetadata` in `/blog/[slug]` prefers
  `metaTitle ?? post.title`, `metaDescription ?? post.excerpt`.
- Publishing semantics stay read-time (`publishedAt <= now()` filter already
  in the public queries — verified); no job, no status flip needed.

### ③ Admin self-profile

- `/users/me` (existing read-only detail) gains a **"Your profile"** edit card
  (fullName + phone, `noValidate` + per-field errors, house form pattern),
  rendered only when the row is the caller (`isSelf`). Server action calls the
  existing public `PATCH /api/v1/users/me` via the authed client; success →
  toast + revalidate. No BE change.

### ④ Subscribers

- **BE:** `DELETE /admin/newsletter/subscribers/:id` (404 unknown; hard delete
  — the model has no soft-unsubscribe field and the public subscribe silently
  re-creates, which is the desired re-opt-in behavior).
- **FE:** per-row "Remove" with confirm `AlertDialog` (outbox-style inline
  single action — sanctioned deviation from RowActions), toast + refresh.

### ⑤ Outbox delete + PaymentEvent viewer

- **Outbox:** `DELETE /admin/outbox/:id` — allowed for `PENDING`/`FAILED`
  (cancel a queued/poisoned email); `SENT` rows are delivery audit history →
  409 `OUTBOX_ROW_SENT`. FE: a Delete button beside Retry (confirm dialog).
- **PaymentEvent viewer:** new admin read surface:
  `GET /admin/payment-events` — paginated, newest-first, filters
  `provider?`/`type?` + `bookingId?`, each row joined with the booking `code`.
  DTO includes the **payload JSON** (admin-only debugging is the point of the
  page; the booking-detail embed keeps excluding it). FE: `/payment-events`
  page under Operations — server-driven table (provider/type facets via
  `FacetFilter`, ServerTablePagination) + a drawer with pretty-printed payload
  (`<pre>`, scrollable) and a link to the booking.

## Error handling

- Breakdown: any anomaly (zero guests, unparsable total) → card simply not
  rendered.
- statusCounts groupBy failure → field omitted; tabs fall back to no badges.
- Outbox delete on SENT → 409 with a friendly toast; subscriber delete 404 →
  toast.
- Scheduled posts: invalid `publishedAt` → 400 (class-validator IsDateString).

## Testing

- API (service specs, TDD-first): bookings statusCounts (same-where-minus-
  status, defensive) · posts create/update publishedAt semantics (future kept
  · omitted = now-on-flip · SEO fields persisted) · newsletter delete (404) ·
  outbox delete (PENDING ok / SENT 409 / 404) · payment-events list (filters,
  booking join).
- Admin (TDD pure): `bookingBreakdown` (uniform split, guards) · post schema
  additions · any new param parsers. RTL/view specs stay green.
- `/regen-types` after DTO changes; full gate; **adversarial review before
  merge** (schema migration — standing rule).

## Definition of done

Booking detail itemizes the price; bookings tabs show live counts within the
current scope; a post can be scheduled for a future date with SEO overrides
that the web reader uses; the admin edits their own name/phone in place;
subscribers can be removed; queued/failed outbox rows can be deleted (SENT
protected); payment webhooks are browsable with payload + booking link;
migration applied live; gate green; docs swept.
