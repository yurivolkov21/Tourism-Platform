# Refund execution + cancellation-request queue

- **Date:** 2026-07-04
- **Candidate:** HANDOFF §Next action — candidate A ("refund-execution UI /
  cancellation-request queue"); the strongest remaining P4 fold-in.
- **Scope:** BE (`@tourism/api`) — one user-gated migration + one new module +
  extend the admin refund endpoint · admin FE (`apps/admin`) — new queue page +
  refund/deny actions on booking detail · web FE (`apps/web`) — real
  booking-tied cancellation request replacing the enquiry hack · shared
  (`@tourism/core`) — regen OpenAPI client.
- **Money-path.** Per CLAUDE.md §Model routing, the payments/CTE diff gets an
  **adversarial review by a strong model before merge**, and the migration
  **waits for the user's GO** before it runs on live.

## Locked decisions (brainstorming 2026-07-04)

1. **One closed loop** — customer request → admin queue → admin issues
   partial/full refund (or denies) → customer sees the outcome.
2. **Separate `CancellationRequest` model** (not an upgraded `Enquiry`). Enquiry
   is a sales/CRM lifecycle (`NEW→WON`) and has no booking link; a distinct
   support/refund lifecycle keeps the money-path clean.
3. **One refund per booking** (no ledger). Audit stays denormalized on the
   `Booking` row: add `refundedAmount` + `refundedAt` (`refundReason`,
   `refundedById`, `cancelledAt` already exist). A future `Refund` ledger can be
   added without breaking this — the columns become a cached "total refunded".
4. **Partial refund does NOT release seats** (partial = goodwill / cancellation
   fee; the traveller still goes). **Only a full refund releases seats.**
5. **Request lifecycle = 3 states**: `REQUESTED → REFUNDED | DENIED`. The admin's
   refund action both resolves the request and executes; deny resolves without
   money movement. Approve and execute are **not** split (YAGNI for the pilot).
6. **Customer sees a status badge** on the booking-detail page (requested →
   refunded $X / partially refunded $X / declined).
7. **Admin surface = approach A**: a dedicated queue page lists REQUESTED items;
   the money actions (refund/deny) live on the **booking-detail** page where the
   admin sees full order context. Refund is reachable for **any** PAID booking
   (proactive refunds), gated behind a mis-click safeguard (see below).
8. **Nav badge count = cut** (future nice-to-have) — the admin shell renders on
   every page, so a REQUESTED count would add a query to every admin page load;
   not worth it for the pilot.

## Verified facts (from code, 2026-07-04)

- **`refundByAdmin`** lives in `BookingsService`
  (`apps/api/src/modules/bookings/bookings.service.ts:493-599`), **not** payments.
  Guard: must be `PAID` + have `providerPaymentId` else 400
  `BOOKING_NOT_REFUNDABLE`. It calls the **gateway refund FIRST** (Stripe
  `createRefund` / PayPal `refundCapture`), converges on already-refunded
  (`isAlreadyRefundedError`, lines 760-770), else 400 `REFUND_FAILED` (stays
  PAID). Then a single **idempotent `$queryRaw` CTE** gated `status='PAID'`
  releases seats (`GREATEST(seats_booked - seats, 0)`), flips `REFUNDED`, stamps
  `refund_reason`/`refunded_by`/`cancelled_at`, and inserts a `BOOKING_REFUNDED`
  outbox row (`ON CONFLICT (dedupe_key) DO NOTHING`).
- **FULL-only today**: `RefundBookingDto` carries only an optional `reason`;
  `stripe.createRefund` (`stripe.service.ts:134-151`) sends no `amount`;
  `paypal.refundCapture` (`paypal.service.ts:148-153`) refunds the whole capture;
  the seat-release always subtracts the full party size.
- **Stripe/PayPal both accept a partial amount** at the gateway — partial is a
  DTO + service-arg + CTE change, no new provider capability needed.
- **`BookingStatus`** (`schema.prisma:32-37`) = `PENDING · PAID · CANCELLED ·
  REFUNDED`. No intermediate/partial state exists.
- **`Booking`** (`schema.prisma:344-383`): money = `totalAmount` Decimal(12,2) +
  `currency` (default USD); payment refs `providerSessionId?` /
  `providerPaymentId?`; refund audit already has `refundReason?`,
  `refundedById?` (`@map("refunded_by")`, FK User, SetNull), `paidAt?`,
  `cancelledAt?`. **No** Booking↔Enquiry / Booking↔Refund relation. **No**
  `Payment`/`Refund`/ledger table anywhere.
- **Seat inventory** is per `TourDeparture` (`seatsTotal` + `seatsBooked`);
  claimed only on PAID via `PaymentsService.claimSeatsForPaid`
  (`payments.service.ts:245-292`) — atomic conditional CTE
  (`+seats WHERE booked+seats <= total`). PENDING holds no seats.
- **No customer "request cancellation" endpoint exists.** `cancelOwnPending`
  (`bookings.service.ts:468-483`) rejects any non-PENDING booking with 409
  `BOOKING_NOT_CANCELLABLE`. The web PAID "Request cancellation" is a **pure
  client hack**: `BookingActions` (`apps/web/.../booking/booking-actions.tsx`)
  builds an enquiry message via `buildCancellationRequestPayload`
  (`lib/booking/cancel-request.ts`) and POSTs `/enquiries` — **no bookingId
  link, no server request record.**
- **Admin bookings** (`admin-bookings.controller.ts`, `@Roles(ADMIN)`, mounted
  `/admin/bookings`): `GET /` (list, `ListAdminBookingsQueryDto` already filters
  by `status`), `GET /:code` (detail), `POST /:code/refund` (`@HttpCode(200)`,
  passes `@CurrentUser().id` as `adminUserId`).
- **`Outbox`** (`schema.prisma:622-635`, `EmailType` line 108 has
  `BOOKING_REFUNDED`) is the idiomatic queue template — idempotent `dedupeKey`,
  worker-drained. Email **delivery** is domain-gated/deferred, but rows are
  written now (established pattern).
- **Admin shell** has an **Operations** nav group (`app-shell.tsx`, Enquiries +
  Outbox + Subscribers); list pages use the shared table stack
  (`AdminTableShell` + `ServerTablePagination` + `lib/<area>/data.ts` via
  `getApiClient`) — the pattern `fea387c` standardized.
- **Money precision** helper coverage exists (`payments/money.spec.ts`).

## Design

### 1. Schema (ONE migration — user GO/no-go)

```prisma
enum BookingStatus {
  PENDING
  PAID
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED   // new
}

enum CancellationRequestStatus {
  REQUESTED
  REFUNDED
  DENIED
}

model Booking {
  // ...existing...
  refundedAmount Decimal? @map("refunded_amount") @db.Decimal(12, 2)
  refundedAt     DateTime? @map("refunded_at")
  cancellationRequest CancellationRequest?   // 1:0..1
}

model CancellationRequest {
  id           String   @id @default(uuid()) @db.Uuid
  bookingId    String   @unique @map("booking_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  reason       String   @db.VarChar(1000)
  status       CancellationRequestStatus @default(REQUESTED)
  decisionNote String?  @map("decision_note") @db.VarChar(500)
  decidedById  String?  @map("decided_by") @db.Uuid
  decidedAt    DateTime? @map("decided_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  user      User    @relation("CancellationRequester", fields: [userId], references: [id], onDelete: Restrict)
  decidedBy User?   @relation("CancellationDecider", fields: [decidedById], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@map("cancellation_requests")
}
```

- `EmailType` gains `CANCELLATION_REQUESTED` and `CANCELLATION_DENIED`
  (Postgres `ALTER TYPE ... ADD VALUE`).
- `@@unique(bookingId)` → **re-request after a DENIED** reuses the same row
  (upsert back to `REQUESTED`, clear decision fields) — bounded, one row/booking,
  still allows re-asking.
- **Pre-GO check:** `ALTER TYPE ... ADD VALUE` is not transactional on older PG;
  confirm the Prisma migration splits enum-add from table DDL as needed (verify
  against the live Supabase PG version before GO).

### 2. BE — customer request (module `modules/cancellations` or fold into bookings)

`POST /bookings/:code/cancellation-request` — authed, owner-check via JWT.

- Guards: booking is the caller's (else 404 `BOOKING_NOT_FOUND`) · `status ===
  PAID` (else 409 `CANCELLATION_NOT_ALLOWED`) · departure `startDate` is in the
  future (else 409 `DEPARTURE_ALREADY_STARTED`) · no existing `REQUESTED` row
  (else 409 `CANCELLATION_ALREADY_REQUESTED`).
- In a `$transaction`: **upsert** `CancellationRequest` by `bookingId` (create,
  or reset a prior DENIED row → `REQUESTED`, null the decision fields), then
  insert a `CANCELLATION_REQUESTED` outbox row (`dedupeKey` per request/booking).
- DTO: `CreateCancellationRequestDto { reason: string ≤1000 }`; ack returns the
  request status.
- **Reads enriched:** `GET /bookings/:code` and `GET /bookings/me` include
  `cancellationRequest { status }` + `refundedAmount` so the web can render the
  badge and gate the form.

### 3. BE — admin refund execution (extend A-BKG-3) + deny (A-CXR-2)

`POST /admin/bookings/:code/refund` — `RefundBookingDto` gains `amount?: number`
(positive, ≤ 2dp). Behaviour:

- `amount` omitted **or** `=== totalAmount` → **FULL** (unchanged path): gateway
  full refund → CTE releases seats + `REFUNDED` + stamps audit. Backwards
  compatible with today's callers.
- `0 < amount < totalAmount` → **PARTIAL**: gateway refund **with** `amount`
  (Stripe cents `Math.round(amount*100)`; PayPal `{ amount, currency }`) →
  CTE **does NOT release seats**, sets `status = PARTIALLY_REFUNDED`,
  `refundedAmount = amount`, `refundedAt = now()`, `refundReason`, `refunded_by`.
- `amount ≤ 0` or `> totalAmount` → 400 `INVALID_REFUND_AMOUNT`.
- Both branches run through **one idempotent CTE** gated `status='PAID'` (retry =
  no-op). If a `CancellationRequest` is open, the same statement flips it to
  `REFUNDED` + `decided_by`/`decided_at`.
- Gateway-refund-FIRST + `REFUND_FAILED`-keeps-PAID + already-refunded converge
  semantics are **preserved exactly**.
- `BOOKING_REFUNDED` outbox row still written (dedupe per booking).

`POST /admin/cancellation-requests/:id/deny` (A-CXR-2) — set request `DENIED` +
`decisionNote` + `decided_by`/`decided_at`; booking **stays PAID**; write
`CANCELLATION_DENIED` outbox row. 404 if request missing; 409 if not `REQUESTED`.

`GET /admin/cancellation-requests` (A-CXR-1) — paginated list, filter `status`
(default `REQUESTED`), newest first, `Promise.all` list+count (pooler-safe),
joined booking + tour + departure + requester. Query DTO mirrors the other admin
list DTOs.

### 4. Admin FE (`apps/admin`)

- **New page `/cancellation-requests`** under Operations nav: Server Component
  fetch → shared table stack (`AdminTableShell` + `ServerTablePagination`,
  `lib/cancellation-requests/data.ts` via `getApiClient`). Columns: booking code
  · tour · customer · departure date · reason (truncated) · requested-at ·
  "Review →" link to the booking detail. Status filter + pagination reused.
- **Booking-detail actions** (extend the A-BKG-2 admin detail page):
  - If an open request exists → a "Cancellation requested" panel (reason +
    requested-at) with **Refund** and **Deny** buttons.
  - **Refund dialog** — Server Action → `POST /admin/bookings/:code/refund`:
    - *With* request: `amount` pre-filled to `totalAmount` (editable down),
      `reason` field, helper text "Full refund releases seats · Partial keeps
      the booking".
    - *Without* request (proactive, any PAID booking) — **mis-click safeguard**:
      a warning banner ("No cancellation request on file — you're refunding
      proactively"), `amount` **empty + required** (no pre-fill), and a
      **required confirm checkbox** that gates the submit button.
    - On gateway failure → surface `REFUND_FAILED`, keep state.
  - **Deny dialog** — `decisionNote` → `POST /admin/cancellation-requests/:id/deny`.
  - After either action: `revalidatePath` so status/badge refresh.
- **Pure logic → TDD** (spec beside `lib/bookings/*.spec.ts`): amount validation
  (`0 < amount ≤ total`, 2dp, money parse) + API-error→message mapping.

### 5. Web FE (`apps/web`)

- **Rewrite `BookingActions` PAID branch**: drop
  `buildCancellationRequestPayload` + `submitEnquiry`; **delete
  `lib/booking/cancel-request.ts` + its spec** (no parallel enquiry path — avoid
  confusion). New Server Action → `POST /bookings/:code/cancellation-request`.
- **Status-aware from the real request** (booking DTO now carries
  `cancellationRequest.status` + `refundedAmount`):
  - none / `DENIED` → "Request cancellation" form (submit / re-submit);
    `DENIED` also shows "Request declined" + policy link.
  - `REQUESTED` → "Cancellation requested — we'll email you" badge, button
    disabled.
  - booking `REFUNDED` → "Refunded $X"; `PARTIALLY_REFUNDED` → "Partially
    refunded $X".
- i18n: new keys in `@tourism/i18n` (English-only).
- **Regen `@tourism/core`** OpenAPI client after the BE DTO changes
  (`/regen-types`).

## Money-path guardrails (carried into the plan)

- Gateway refund **before** any DB flip; failure keeps `PAID` for retry.
- Single idempotent CTE per booking, gated on the pre-transition status.
- Amount→cents via `Math.round(amount*100)`; no ad-hoc float math (money specs).
- Refund currency = booking currency (USD today).
- Partial never touches `seats_booked`.
- **Adversarial review by a strong model** on the full payments/CTE/DTO diff
  before merge. **Migration waits for user GO.**

## Testing (TDD on pure logic; e2e/visual for FE layout)

- **BE `bookings.service.spec.ts`** (extend): partial → `PARTIALLY_REFUNDED` +
  `refundedAmount`, seats **unchanged**; full → seats released + `REFUNDED`;
  `INVALID_REFUND_AMOUNT` (≤0, >total); refund with open request resolves it to
  `REFUNDED`; gateway error → `REFUND_FAILED` stays PAID; already-refunded
  converges; cents precision.
- **BE request spec** (new): create guards (non-PAID 409, departure started 409,
  duplicate REQUESTED 409, re-request after DENIED OK); deny → `DENIED`, booking
  stays PAID.
- **Admin FE**: amount-validation + error-mapping helper specs.
- **Web FE**: `BookingActions` status→UI mapping (replaces `cancel-request.spec.ts`).
- **`/gate`** green (lint + typecheck + test + build) before declaring green.

## Docs sweep (CLAUDE.md rule 9 — after merge, do not skip)

- `docs/03-reference/functions-admin.md`: A-BKG-3 → partial (drop 🕒); **add
  A-CXR-1** (list queue) + **A-CXR-2** (deny). New model code `CXR`.
- `docs/03-reference/functions-customer.md`: add U-BKG request-cancellation.
- `docs/03-reference/functions-system.md`: `CANCELLATION_REQUESTED` /
  `CANCELLATION_DENIED` outbox types.
- `docs/01-architecture/data-model.md`: `CancellationRequest` model, Booking new
  columns, `PARTIALLY_REFUNDED`, `CancellationRequestStatus`.
- `docs/roadmap.md` P4 row · `CLAUDE.md` project table · `HANDOFF.md` §Next
  action (mark candidate A done). Update api/web/admin **test-count baselines**
  everywhere they appear.

## Out of scope / future

- Multi-refund ledger (`Refund` table) — deferred; the single denormalized
  refund is intentionally forward-compatible.
- Nav badge count of open requests — future nice-to-have.
- Approve/execute split (two-step, dual-admin) — YAGNI for the pilot.
- Outbound emails remain domain-gated (rows written now, delivery later).
- Multi-currency refund reconciliation (all USD today).

## Open questions

None — all locked in the 2026-07-04 brainstorming session.
