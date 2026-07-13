# API-W3 "CRM/analytics" — design spec

**Date:** 2026-07-13 · **Scope:** `apps/api` + typed-client regen + small
admin/web touches · **Branch:** `feat/api-w3-crm-analytics`

## Context

Final wave of the 2026-07-13 API debt program (after W1 email revival
`7c64852` and W2 ops hardening `7e51a24`). Items #7/#8/#9 of the analysis,
approved as one wave (user Q&A 2026-07-13).

## Goals

1. **Review moderation audit (#7)** — who approved/rejected a review, when.
2. **`hasReview` on customer bookings (#9)** — web currently discovers
   "already reviewed" by probing for a 409; expose the fact directly, plus a
   "my reviews" read.
3. **Margin analytics (#8)** — `Tour.costPrice` + per-currency cost/margin
   on the admin dashboard (revenue alone says nothing about profit).

## Design

### 1. Moderation audit

- Schema: `Review.moderatedById String? @db.Uuid` (FK → users, `SetNull` on
  delete) + `Review.moderatedAt DateTime?`; migration
  `review_moderation_audit`.
- `ReviewsService.moderateById(reviewId, isApproved, adminUserId)` — writes
  both fields on EVERY moderation write (approve and reject; re-moderation
  overwrites — latest decision wins). Controller passes `@CurrentUser`
  (400 `USER_NOT_SYNCED` when absent, same idiom as refund/cancel).
- Admin review DTO exposes `moderatedBy { fullName, email } | null` +
  `moderatedAt`; admin reviews table shows it in the detail view (small
  admin touch — no new UI surface).

### 2. hasReview + my reviews

- Customer bookings reads (`findOwnList`, `findOwnByCode`) include
  `review: { select: { id: true } }`; `BookingDto` gains
  `hasReview: boolean`. (The `Booking.bookingId` unique on Review makes this
  a 1:1 lookup.)
- New `GET /reviews/mine` (customer JWT): own reviews newest-first —
  `{ id, rating, title, body, isApproved, createdAt, tour: { slug, title } |
  null }`. Simple list (cap 50, no pagination yet — mirrors bookings'
  own-list posture).
- Web touch: the account review prompt hides itself when `hasReview` is
  true instead of waiting for the 409 (the 409 path stays as the race
  backstop).

### 3. costPrice + margin

- Schema: `Tour.costPrice Decimal? @db.Decimal(12,2)` — **per traveller**,
  in the tour's own currency; null = unknown. Migration `tour_cost_price`.
- Admin tour form gains the optional field (Pricing section, next to
  basePrice).
- `admin-stats`: `revenueByCurrency` rows gain `cost` + `margin` (decimal
  strings): `cost = Σ costPrice × (numAdults + numChildren)` over the same
  PAID-bookings-in-range set (raw SQL join bookings→tours, grouped by
  currency); `margin = revenue − cost`. Bookings on tours with null
  `costPrice` contribute 0 cost — margin is therefore an UPPER BOUND until
  costs are filled in (documented in the DTO description + a footnote in
  the admin dashboard card).
- Admin dashboard: the per-currency revenue card shows margin under
  revenue (small admin touch).

## Non-goals

- No FX conversion (ADR-0010 unchanged — per-currency only).
- No costPrice history/versioning (margin uses the CURRENT cost, even for
  old bookings — acceptable for a demo-scale analytics view, documented).
- No pagination on /reviews/mine (cap 50).

## Review outcomes (2026-07-13, strong tier)

- **0 must-fix.** Verified closed: every public tour surface strips
  `costPrice` (list/detail/related/wishlist — pinned by tests), margin SQL
  bounds/joins/Decimal coercion, hasReview no-leak, audit-in-tx.
- **Should-fix (fixed + pinned):** editing a tour's `currency` after PAID
  bookings exist would mis-bucket per-currency margin (bookings snapshot
  their currency; costPrice follows the tour's current one) → new 409
  `TOUR_CURRENCY_LOCKED` guard: currency is immutable once money moved.
- **Nits addressed:** `BookingDto.hasReview` is now optional in Swagger
  (write-path responses omit it; `/bookings/me` + detail always carry it) ·
  admin `TourDetail` hand-typed `costPrice` removed (the generated
  `AdminTourDetailDto` declares it) · `ReviewPrompt` keyed by booking code
  (App-Router shared-state gotcha).
- **Accepted as designed:** costPrice can't be cleared back to null from the
  admin form (mirrors `compareAtPrice`; add a clear affordance if ever
  needed) · margin uses the CURRENT cost for historical bookings (non-goal).

## Testing (TDD)

- reviews.service.spec: moderate writes moderatedById/At on approve AND
  reject; re-moderation overwrites; missing admin id → 400.
- bookings.service.spec: own-list/own-detail map hasReview true/false.
- reviews.service.spec: findMine maps tour + approval fields, caps 50.
- admin-stats.service.spec: cost/margin per currency (null costPrice → 0),
  margin = revenue − cost.
- Migrations deploy at merge (2 ALTERs, additive-nullable — zero-risk).
