# Admin — Booking detail enrichment (Tier 1 + Tier 2)

> Status: **APPROVED — implemented** (branch `feat/admin-booking-detail`) · Date: 2026-07-01 · Scope: `@tourism/admin` (+ small `@tourism/api` DTO change) · Follows the shipped Bookings module (`ce7d5a9`).

## 1. Problem

The Bookings module works (list · detail · refund) but the **detail page reads as
bare** — it shows only what the current `BookingDto` exposes (status, total, guests,
payment provider, tour, departure, contact, created/updated). For a screen whose
whole point is **handling bookings and issuing refunds**, three things are missing:

1. No **lifecycle clarity** — you can't see *when* it was paid or cancelled, only
   "Booked" + "Last updated".
2. No **refund audit** — after a refund there's no reason, timestamp, or who did it.
3. No **payment reference** to cross-check the charge in Stripe/PayPal.
4. Flat `dl` + separators leave the page feeling unstructured (large empty gutter).

Key finding: **most of this data already exists on the Booking row** (`paidAt`,
`cancelledAt`, `providerPaymentId`, `providerSessionId`, `refundReason`,
`refundedById`) — it's just not in the DTO, so the admin client has no typed access.

## 2. Goals / Non-goals

**Goals**

- Make the detail page a complete "booking console" view: lifecycle timeline,
  refund audit, payment reference, and a structured card layout.
- Small list polish: always-visible total count + a Payment column.
- No customer-facing data leak (admin-only fields must not reach `/bookings/me`).

**Non-goals (deferred — Tier 3)**

- Per-person **price breakdown** (DB stores only `totalAmount`, no unit-price
  snapshot on the booking → needs a schema change; out of scope).
- Departure **capacity / seats-left** on the detail.
- Per-status **tab counts** on the list (needs a `groupBy` aggregate endpoint).

## 3. Backend change (scoped to the admin **detail** endpoint only)

The shared `BookingDto` is returned by **customer** endpoints too, so we must NOT
add admin-sensitive fields to it. Instead:

- **New `AdminBookingDetailDto`** used only by `GET /admin/bookings/:code`. It carries
  every current `BookingDto` field **plus**:
  - `paidAt: string | null`, `cancelledAt: string | null`
  - `providerPaymentId: string | null` (the captured charge/order id)
  - `refundReason: string | null`
  - `refundedBy: { fullName: string | null; email: string } | null`
- **Detail-specific include** adds `refundedBy: { select: { fullName, email } }` (the
  shared `BOOKING_INCLUDE` stays as-is; only the detail read joins the admin user).
- **Explicit mapper** `toAdminBookingDetail(entity)` in the service so the admin
  response is intentionally shaped (no accidental passthrough of other columns).
- `GET /admin/bookings` (list) is **unchanged** — the list additions below need no
  new fields (`paymentProvider` + `createdAt` are already on `BookingDto`; total is
  already in `meta`).
- Regenerate `@tourism/core` types (`/regen-types`) after the DTO lands.

> Note (pre-existing, out of scope): the customer `GET /bookings/:code` currently
> returns the raw entity, so some internal columns are already on that wire untyped.
> This spec does not widen that; tightening the customer response to an explicit DTO
> is tracked separately as a hardening follow-up.

## 4. Frontend changes

### Detail page (`/bookings/[code]`) — restructured into cards

- **Header** unchanged (code · status badge · money·guests · Refund button), plus a
  small **copy-code** button.
- **Two-column layout** on `lg` (fills the empty gutter):
  - **Left (main):**
    - **Status timeline** card — a vertical stepper built purely from timestamps:
      *Created* (`createdAt`) → *Paid* (`paidAt`) → *Cancelled* (`cancelledAt`) or
      *Refunded* (terminal when `status === REFUNDED`). Only render the steps that
      actually happened; the reached step is highlighted.
    - **Trip** card (tour + departure range).
    - **Customer** card (name · email · phone · special requests).
  - **Right (rail):**
    - **Order summary** card (status · total · guests breakdown · payment provider ·
      `providerPaymentId` with a "View in Stripe" link when STRIPE).
    - **Refund** card — shown only when `status === REFUNDED`: reason, when
      (`cancelledAt`), and who (`refundedBy`).
- **Relative time** ("2 days ago") shown next to absolute timestamps.

### List page (`/bookings`) — light polish (FE-only)

- Always show a **result count** line ("Showing N of M" / "M bookings"), even on a
  single page (today the count only appears with the pager).
- Add a **Payment** column (Stripe / PayPal) for at-a-glance context.
- (Optional, low priority) a **Booked** date column.

## 5. Pure logic to unit-test (TDD)

- `buildBookingTimeline(booking)` → ordered steps `[{ key, label, at, done }]` from
  the timestamps + status (handles PENDING / PAID / CANCELLED / REFUNDED, and the
  PENDING→CANCELLED-without-payment case where `paidAt` is null).
- `formatRelativeTime(iso, now)` → "just now" / "5 min ago" / "2 days ago" / falls
  back to the absolute date past ~30 days. (`now` injected for deterministic tests.)
- `stripePaymentUrl(providerPaymentId)` → dashboard deep-link (payment intent), or
  `null` when not applicable.

Existing `format.ts` helpers (status/canRefund/money/guests) are reused as-is.

## 6. Testing / gate

- New Jest specs for the three pure helpers above (deterministic, `now` injected).
- `/gate`: lint · typecheck · test · build all green.
- `ecc:code-reviewer` pass (financial screen) before handoff.
- Manual review on the Vercel admin deploy (user reviews on deploy).

## 7. Rollout

- One branch `feat/admin-booking-detail`. BE DTO + FE in the same branch; run
  `/regen-types` so the committed `@tourism/core` schema matches.
- **Ordering caveat:** the enriched fields only populate once **Render redeploys the
  API** (BE is auto-deployed on merge to `main`). The FE guards every new field as
  nullable, so before the API catches up the detail renders without the timeline
  extras rather than crashing.
