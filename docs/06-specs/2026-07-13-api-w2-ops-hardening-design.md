# API-W2 "Ops hardening" — design spec

**Date:** 2026-07-13 · **Scope:** `apps/api` (+ typed client regen + a minimal
admin toast) · **Branch:** `feat/api-w2-ops-hardening`

## Context

From the 2026-07-13 API debt analysis (group B "operational" + group D
config debt). User decisions (Q&A 2026-07-13): cancel-departure =
**auto-refund all PAID bookings**; unpublish-with-PAID = **hard 409 block**;
W2 ships alone, W3 (CRM/analytics) follows on its own branch.

## Goals

1. **Cancel-departure flow (A-DEP-3)** — setting a departure `CANCELLED`
   stops being a silent flag: every PAID booking is auto-refunded (full) and
   the customer notified; in-flight PENDING bookings are cancelled.
2. **Unpublish guard (A-TUR-4)** — a tour with active paid customers can't
   be unpublished into a 404.
3. **PayPal fail-fast** — empty PayPal secrets no longer boot a silently
   broken gateway.
4. **Dead throttle config** — `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT` either
   drive the real throttlers or stop pretending to.

## 1. Cancel-departure

Trigger: `PATCH /admin/tours/:slug/departures/:id` with
`status: CANCELLED` while the existing status is not `CANCELLED`
(idempotent: re-patching an already-CANCELLED departure runs no side
effects). No new endpoint — the admin UI already drives this PATCH.

Flow (in `DeparturesService.update`, delegating refunds to
`BookingsService.refundByAdmin` — `DeparturesModule` imports
`BookingsModule`; no cycle, Bookings only imports Payments):

1. Flip the departure to `CANCELLED` **first** (the operator's fact — trip
   is off regardless of refund outcomes), applying any other patched fields
   in the same update.
2. Cancel in-flight `PENDING` bookings on the departure
   (`updateMany → CANCELLED + cancelledAt`). A late payment webhook then
   loses the seat-claim gate (booking no longer PENDING) and takes the
   existing auto-refund race path — no stuck PAID booking on a dead trip.
3. Loop the departure's `PAID` bookings **sequentially** (pooler-friendly,
   provider-rate friendly): `refundByAdmin({ code, adminUserId, reason })`
   with reason `Departure cancelled by the operator`. Each success reuses
   the whole proven pipeline: provider refund first → seats released →
   REFUNDED flip → `BOOKING_REFUNDED` outbox row → branded email.
   `PARTIALLY_REFUNDED` bookings are skipped (already partially settled;
   listed in the summary as `skipped` for manual follow-up).
4. Collect a summary; a failed provider refund leaves that booking PAID
   (existing behavior) and is reported, retryable per-booking in the admin
   UI as today.

Response: `AdminDepartureDto` gains optional
`cancellation?: { paidTotal: number; refunded: number; skipped: string[];
failed: { code: string; message: string }[] }` — present only on the PATCH
that performed the transition. Typed client regenerated (`/regen-types`);
the admin departure form shows a summary toast when the field is present
(minimal FE touch, no new UI surface).

Email: `renderBookingRefunded` gains optional `reason?` — when the hydrated
booking has a `refundReason`, the email adds a "Reason" line (data card
row), so a departure-cancel refund explains itself. Applies to all refunds
(admin manual refunds with a reason benefit too).

## 2. Unpublish guard

In `ToursService.update`: when the patch moves status away from
`PUBLISHED`, count bookings in `PAID`/`PARTIALLY_REFUNDED` on **future,
non-CANCELLED departures** of the tour. If > 0 → `409
TOUR_HAS_ACTIVE_BOOKINGS` with the count in the message. Consistent with
the existing delete guard (`TOUR_IS_PUBLISHED`). Operator path: cancel the
departures (auto-refund, feature 1) or refund manually, then unpublish.

## 3. PayPal fail-fast

`env.validation.ts`: `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` →
`.required()` non-empty. Kills the "boots fine, gateway silently broken"
mode the code comment promised to fix after P1.5c.
**Amended during execution:** `PAYPAL_WEBHOOK_ID` stays `allow('')` — local
dev never receives webhooks (the user's own `.env` has it empty) and an
empty id only disables the webhook backstop; prod sets it.

## 4. Throttle config

`throttlerConfig` (`throttler.ttlSeconds`/`.limit`) is registered but
nothing reads it — the newsletter + enquiry modules hardcode their own
limits. Decision: the env knobs become the **public-endpoint defaults** —
`ThrottlerModule.forRootAsync` in both modules reads the config; the
enquiry's tighter per-route `@Throttle` override stays as an explicit
business rule. `.env.example` comments updated to say what the knobs
actually govern.

## Non-goals

- No new EmailType for "departure cancelled" — the refund email + Reason
  line carries the message (decision: one email per customer, not two).
- No bulk-refund queue/worker — sequential loop in the request is fine at
  this scale (seats per departure ≤ double digits); flagged as future work
  if departures grow.
- No customer-facing "trip cancelled" page state (web already renders
  cancelled/refunded states in account bookings).

## Testing (TDD)

- departures.service.spec: CANCELLED transition → refund loop invoked per
  PAID booking (order, reason), PENDING flipped, summary shape (refunded /
  skipped partial / failed keeps PAID), idempotent re-patch = no side
  effects, non-status patches unaffected.
- tours.service.spec: unpublish with active future PAID → 409 code; counts
  ignore past/CANCELLED departures and REFUNDED bookings; publish → publish
  and DRAFT edits unaffected.
- email.templates.spec: refund email renders the Reason row only when
  present (escaped).
- outbox.service.spec: refund hydrate passes `refundReason`.
- env.validation.spec: missing/empty PayPal vars now fail; happy fixture
  updated.
- Modules boot: DeparturesModule imports BookingsModule (compile/DI smoke
  via existing suites).

## Review outcomes (2026-07-13, strong tier)

- **MUST-FIX (fixed + TDD-pinned):** a payment completing AFTER the
  PENDING→CANCELLED flip used to land on `already_processed` → silent skip →
  customer charged for a cancelled trip. `claimSeatsForPaid` now returns a
  4th outcome `'cancelled'`; both the Stripe webhook (via the generalized
  `refundOrphanedCapture`) and the PayPal capture webhook refund the orphaned
  capture and flip the booking REFUNDED.
- **SHOULD-FIX (fixed + pinned):** the unpublish guard compared `@db.Date`
  `startDate` against `new Date()` — a departure leaving TODAY was missed.
  Boundary is now start-of-today UTC (walk-in parity).
- **Nits (accepted, documented):** (1) the cancel-pass summary may list a
  concurrently-settled booking under `failed` with a BOOKING_NOT_REFUNDABLE
  message — self-heals via per-booking retry + provider idempotency, message
  quality only. (2) The refund loop's sequential-ness is guaranteed by
  `for…await` but not test-pinned — a timing-based test would be flaky;
  skipped on purpose.

## Risks

- Refund loop duration: N provider calls in one PATCH request — acceptable
  at current scale; each call has provider-level idempotency
  (`booking-refund:{id}`), so a timeout + admin retry converges.
- Ordering (cancel first, refund second) can leave PAID bookings on a
  CANCELLED departure if providers fail — deliberate: summary + per-booking
  retry beats blocking the operational fact.
