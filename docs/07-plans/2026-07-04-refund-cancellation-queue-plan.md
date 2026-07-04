# Refund execution + cancellation-request queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins issue partial or full refunds and act on a first-class
queue of customer cancellation requests, closing the loop customer request →
admin queue → refund/deny → customer sees the outcome.

**Architecture:** Three slices in dependency order — (1) BE: one migration +
partial-refund on the existing `BookingsService.refundByAdmin` + a new
`modules/cancellations` module (customer request, admin list, admin deny); (2)
regen the `@tourism/core` client; (3) admin FE queue page + refund/deny actions
on the booking-detail page; (4) web FE booking-detail actions become
status-aware against a real booking-tied request. The money-path stays inside
`BookingsService` where it already lives; the queue gets its own module.

**Tech Stack:** NestJS 11 · Prisma (PrismaPg adapter, raw CTEs) · Stripe +
PayPal · Next.js 16 (App Router, RSC + Server Actions) · `@tourism/ui`
(shadcn/Base UI) · `@tourism/i18n` · `@tourism/core` (generated OpenAPI client) ·
Vitest/Jest-style specs.

**Spec:** `docs/06-specs/2026-07-04-refund-cancellation-queue-design.md` — read it first.

## Global Constraints

- **Money-path review gate:** the full BE payments/CTE/DTO diff gets an
  **adversarial review by a strong model (opus/fable) before merge** (CLAUDE.md
  §Model routing). Do not merge Slice 1 without it.
- **Migration waits for the user's GO.** Never run `prisma migrate deploy`/apply
  on live before the user says GO. Use `--create-only`, show the SQL, wait.
- **One feature = branches per slice.** BE slice on `feat/refund-cancellation-be`;
  FE slices on `feat/refund-cancellation-admin` / `feat/refund-cancellation-web`.
  User reviews source → rebase + `--ff-only`. Confirm before any merge/push.
- **TDD on pure logic** — failing test first (red → green) for helpers, service
  methods, DTO/mapping. Visual/layout via manual + existing e2e.
- **English-only** (ADR-0005); user-facing copy lives in `@tourism/i18n`.
- **No hex colors** in FE — `@tourism/tokens` / `@tourism/ui` only.
- **Straight quotes** in code/text. **Conventional Commits** (`feat:`/`test:`/
  `docs:`…). No AI attribution.
- **Do not reformat lines a task doesn't name.** Keep neighbouring doc-comment
  density/idiom when editing a file.
- **`/gate` green** (lint + typecheck + test + build) before declaring a slice done.
- **Currency-aware money:** use the existing `toStripeMinorUnits(Decimal,
  currency)` and `toPayPalAmount(Decimal, currency)` from
  `apps/api/src/modules/payments/money.ts` — never hand-roll `amount*100`.

---

## File Structure

**BE (Slice 1):**
- Modify: `apps/api/prisma/schema.prisma` — enum values + `CancellationRequest` model + Booking columns.
- Create: `apps/api/prisma/migrations/<ts>_refund_cancellation_queue/migration.sql` (generated).
- Create: `apps/api/src/modules/bookings/refund-amount.ts` — pure `classifyRefund` helper.
- Create: `apps/api/src/modules/bookings/refund-amount.spec.ts`.
- Modify: `apps/api/src/modules/payments/stripe.service.ts` — `createRefund` accepts `amountMinorUnits?`.
- Modify: `apps/api/src/modules/payments/paypal.service.ts` — `refundCapture` accepts optional amount.
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` — `refundByAdmin(amount?)`, partial CTE, request resolution; enrich reads.
- Modify: `apps/api/src/modules/bookings/dto/refund-booking.dto.ts` — add `amount?`.
- Modify: `apps/api/src/modules/bookings/dto/booking.dto.ts` — add `cancellationRequest` + `refundedAmount`.
- Modify: `apps/api/src/modules/bookings/admin-bookings.controller.ts` — pass `amount`.
- Modify: `apps/api/src/modules/bookings/bookings.service.spec.ts` — refund tests.
- Create: `apps/api/src/modules/cancellations/` — `cancellations.module.ts`,
  `cancellations.service.ts`, `cancellations.controller.ts` (customer),
  `admin-cancellations.controller.ts`, `dto/*.dto.ts`, `cancellations.service.spec.ts`.
- Modify: `apps/api/src/app.module.ts` — register `CancellationsModule`.

**Shared (Slice 2):** regen `@tourism/core` (`/regen-types`).

**Admin FE (Slice 3):**
- Create: `apps/admin/src/app/(dashboard)/cancellation-requests/page.tsx` (+ path per repo routing).
- Create: `apps/admin/src/lib/cancellation-requests/data.ts` + `columns` + `*.spec.ts`.
- Modify: admin app-shell nav (Operations group) — add the queue item.
- Modify: admin booking-detail page — refund + deny dialogs + Server Actions.
- Create: `apps/admin/src/lib/bookings/refund.ts` (amount validation + error map) + `*.spec.ts`.

**Web FE (Slice 4):**
- Modify: `apps/web/src/components/booking/booking-actions.tsx` — status-aware.
- Create: `apps/web/src/lib/booking/cancellation-request.ts` (server action) + `*.spec.ts`.
- Delete: `apps/web/src/lib/booking/cancel-request.ts` + `cancel-request.spec.ts`.
- Modify: `apps/web/src/lib/api/booking.ts` — DTO type carries `cancellationRequest` + `refundedAmount`.
- Modify: `libs/shared/i18n` — `messages.booking.detail` new keys.

**Docs (after merge, rule 9):** `functions-admin.md` · `functions-customer.md` ·
`functions-system.md` · `data-model.md` · `roadmap.md` · `CLAUDE.md` · `HANDOFF.md`.

---

## Slice 1 — Backend (branch `feat/refund-cancellation-be`)

### Task B1: Schema + migration (USER GO GATE)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<ts>_refund_cancellation_queue/migration.sql` (generated)

**Interfaces:**
- Produces: `BookingStatus.PARTIALLY_REFUNDED`; `CancellationRequestStatus`
  enum (`REQUESTED|REFUNDED|DENIED`); `EmailType.CANCELLATION_REQUESTED` +
  `CANCELLATION_DENIED`; `Booking.refundedAmount: Decimal?` +
  `Booking.refundedAt: DateTime?`; `CancellationRequest` model; Prisma-client
  types for all of the above.

- [ ] **Step 1: Edit the enums** in `schema.prisma`.

Add to `BookingStatus` (after `REFUNDED`):
```prisma
enum BookingStatus {
  PENDING
  PAID
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}
```
Add to `EmailType` (after `ENQUIRY_RECEIVED`):
```prisma
enum EmailType {
  BOOKING_CONFIRMATION
  BOOKING_REFUNDED
  REVIEW_APPROVED
  ENQUIRY_RECEIVED
  CANCELLATION_REQUESTED
  CANCELLATION_DENIED
}
```
Add a new enum (next to the others, ~line 53):
```prisma
/// Support lifecycle for a PAID-booking cancellation request (2026-07-04).
enum CancellationRequestStatus {
  REQUESTED
  REFUNDED
  DENIED
}
```

- [ ] **Step 2: Add the two Booking columns.** In `model Booking`, after
  `refundedById` (keep the existing refund-audit grouping):
```prisma
  refundReason       String?         @map("refund_reason") @db.VarChar(500)
  refundedById       String?         @map("refunded_by") @db.Uuid
  refundedAmount     Decimal?        @map("refunded_amount") @db.Decimal(12, 2)
  refundedAt         DateTime?       @map("refunded_at")
```
And add the back-relation inside `model Booking` (with the other relations):
```prisma
  reviews             Review[]
  cancellationRequest CancellationRequest?
```

- [ ] **Step 3: Add the `CancellationRequest` model** (place it after `model Booking`, before `model Review`):
```prisma
// ─────────────────────────────────────────────────────────────────────────────
// CancellationRequest — a PAID customer's request to cancel/refund a booking
// (2026-07-04). One live row per booking (unique bookingId); a DENIED row is
// reused on re-request. Admin acts from the queue: refund resolves it to
// REFUNDED (see BookingsService.refundByAdmin), deny → DENIED.
// ─────────────────────────────────────────────────────────────────────────────

model CancellationRequest {
  id           String                    @id @default(uuid()) @db.Uuid
  bookingId    String                    @unique @map("booking_id") @db.Uuid
  userId       String                    @map("user_id") @db.Uuid
  reason       String                    @db.VarChar(1000)
  status       CancellationRequestStatus @default(REQUESTED)
  decisionNote String?                   @map("decision_note") @db.VarChar(500)
  decidedById  String?                   @map("decided_by") @db.Uuid
  decidedAt    DateTime?                 @map("decided_at")
  createdAt    DateTime                  @default(now()) @map("created_at")
  updatedAt    DateTime                  @updatedAt @map("updated_at")

  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  user      User    @relation("CancellationRequester", fields: [userId], references: [id], onDelete: Restrict)
  decidedBy User?   @relation("CancellationDecider", fields: [decidedById], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@map("cancellation_requests")
}
```

- [ ] **Step 4: Add the User back-relations.** In `model User`, with the other relations:
```prisma
  posts               Post[]
  cancellationRequests CancellationRequest[] @relation("CancellationRequester")
  cancellationDecisions CancellationRequest[] @relation("CancellationDecider")
```

- [ ] **Step 5: Validate + generate the migration SQL (create-only, do NOT apply).**

Run: `pnpm --filter @tourism/api exec prisma validate`
Expected: "The schema at ... is valid 🚀"

Run: `pnpm --filter @tourism/api exec prisma migrate dev --name refund_cancellation_queue --create-only`
Expected: a new `migration.sql` under `apps/api/prisma/migrations/` is written; the DB is **not** touched.

- [ ] **Step 6: Inspect the generated SQL.** Open the new `migration.sql`. Confirm it contains:
  - `ALTER TYPE "BookingStatus" ADD VALUE 'PARTIALLY_REFUNDED';`
  - `ALTER TYPE "EmailType" ADD VALUE 'CANCELLATION_REQUESTED';` + `... 'CANCELLATION_DENIED';`
  - `CREATE TYPE "CancellationRequestStatus" AS ENUM (...)`
  - `ALTER TABLE "bookings" ADD COLUMN "refunded_amount" ...` + `"refunded_at"`
  - `CREATE TABLE "cancellation_requests" (...)` + unique index on `booking_id` + index on `(status, created_at)` + 3 FKs (booking RESTRICT, user RESTRICT, decided_by SET NULL).

  **Pre-GO check** (Postgres enum-in-transaction gotcha): the new enum values are
  NOT used by any DDL in this same migration (the new table uses the freshly
  `CREATE TYPE`d `CancellationRequestStatus`), so there is no "unsafe use of new
  value" hazard. If Prisma emitted the `ALTER TYPE ADD VALUE` lines, that is
  expected and safe here.

- [ ] **Step 7: STOP — request user GO.** Post the SQL summary and ask:
  "Migration ready (adds `PARTIALLY_REFUNDED`, 2 EmailTypes, `CancellationRequestStatus`,
  2 Booking columns, `cancellation_requests` table). GO to apply on live Supabase?"
  **Do not proceed until the user says GO.**

- [ ] **Step 8: On GO — apply + regenerate client.**

Run: `pnpm --filter @tourism/api exec prisma migrate dev --name refund_cancellation_queue`
(applies the pending migration) then `pnpm --filter @tourism/api exec prisma generate`.
Expected: migration applied; client regenerated with the new types.

Run: `pnpm nx typecheck @tourism/api`
Expected: PASS (new Prisma types resolve).

- [ ] **Step 9: Commit.**
```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): schema for partial refunds + cancellation requests"
```

---

### Task B2: `classifyRefund` pure helper (TDD)

**Files:**
- Create: `apps/api/src/modules/bookings/refund-amount.ts`
- Test: `apps/api/src/modules/bookings/refund-amount.spec.ts`

**Interfaces:**
- Produces: `classifyRefund(total: Prisma.Decimal, amount?: number): { partial: boolean; amount: Prisma.Decimal }`
  — throws `BadRequestException({ code: 'INVALID_REFUND_AMOUNT' })` when
  `amount <= 0` or `amount > total`. `amount` omitted or `=== total` → `{ partial: false, amount: total }`.

- [ ] **Step 1: Write the failing test.**
```ts
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { classifyRefund } from './refund-amount';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('classifyRefund', () => {
  it('treats an omitted amount as a full refund', () => {
    expect(classifyRefund(D('99.00'))).toEqual({ partial: false, amount: D('99.00') });
  });

  it('treats amount equal to the total as a full refund', () => {
    expect(classifyRefund(D('99.00'), 99)).toEqual({ partial: false, amount: D('99.00') });
  });

  it('classifies a value below the total as partial', () => {
    const res = classifyRefund(D('99.00'), 30);
    expect(res.partial).toBe(true);
    expect(res.amount.equals(D('30'))).toBe(true);
  });

  it('rejects zero / negative amounts', () => {
    expect(() => classifyRefund(D('99.00'), 0)).toThrow(BadRequestException);
    expect(() => classifyRefund(D('99.00'), -5)).toThrow(BadRequestException);
  });

  it('rejects an amount above the total', () => {
    expect(() => classifyRefund(D('99.00'), 99.01)).toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module not found / not implemented).

Run: `pnpm nx test @tourism/api -- refund-amount`
Expected: FAIL.

- [ ] **Step 3: Implement.**
```ts
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Classifies an admin refund request against the booking total. An omitted
 * amount (or one that equals the total) is a FULL refund; a value strictly
 * between 0 and the total is PARTIAL. Anything ≤0 or >total is rejected. The
 * returned `amount` is a `Decimal` for currency-safe provider conversion.
 */
export function classifyRefund(
  total: Prisma.Decimal,
  amount?: number,
): { partial: boolean; amount: Prisma.Decimal } {
  if (amount === undefined) return { partial: false, amount: total };
  if (amount <= 0 || amount > total.toNumber()) {
    throw new BadRequestException({
      code: 'INVALID_REFUND_AMOUNT',
      message: `Refund amount must be greater than 0 and at most the booking total (${total.toString()})`,
    });
  }
  const value = new Prisma.Decimal(amount);
  return { partial: !value.equals(total), amount: value };
}
```

- [ ] **Step 4: Run — expect PASS.**
Run: `pnpm nx test @tourism/api -- refund-amount`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/modules/bookings/refund-amount.ts apps/api/src/modules/bookings/refund-amount.spec.ts
git commit -m "feat(api): classifyRefund helper for partial/full refunds"
```

---

### Task B3: Provider refund methods accept a partial amount

**Files:**
- Modify: `apps/api/src/modules/payments/stripe.service.ts:134-151`
- Modify: `apps/api/src/modules/payments/paypal.service.ts:148-153`

**Interfaces:**
- Produces: `stripe.createRefund({ paymentIntentId, reason?, amountMinorUnits? })`
  — passes `amount` to `refunds.create` only when set. `paypal.refundCapture(captureId, amount?: { value: string; currencyCode: string })`
  — passes an `amount` body only when set.

- [ ] **Step 1: Extend `createRefund`** (Stripe). Change the signature + body:
```ts
  async createRefund(args: {
    paymentIntentId: string;
    reason?: string;
    amountMinorUnits?: number;
  }): Promise<RefundResult> {
    const reasonField =
      args.reason && isDocumentedRefundReason(args.reason)
        ? { reason: args.reason }
        : { metadata: { internal_reason: args.reason ?? '' } };

    const refund = await this.stripe.refunds.create({
      payment_intent: args.paymentIntentId,
      ...(args.amountMinorUnits !== undefined ? { amount: args.amountMinorUnits } : {}),
      ...reasonField,
    });
    this.logger.log(
      `Issued refund ${refund.id} for payment_intent ${args.paymentIntentId} (status=${refund.status})`,
    );
    return { id: refund.id, status: refund.status };
  }
```
Also update the doc-comment first line to "Issues a full or partial refund against a Payment Intent…".

- [ ] **Step 2: Extend `refundCapture`** (PayPal):
```ts
  /** Refunds a captured payment — full, or a partial `amount` when provided. */
  async refundCapture(
    captureId: string,
    amount?: { value: string; currencyCode: string },
  ): Promise<PayPalRefundResult> {
    const { result } = await this.payments.refundCapturedPayment({
      captureId,
      body: amount
        ? { amount: { value: amount.value, currencyCode: amount.currencyCode } }
        : undefined,
    });
    this.logger.log(`Refunded PayPal capture ${captureId} (status=${result.status})`);
    return { id: result.id ?? '', status: result.status ?? null };
  }
```
> If the PayPal SDK's `refundCapturedPayment` arg shape differs (verify against
> the installed `@paypal/paypal-server-sdk` types via LSP/hover), adapt the
> `body` key name — the intent is "pass `amount` only when partial".

- [ ] **Step 3: Typecheck.**
Run: `pnpm nx typecheck @tourism/api`
Expected: PASS. (These wrappers are covered indirectly by the `bookings.service.spec.ts` mocks in Task B4/B5.)

- [ ] **Step 4: Commit.**
```bash
git add apps/api/src/modules/payments/stripe.service.ts apps/api/src/modules/payments/paypal.service.ts
git commit -m "feat(api): provider refund methods accept a partial amount"
```

---

### Task B4: `refundByAdmin` — amount plumbing, FULL path, INVALID guard, request resolution (TDD)

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.service.ts:493-599`
- Modify: `apps/api/src/modules/bookings/bookings.service.spec.ts`

**Interfaces:**
- Consumes: `classifyRefund` (B2); `toStripeMinorUnits`/`toPayPalAmount` (money.ts); provider methods (B3).
- Produces: `refundByAdmin({ code, reason?, amount?, adminUserId }): Promise<Booking>`.
  FULL path: gateway full refund → release seats → `REFUNDED` → resolve any open
  `CancellationRequest` to `REFUNDED`. Invalid amount → 400 `INVALID_REFUND_AMOUNT`.

- [ ] **Step 1: Add failing tests** to the `refundByAdmin` describe block in
  `bookings.service.spec.ts`. (Mirror the existing mock setup in that file —
  it already mocks `prisma`, `stripe`, `paypal`. Match its style.)
```ts
it('rejects an amount above the booking total with INVALID_REFUND_AMOUNT', async () => {
  // arrange a PAID Stripe booking with totalAmount '99.00' and providerPaymentId
  await expect(
    service.refundByAdmin({ code: 'BK-1', amount: 150, adminUserId: 'admin-1' }),
  ).rejects.toMatchObject({ response: { code: 'INVALID_REFUND_AMOUNT' } });
  expect(stripe.createRefund).not.toHaveBeenCalled();
});

it('full refund (amount omitted) refunds the whole PI and releases seats', async () => {
  await service.refundByAdmin({ code: 'BK-1', reason: 'x', adminUserId: 'admin-1' });
  expect(stripe.createRefund).toHaveBeenCalledWith(
    expect.objectContaining({ paymentIntentId: 'pi_1' }),
  );
  // amountMinorUnits NOT passed on a full refund:
  expect(stripe.createRefund).toHaveBeenCalledWith(
    expect.not.objectContaining({ amountMinorUnits: expect.anything() }),
  );
});

it('treats amount === total as a full refund (no amountMinorUnits)', async () => {
  await service.refundByAdmin({ code: 'BK-1', amount: 99, adminUserId: 'admin-1' });
  expect(stripe.createRefund).toHaveBeenCalledWith(
    expect.not.objectContaining({ amountMinorUnits: expect.anything() }),
  );
});
```
> The existing suite already asserts the seat-release + `REFUNDED` flip via the
> mocked `$queryRaw`; keep those passing. If the mock returns a fixed booking,
> extend the fixture so `totalAmount`/`currency` are present (needed below).

- [ ] **Step 2: Run — expect FAIL** (`amount` param not accepted / guard missing).
Run: `pnpm nx test @tourism/api -- bookings.service`
Expected: FAIL.

- [ ] **Step 3: Implement.** Update the method. (a) widen the args + the
  `select` to include `totalAmount`, `currency`; (b) classify; (c) pass
  `amountMinorUnits`/PayPal amount only when partial; (d) resolve an open request
  in the FULL CTE.

Signature + load:
```ts
  async refundByAdmin(args: {
    code: string;
    reason?: string;
    amount?: number;
    adminUserId: string;
  }): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { code: args.code },
      select: {
        id: true,
        code: true,
        status: true,
        paymentProvider: true,
        providerPaymentId: true,
        departureId: true,
        numAdults: true,
        numChildren: true,
        totalAmount: true,
        currency: true,
      },
    });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking "${args.code}" not found` });
    }
    if (booking.status !== BookingStatus.PAID || !booking.providerPaymentId) {
      throw new BadRequestException({
        code: 'BOOKING_NOT_REFUNDABLE',
        message: `Booking is ${booking.status}; only a PAID booking with a captured payment can be refunded`,
      });
    }

    const { partial, amount } = classifyRefund(booking.totalAmount, args.amount);
```
Provider call (add amount only when partial):
```ts
    try {
      if (booking.paymentProvider === PaymentProvider.STRIPE) {
        await this.stripe.createRefund({
          paymentIntentId: booking.providerPaymentId,
          reason: args.reason ?? 'requested_by_customer',
          ...(partial ? { amountMinorUnits: toStripeMinorUnits(amount, booking.currency) } : {}),
        });
      } else {
        await this.paypal.refundCapture(
          booking.providerPaymentId,
          partial ? { value: toPayPalAmount(amount, booking.currency), currencyCode: booking.currency } : undefined,
        );
      }
    } catch (err) {
      if (!this.isAlreadyRefundedError(err)) {
        const message = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Refund failed for ${booking.code}: ${message}`);
        throw new BadRequestException({ code: 'REFUND_FAILED', message: `Provider refund failed: ${message}` });
      }
      this.logger.warn(`Provider reports booking ${booking.code} already refunded — converging DB state`);
    }
```
Then branch to the FULL CTE (this task) — extend the existing CTE with a
`request_resolved` step (idempotent; only rows that flipped). Keep the partial
branch for B5:
```ts
    if (!partial) {
      const seats = booking.numAdults + booking.numChildren;
      await this.prisma.$queryRaw(Prisma.sql`
        WITH released AS (
          UPDATE tour_departures
          SET seats_booked = GREATEST(seats_booked - ${seats}, 0)
          WHERE id = ${booking.departureId}::uuid
            AND EXISTS (SELECT 1 FROM bookings WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus")
          RETURNING id
        ),
        refunded AS (
          UPDATE bookings
          SET status = 'REFUNDED'::"BookingStatus",
              cancelled_at = now(),
              refund_reason = ${args.reason ?? null},
              refunded_by = ${args.adminUserId}::uuid,
              refunded_amount = ${booking.totalAmount},
              refunded_at = now()
          WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus"
          RETURNING id
        ),
        request_resolved AS (
          UPDATE cancellation_requests
          SET status = 'REFUNDED'::"CancellationRequestStatus",
              decided_by = ${args.adminUserId}::uuid,
              decided_at = now(),
              updated_at = now()
          WHERE booking_id = (SELECT id FROM refunded) AND status = 'REQUESTED'::"CancellationRequestStatus"
          RETURNING id
        ),
        outbox_insert AS (
          INSERT INTO outbox (type, payload, dedupe_key)
          SELECT 'BOOKING_REFUNDED'::"EmailType", jsonb_build_object('bookingId', id), 'booking-refunded:' || id::text
          FROM refunded
          ON CONFLICT (dedupe_key) DO NOTHING
          RETURNING id
        )
        SELECT id FROM refunded
      `);
      this.logger.log(`Admin full-refunded booking ${booking.code} (${seats} seat(s) released, by ${args.adminUserId})`);
    } else {
      // B5 fills this in.
      throw new Error('partial refund not implemented yet');
    }

    const updated = await this.prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
    if (!updated) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking "${args.code}" not found` });
    }
    return updated;
  }
```
Add the imports at the top of the file:
```ts
import { classifyRefund } from './refund-amount';
// toStripeMinorUnits, toPayPalAmount already imported from '../payments/money'
```

- [ ] **Step 4: Run — expect PASS** (FULL-path + guard tests green; partial test not added yet).
Run: `pnpm nx test @tourism/api -- bookings.service`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/modules/bookings/bookings.service.ts apps/api/src/modules/bookings/bookings.service.spec.ts
git commit -m "feat(api): refundByAdmin accepts amount (full path + guard + request resolve)"
```

---

### Task B5: `refundByAdmin` — PARTIAL branch (TDD)

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` (the `else` branch from B4)
- Modify: `apps/api/src/modules/bookings/bookings.service.spec.ts`

**Interfaces:**
- Produces: partial refund → gateway refund WITH amount → **no seat release** →
  `status = PARTIALLY_REFUNDED`, `refundedAmount = amount`, `refundedAt = now()` →
  resolve open request to `REFUNDED`. Idempotent (gated `status='PAID'`).

- [ ] **Step 1: Add failing tests.**
```ts
it('partial refund sets PARTIALLY_REFUNDED + refundedAmount and does NOT release seats', async () => {
  await service.refundByAdmin({ code: 'BK-1', amount: 30, adminUserId: 'admin-1' });
  expect(stripe.createRefund).toHaveBeenCalledWith(
    expect.objectContaining({ amountMinorUnits: 3000 }), // 30.00 USD → cents
  );
  // assert the partial CTE ran (status arg PARTIALLY_REFUNDED, no seats decrement) —
  // match against the captured Prisma.sql the mocked $queryRaw received.
  const sql = (prisma.$queryRaw as jest.Mock).mock.calls.at(-1)?.[0];
  expect(String(sql)).toContain('PARTIALLY_REFUNDED');
  expect(String(sql)).not.toContain('seats_booked = GREATEST');
});

it('partial refund on a PayPal booking passes a partial amount to PayPal', async () => {
  // arrange a PAID PayPal booking, total '99.00'
  await service.refundByAdmin({ code: 'BK-PP', amount: 40, adminUserId: 'admin-1' });
  expect(paypal.refundCapture).toHaveBeenCalledWith(
    'cap_1',
    expect.objectContaining({ value: '40.00', currencyCode: 'USD' }),
  );
});
```
> Adjust the `String(sql)` assertion to however the suite already inspects
> `Prisma.sql` (check the existing full-refund test — reuse its technique).

- [ ] **Step 2: Run — expect FAIL** ("partial refund not implemented yet").
Run: `pnpm nx test @tourism/api -- bookings.service`
Expected: FAIL.

- [ ] **Step 3: Implement the `else` branch.** Replace the `throw new Error(...)`:
```ts
    } else {
      await this.prisma.$queryRaw(Prisma.sql`
        WITH refunded AS (
          UPDATE bookings
          SET status = 'PARTIALLY_REFUNDED'::"BookingStatus",
              refund_reason = ${args.reason ?? null},
              refunded_by = ${args.adminUserId}::uuid,
              refunded_amount = ${amount},
              refunded_at = now()
          WHERE id = ${booking.id}::uuid AND status = 'PAID'::"BookingStatus"
          RETURNING id
        ),
        request_resolved AS (
          UPDATE cancellation_requests
          SET status = 'REFUNDED'::"CancellationRequestStatus",
              decided_by = ${args.adminUserId}::uuid,
              decided_at = now(),
              updated_at = now()
          WHERE booking_id = (SELECT id FROM refunded) AND status = 'REQUESTED'::"CancellationRequestStatus"
          RETURNING id
        ),
        outbox_insert AS (
          INSERT INTO outbox (type, payload, dedupe_key)
          SELECT 'BOOKING_REFUNDED'::"EmailType", jsonb_build_object('bookingId', id), 'booking-refunded:' || id::text
          FROM refunded
          ON CONFLICT (dedupe_key) DO NOTHING
          RETURNING id
        )
        SELECT id FROM refunded
      `);
      this.logger.log(`Admin partial-refunded booking ${booking.code} (${amount.toString()} ${booking.currency}, seats kept, by ${args.adminUserId})`);
    }
```
> Note: partial keeps `paidAt`/`cancelledAt` untouched (booking is still active).
> Seats are intentionally NOT released (spec decision 4).

- [ ] **Step 4: Run — expect PASS.**
Run: `pnpm nx test @tourism/api -- bookings.service`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/modules/bookings/bookings.service.ts apps/api/src/modules/bookings/bookings.service.spec.ts
git commit -m "feat(api): partial refund keeps seats, sets PARTIALLY_REFUNDED"
```

---

### Task B6: Refund DTO gains `amount`; admin controller forwards it

**Files:**
- Modify: `apps/api/src/modules/bookings/dto/refund-booking.dto.ts`
- Modify: `apps/api/src/modules/bookings/admin-bookings.controller.ts:64-80`

**Interfaces:**
- Produces: `RefundBookingDto { reason?: string; amount?: number }`; the controller
  passes `body.amount` into `refundByAdmin`.

- [ ] **Step 1: Extend the DTO.**
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/** Request body for `POST /admin/bookings/:code/refund`. `amount` omitted = full refund. */
export class RefundBookingDto {
  @ApiPropertyOptional({ example: 'Customer cancelled within the free window', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ example: 30, description: 'Partial refund amount in the booking currency; omit for a full refund' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;
}
```

- [ ] **Step 2: Forward it** in `admin-bookings.controller.ts` `refund(...)`:
```ts
    return this.bookingsService.refundByAdmin({
      code,
      reason: body.reason,
      amount: body.amount,
      adminUserId: user.id,
    });
```
Update the `@ApiOperation` summary to "Admin: refund a PAID booking (full or partial) + release seats on full".

- [ ] **Step 3: Typecheck + test.**
Run: `pnpm nx typecheck @tourism/api && pnpm nx test @tourism/api -- bookings`
Expected: PASS.

- [ ] **Step 4: Commit.**
```bash
git add apps/api/src/modules/bookings/dto/refund-booking.dto.ts apps/api/src/modules/bookings/admin-bookings.controller.ts
git commit -m "feat(api): refund endpoint accepts optional partial amount"
```

---

### Task B7: Cancellations module — DTOs

**Files:**
- Create: `apps/api/src/modules/cancellations/dto/create-cancellation-request.dto.ts`
- Create: `apps/api/src/modules/cancellations/dto/cancellation-request.dto.ts`
- Create: `apps/api/src/modules/cancellations/dto/deny-cancellation-request.dto.ts`
- Create: `apps/api/src/modules/cancellations/dto/list-cancellation-requests-query.dto.ts`

**Interfaces:**
- Produces: `CreateCancellationRequestDto { reason?: string }`;
  `CancellationRequestSummaryDto { status; reason; createdAt; decisionNote; decidedAt }`
  (embedded on booking reads + returned by create);
  `AdminCancellationRequestDto { id; status; reason; createdAt; decidedAt; decisionNote; booking }`;
  `PaginatedCancellationRequestsDto { data; meta }`;
  `DenyCancellationRequestDto { decisionNote?: string }`;
  `ListCancellationRequestsQueryDto { page?; pageSize?; status? }`.

- [ ] **Step 1: Create `create-cancellation-request.dto.ts`.**
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for `POST /bookings/:code/cancellation-request`. Reason is optional. */
export class CreateCancellationRequestDto {
  @ApiPropertyOptional({ example: 'Change of travel plans', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
```

- [ ] **Step 2: Create `cancellation-request.dto.ts`** (the customer-facing summary + admin list item).
```ts
import { ApiProperty } from '@nestjs/swagger';
import { CancellationRequestStatus } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Cancellation-request state embedded on a booking read (customer badge). */
export class CancellationRequestSummaryDto {
  @ApiProperty({ enum: CancellationRequestStatus, example: CancellationRequestStatus.REQUESTED })
  status!: CancellationRequestStatus;

  @ApiProperty({ example: 'Change of travel plans' })
  reason!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: String })
  decisionNote!: string | null;

  @ApiProperty({ nullable: true, format: 'date-time', type: String })
  decidedAt!: string | null;
}

/** Booking context shown on a queue row. */
export class AdminCancellationBookingRefDto {
  @ApiProperty({ example: 'BK-7Q2KX9AB' }) code!: string;
  @ApiProperty({ example: 'Hoi An Walking Tour' }) tourTitle!: string;
  @ApiProperty({ format: 'date', example: '2026-08-15' }) departureStartDate!: string;
  @ApiProperty({ example: 'Nguyen Van A' }) customerName!: string;
  @ApiProperty({ example: 'guest@example.com' }) customerEmail!: string;
}

/** One row in the admin cancellation-request queue. */
export class AdminCancellationRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: CancellationRequestStatus }) status!: CancellationRequestStatus;
  @ApiProperty({ example: 'Change of travel plans' }) reason!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ nullable: true, format: 'date-time', type: String }) decidedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) decisionNote!: string | null;
  @ApiProperty({ type: AdminCancellationBookingRefDto }) booking!: AdminCancellationBookingRefDto;
}

export class PaginatedCancellationRequestsDto {
  @ApiProperty({ type: [AdminCancellationRequestDto] }) data!: AdminCancellationRequestDto[];
  @ApiProperty({ type: PageMetaDto }) meta!: PageMetaDto;
}
```
> **Verify** `PageMetaDto` path — the subscribers work referenced
> `components['schemas']['PageMetaDto']`, so a shared `PageMetaDto` exists. Find
> it (grep `class PageMetaDto`) and import from there; if the paginated DTOs
> inline their meta instead, mirror `PaginatedBookingsDto`'s meta shape.

- [ ] **Step 3: Create `deny-cancellation-request.dto.ts`.**
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for `POST /admin/cancellation-requests/:id/deny`. */
export class DenyCancellationRequestDto {
  @ApiPropertyOptional({ example: 'Outside the free-cancellation window', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
```

- [ ] **Step 4: Create `list-cancellation-requests-query.dto.ts`** (mirror `ListAdminBookingsQueryDto` for `page`/`pageSize` transforms — copy its `@Type`/`@IsInt`/`@Min`/`@Max` decorators exactly).
```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListCancellationRequestsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: CancellationRequestStatus, description: 'Defaults to REQUESTED' })
  @IsOptional() @IsEnum(CancellationRequestStatus)
  status?: CancellationRequestStatus;
}
```

- [ ] **Step 5: Typecheck + commit.**
Run: `pnpm nx typecheck @tourism/api`
Expected: PASS.
```bash
git add apps/api/src/modules/cancellations/dto
git commit -m "feat(api): cancellation-request DTOs"
```

---

### Task B8: `CancellationsService.createRequest` (TDD)

**Files:**
- Create: `apps/api/src/modules/cancellations/cancellations.service.ts`
- Test: `apps/api/src/modules/cancellations/cancellations.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`. `Caller { id: string; role: UserRole }`.
- Produces: `createRequest(code: string, caller: Caller, dto: CreateCancellationRequestDto): Promise<CancellationRequestSummaryDto>`.
  Guards: 404 `BOOKING_NOT_FOUND` (missing / not owned); 409 `CANCELLATION_NOT_ALLOWED`
  (not PAID); 409 `DEPARTURE_ALREADY_STARTED`; 409 `CANCELLATION_ALREADY_REQUESTED`
  (an open REQUESTED row exists). Upserts by `bookingId` (a DENIED row is reset to
  REQUESTED) + enqueues a `CANCELLATION_REQUESTED` outbox row (dedupe per booking).

- [ ] **Step 1: Write failing tests** (mirror `enquiry.service.spec.ts` mock style — a mocked `PrismaService` with `booking.findUnique`, `cancellationRequest.upsert`, `$transaction`). Cover:
```ts
// 404 when the booking is missing or not owned by the caller
// 409 CANCELLATION_NOT_ALLOWED when status !== 'PAID'
// 409 DEPARTURE_ALREADY_STARTED when departure.startDate is in the past
// 409 CANCELLATION_ALREADY_REQUESTED when an open REQUESTED row exists
// happy path: PAID + future departure + no open request → upsert REQUESTED + outbox enqueue, returns summary with status REQUESTED
// re-request: an existing DENIED row → upsert resets it to REQUESTED (update branch called)
```
Use a fixed "now" by injecting it, OR compare against a departure date far in the past/future so the test is time-stable (prefer future/past constants like `'2999-01-01'` / `'2000-01-01'`).

- [ ] **Step 2: Run — expect FAIL.**
Run: `pnpm nx test @tourism/api -- cancellations.service`
Expected: FAIL.

- [ ] **Step 3: Implement.**
```ts
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationRequestStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { CancellationRequestSummaryDto } from './dto/cancellation-request.dto';

export interface Caller {
  id: string;
  role: UserRole;
}

@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A PAID customer requests to cancel their booking. Owner-only (else 404).
   * Blocked once the departure has started, and while an open request exists.
   * A prior DENIED request is reused (reset to REQUESTED). Enqueues a
   * CANCELLATION_REQUESTED outbox row (email deferred; the row is written now).
   */
  async createRequest(
    code: string,
    caller: Caller,
    dto: CreateCancellationRequestDto,
  ): Promise<CancellationRequestSummaryDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      select: {
        id: true,
        userId: true,
        status: true,
        departure: { select: { startDate: true } },
        cancellationRequest: { select: { status: true } },
      },
    });
    // Owner-or-404 (never leak existence to a non-owner). Admins don't use this route.
    if (!booking || booking.userId !== caller.id) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: `Booking "${code}" not found` });
    }
    if (booking.status !== 'PAID') {
      throw new ConflictException({
        code: 'CANCELLATION_NOT_ALLOWED',
        message: `Booking is ${booking.status}; only a PAID booking can be cancelled by request`,
      });
    }
    if (booking.departure.startDate.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'DEPARTURE_ALREADY_STARTED',
        message: 'This departure has already started; contact support directly',
      });
    }
    if (booking.cancellationRequest?.status === CancellationRequestStatus.REQUESTED) {
      throw new ConflictException({
        code: 'CANCELLATION_ALREADY_REQUESTED',
        message: 'A cancellation request is already open for this booking',
      });
    }

    const reason = dto.reason?.trim() ?? '';
    const [request] = await this.prisma.$transaction([
      this.prisma.cancellationRequest.upsert({
        where: { bookingId: booking.id },
        create: { bookingId: booking.id, userId: caller.id, reason, status: CancellationRequestStatus.REQUESTED },
        update: { reason, status: CancellationRequestStatus.REQUESTED, decisionNote: null, decidedById: null, decidedAt: null },
        select: { status: true, reason: true, createdAt: true, decisionNote: true, decidedAt: true },
      }),
      this.prisma.outbox.createMany({
        data: [{
          type: 'CANCELLATION_REQUESTED',
          payload: { bookingId: booking.id } as Prisma.InputJsonValue,
          dedupeKey: `cancellation-requested:${booking.id}`,
        }],
        skipDuplicates: true,
      }),
    ]);
    this.logger.log(`Cancellation requested for booking ${code} (by ${caller.id})`);
    return {
      status: request.status,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      decisionNote: request.decisionNote,
      decidedAt: request.decidedAt ? request.decidedAt.toISOString() : null,
    };
  }
}
```
> `$transaction([...])` (batch) is the established pattern here (see
> `enquiry.service.ts`). `createMany + skipDuplicates` makes the outbox enqueue
> idempotent. Dedupe is per-booking, so a re-request after DENY won't re-email —
> acceptable (emails are deferred); note it in the docs sweep.

- [ ] **Step 4: Run — expect PASS.**
Run: `pnpm nx test @tourism/api -- cancellations.service`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/modules/cancellations/cancellations.service.ts apps/api/src/modules/cancellations/cancellations.service.spec.ts
git commit -m "feat(api): CancellationsService.createRequest with guards + outbox"
```

---

### Task B9: `CancellationsService` admin methods — list + deny (TDD)

**Files:**
- Modify: `apps/api/src/modules/cancellations/cancellations.service.ts`
- Modify: `apps/api/src/modules/cancellations/cancellations.service.spec.ts`

**Interfaces:**
- Produces: `findAllForAdmin(query): Promise<PaginatedCancellationRequestsDto>`
  (default status `REQUESTED`, newest first, `Promise.all` list+count);
  `denyRequest(id, adminUserId, dto): Promise<AdminCancellationRequestDto>`
  — 404 `CANCELLATION_REQUEST_NOT_FOUND`; 409 `CANCELLATION_NOT_PENDING` when
  status !== REQUESTED; sets DENIED + audit + `CANCELLATION_DENIED` outbox.

- [ ] **Step 1: Write failing tests** (mirror the same mock style). Cover:
  list defaults to REQUESTED + maps a row to `AdminCancellationRequestDto`; deny
  missing → 404; deny non-REQUESTED → 409; deny happy path → DENIED + outbox
  enqueue + returns mapped row.

- [ ] **Step 2: Run — expect FAIL.**
Run: `pnpm nx test @tourism/api -- cancellations.service`
Expected: FAIL.

- [ ] **Step 3: Implement.** Add these methods + imports (`ListCancellationRequestsQueryDto`, `DenyCancellationRequestDto`, the DTO types):
```ts
  async findAllForAdmin(
    query: ListCancellationRequestsQueryDto,
  ): Promise<PaginatedCancellationRequestsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CancellationRequestWhereInput = {
      status: query.status ?? CancellationRequestStatus.REQUESTED,
    };
    const [rows, total] = await Promise.all([
      this.prisma.cancellationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, status: true, reason: true, createdAt: true, decidedAt: true, decisionNote: true,
          booking: {
            select: {
              code: true, contactName: true, contactEmail: true,
              tour: { select: { title: true } },
              departure: { select: { startDate: true } },
            },
          },
        },
      }),
      this.prisma.cancellationRequest.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
        decisionNote: r.decisionNote,
        booking: {
          code: r.booking.code,
          tourTitle: r.booking.tour.title,
          departureStartDate: r.booking.departure.startDate.toISOString().slice(0, 10),
          customerName: r.booking.contactName,
          customerEmail: r.booking.contactEmail,
        },
      })),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }

  async denyRequest(
    id: string,
    adminUserId: string,
    dto: DenyCancellationRequestDto,
  ): Promise<AdminCancellationRequestDto> {
    const existing = await this.prisma.cancellationRequest.findUnique({
      where: { id }, select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'CANCELLATION_REQUEST_NOT_FOUND', message: `Request "${id}" not found` });
    }
    if (existing.status !== CancellationRequestStatus.REQUESTED) {
      throw new ConflictException({
        code: 'CANCELLATION_NOT_PENDING',
        message: `Request is ${existing.status}; only an open request can be denied`,
      });
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.cancellationRequest.update({
        where: { id },
        data: {
          status: CancellationRequestStatus.DENIED,
          decisionNote: dto.decisionNote?.trim() || null,
          decidedById: adminUserId,
          decidedAt: new Date(),
        },
        select: {
          id: true, status: true, reason: true, createdAt: true, decidedAt: true, decisionNote: true,
          booking: {
            select: {
              code: true, contactName: true, contactEmail: true,
              tour: { select: { title: true } },
              departure: { select: { startDate: true } },
            },
          },
        },
      }),
      this.prisma.outbox.createMany({
        data: [{
          type: 'CANCELLATION_DENIED',
          payload: { requestId: id } as Prisma.InputJsonValue,
          dedupeKey: `cancellation-denied:${id}`,
        }],
        skipDuplicates: true,
      }),
    ]);
    this.logger.log(`Cancellation request ${id} denied (by ${adminUserId})`);
    return {
      id: updated.id, status: updated.status, reason: updated.reason,
      createdAt: updated.createdAt.toISOString(),
      decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
      decisionNote: updated.decisionNote,
      booking: {
        code: updated.booking.code,
        tourTitle: updated.booking.tour.title,
        departureStartDate: updated.booking.departure.startDate.toISOString().slice(0, 10),
        customerName: updated.booking.contactName,
        customerEmail: updated.booking.contactEmail,
      },
    };
  }
```

- [ ] **Step 4: Run — expect PASS.** Run: `pnpm nx test @tourism/api -- cancellations.service`. Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add apps/api/src/modules/cancellations
git commit -m "feat(api): admin cancellation-request list + deny"
```

---

### Task B10: Controllers + module wiring

**Files:**
- Create: `apps/api/src/modules/cancellations/cancellations.controller.ts` (customer)
- Create: `apps/api/src/modules/cancellations/admin-cancellations.controller.ts`
- Create: `apps/api/src/modules/cancellations/cancellations.module.ts`
- Modify: `apps/api/src/app.module.ts` — register `CancellationsModule`

**Interfaces:**
- Produces routes: `POST /bookings/:code/cancellation-request`;
  `GET /admin/cancellation-requests`; `POST /admin/cancellation-requests/:id/deny`.

- [ ] **Step 1: Customer controller.** (Mirror `BookingsController`'s `requireUser` guard + `@CurrentUser`.)
```ts
import { Body, Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CancellationsService } from './cancellations.service';
import { CreateCancellationRequestDto, } from './dto/create-cancellation-request.dto';
import { CancellationRequestSummaryDto } from './dto/cancellation-request.dto';

@ApiTags('Cancellations')
@ApiBearerAuth('supabase-jwt')
@Controller('bookings')
export class CancellationsController {
  constructor(private readonly service: CancellationsService) {}

  @Post(':code/cancellation-request')
  @ApiOperation({ summary: 'Request cancellation/refund of your own PAID booking' })
  @ApiCreatedResponse({ type: CancellationRequestSummaryDto })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Booking not found or not owned' })
  @ApiResponse({ status: 409, description: 'Not PAID / departure started / already requested' })
  request(
    @CurrentUser() user: User | null,
    @Param('code') code: string,
    @Body() body: CreateCancellationRequestDto,
  ): Promise<CancellationRequestSummaryDto> {
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_SYNCED', message: 'Run POST /auth/sync first' });
    }
    return this.service.createRequest(code, { id: user.id, role: user.role }, body);
  }
}
```

- [ ] **Step 2: Admin controller.** (Mirror `AdminBookingsController` guards + `@CurrentUser` for deny audit.)
```ts
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CancellationsService } from './cancellations.service';
import { DenyCancellationRequestDto } from './dto/deny-cancellation-request.dto';
import { ListCancellationRequestsQueryDto } from './dto/list-cancellation-requests-query.dto';
import { AdminCancellationRequestDto, PaginatedCancellationRequestsDto } from './dto/cancellation-request.dto';

@ApiTags('Cancellations (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/cancellation-requests')
export class AdminCancellationsController {
  constructor(private readonly service: CancellationsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list cancellation requests (default REQUESTED)' })
  @ApiOkResponse({ type: PaginatedCancellationRequestsDto })
  list(@Query() query: ListCancellationRequestsQueryDto): Promise<PaginatedCancellationRequestsDto> {
    return this.service.findAllForAdmin(query);
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: deny a cancellation request (booking stays PAID)' })
  @ApiOkResponse({ type: AdminCancellationRequestDto })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Request is not open' })
  deny(
    @CurrentUser() user: User | null,
    @Param('id') id: string,
    @Body() body: DenyCancellationRequestDto,
  ): Promise<AdminCancellationRequestDto> {
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_SYNCED', message: 'Run POST /auth/admin/sync first' });
    }
    return this.service.denyRequest(id, user.id, body);
  }
}
```

- [ ] **Step 3: Module.** (Mirror `enquiry.module.ts` — how it provides `PrismaService`/imports the Prisma module.)
```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CancellationsService } from './cancellations.service';
import { CancellationsController } from './cancellations.controller';
import { AdminCancellationsController } from './admin-cancellations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CancellationsController, AdminCancellationsController],
  providers: [CancellationsService],
})
export class CancellationsModule {}
```
> If `PrismaModule` is `@Global()` (check `enquiry.module.ts` — it may omit the
> import), drop the `imports` line to match the sibling modules exactly.

- [ ] **Step 4: Register** in `app.module.ts` — add `CancellationsModule` to the `imports` array next to `BookingsModule`/`EnquiryModule`.

- [ ] **Step 5: Typecheck + full API test + boot smoke.**
Run: `pnpm nx typecheck @tourism/api && pnpm nx test @tourism/api`
Expected: PASS. Then `pnpm nx serve @tourism/api` and confirm the 3 new routes appear in Swagger at `/api/docs` (kill after).

- [ ] **Step 6: Commit.**
```bash
git add apps/api/src/modules/cancellations apps/api/src/app.module.ts
git commit -m "feat(api): cancellation request + admin queue/deny endpoints"
```

---

### Task B11: Enrich booking reads with the request summary + refundedAmount (TDD/DTO)

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` (`BOOKING_INCLUDE`, `BOOKING_DETAIL_INCLUDE`, `AdminBookingDetail`, `toAdminBookingDetail`)
- Modify: `apps/api/src/modules/bookings/dto/booking.dto.ts`
- Modify: `apps/api/src/modules/bookings/dto/admin-booking-detail.dto.ts`

**Interfaces:**
- Produces: customer `BookingDto` gains `refundedAmount: string | null` +
  `cancellationRequest: CancellationRequestSummaryDto | null`. Admin
  `AdminBookingDetailDto` gains `cancellationRequest` (with `id`) +
  `refundedAmount`/`refundedAt`. Reads populate them via `include`.

- [ ] **Step 1: Add the relation to `BOOKING_INCLUDE`** (customer reads):
```ts
const BOOKING_INCLUDE: Prisma.BookingInclude = {
  tour: { select: { slug: true, title: true } },
  departure: { select: { startDate: true, endDate: true } },
  cancellationRequest: {
    select: { status: true, reason: true, createdAt: true, decisionNote: true, decidedAt: true },
  },
};
```
> `refundedAmount`/`refundedAt` are scalar Booking columns — already returned by
> default (Prisma `Decimal` serializes to a string via the envelope). No mapping
> needed; just document them on the DTO.

- [ ] **Step 2: Extend `BookingDto`.** Add (import `CancellationRequestSummaryDto` from the cancellations module dto):
```ts
  @ApiProperty({ nullable: true, type: String, example: '30.00' })
  refundedAmount!: string | null;

  @ApiProperty({ nullable: true, type: () => CancellationRequestSummaryDto })
  cancellationRequest!: CancellationRequestSummaryDto | null;
```
> The Prisma `cancellationRequest` relation returns `Date` objects for
> `createdAt`/`decidedAt`; the envelope's JSON serialization stringifies them, so
> the wire shape matches `CancellationRequestSummaryDto` (ISO strings). Confirm
> the interceptor serializes nested `Date`→ISO (the existing `createdAt` on
> `BookingDto` already relies on this).

- [ ] **Step 3: Admin detail.** Add `cancellationRequest` (with `id`) to
  `BOOKING_DETAIL_INCLUDE`, to the `AdminBookingDetail` interface, to
  `toAdminBookingDetail`, and to `AdminBookingDetailDto`. Also add
  `refundedAmount`/`refundedAt` to the interface + DTO (they already surface as
  scalars; add for Swagger + so the FE type carries them). Mirror the existing
  `refundReason`/`refundedBy` handling in `toAdminBookingDetail`.

- [ ] **Step 4: Update the affected `bookings.service.spec.ts` fixtures** so the
  mocked include returns `cancellationRequest: null` where a booking read is
  asserted (keep existing assertions green).

- [ ] **Step 5: Typecheck + test.**
Run: `pnpm nx typecheck @tourism/api && pnpm nx test @tourism/api -- bookings`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add apps/api/src/modules/bookings
git commit -m "feat(api): expose cancellation request + refundedAmount on booking reads"
```

---

### Task B12: BE slice gate + money-path adversarial review (CHECKPOINT)

- [ ] **Step 1: Run `/gate` on the API.**
Run: `pnpm nx run-many -t lint typecheck test build --projects=@tourism/api`
Expected: all green.

- [ ] **Step 2: Adversarial review (REQUIRED).** Dispatch a strong-model
  (opus/fable) review over the full diff of `bookings.service.ts` (refund
  branches + CTEs), `refund-amount.ts`, `stripe.service.ts`, `paypal.service.ts`,
  and `cancellations.service.ts`. Prompt it to attack: partial-amount rounding
  vs currency, seat-release only on full, idempotency of both CTEs (gated on
  `status='PAID'`), request-resolution race, PayPal partial-amount body shape,
  `REFUND_FAILED` leaves PAID, converge-on-already-refunded still holds. Fix
  anything it confirms.

- [ ] **Step 3: STOP for user source review** → rebase + `--ff-only` merge of
  `feat/refund-cancellation-be` after the user approves. (Migration already
  applied under the B1 GO gate.)

---

## Slice 2 — Regenerate the typed client (branch `feat/refund-cancellation-web` base)

### Task S2: Regen `@tourism/core`

**Files:** Modify (generated): `libs/shared/core/src/lib/api/schema.ts`

- [ ] **Step 1:** Ensure the API is running with the new DTOs: `pnpm nx serve @tourism/api` (separate terminal).
- [ ] **Step 2:** Run `pnpm nx run @tourism/core:api-types` (hits `http://localhost:3000/api/docs-json`).
- [ ] **Step 3:** `git diff --stat` — confirm `schema.ts` now has `BookingDto.cancellationRequest` + `refundedAmount`, `CancellationRequestSummaryDto`, `AdminCancellationRequestDto`, `PaginatedCancellationRequestsDto`, `RefundBookingDto.amount`, and the new `BookingStatus` enum value `PARTIALLY_REFUNDED`.
- [ ] **Step 4:** `pnpm nx run-many -t typecheck --projects=@tourism/web,@tourism/admin` — surface any consumer breaks from the enum widening (e.g. exhaustive `switch`/`Record` on `BookingStatus`). Fix in the respective slice.
- [ ] **Step 5:** Commit.
```bash
git add libs/shared/core/src/lib/api/schema.ts
git commit -m "chore(core): regen client for partial refunds + cancellation requests"
```

---

## Slice 3 — Admin FE (branch `feat/refund-cancellation-admin`)

> **Extend, don't rebuild.** A refund dialog + `refundBooking` action + error map
> already exist. Add: partial amount + mis-click safeguard; a deny action +
> dialog; a queue page.

### Task A1: Format/gating helpers for the new states (TDD)

**Files:**
- Modify: `apps/admin/src/lib/bookings/format.ts`
- Modify: `apps/admin/src/lib/bookings/format.spec.ts`
- Create: `apps/admin/src/lib/bookings/refund.ts`
- Test: `apps/admin/src/lib/bookings/refund.spec.ts`

**Interfaces:**
- Produces: `bookingStatusMeta('PARTIALLY_REFUNDED')` → a label + variant;
  `canRefund` stays PAID-only; `validateRefundAmount(input: string, total: string): { amount?: number; error?: string }`
  (pure: parses, enforces `0 < amount ≤ total`, ≤2dp).

- [ ] **Step 1: Extend `format.spec.ts`** — add a `bookingStatusMeta('PARTIALLY_REFUNDED')` case (choose label `'Partially refunded'`, variant e.g. `'destructive'` or a distinct one) and confirm `canRefund('PARTIALLY_REFUNDED') === false`.

- [ ] **Step 2: Write `refund.spec.ts`.**
```ts
import { validateRefundAmount } from './refund';

describe('validateRefundAmount', () => {
  it('accepts a value between 0 and the total', () => {
    expect(validateRefundAmount('30', '99.00')).toEqual({ amount: 30 });
    expect(validateRefundAmount('99.00', '99.00')).toEqual({ amount: 99 });
  });
  it('rejects zero, negative, or > total', () => {
    expect(validateRefundAmount('0', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('-5', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('120', '99.00').error).toBeTruthy();
  });
  it('rejects a non-number or more than 2 decimals', () => {
    expect(validateRefundAmount('abc', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('10.005', '99.00').error).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run — expect FAIL.** `pnpm nx test @tourism/admin -- refund`. Expected: FAIL.

- [ ] **Step 4: Implement `refund.ts` + `format.ts` changes.**
```ts
// refund.ts
export function validateRefundAmount(
  input: string,
  total: string,
): { amount?: number; error?: string } {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: 'Enter a valid amount (up to 2 decimals).' };
  }
  const amount = Number(trimmed);
  const max = Number(total);
  if (amount <= 0) return { error: 'Amount must be greater than 0.' };
  if (Number.isFinite(max) && amount > max) return { error: `Amount cannot exceed the total (${total}).` };
  return { amount };
}
```
In `format.ts`, add `PARTIALLY_REFUNDED` to `bookingStatusMeta` (keep `canRefund`
returning `status === 'PAID'`). Update the `BookingStatus` type usage if it is a
hand-written union (it derives from the regen'd schema, so the new value flows in).

- [ ] **Step 5: Run — expect PASS.** `pnpm nx test @tourism/admin -- "refund|format"`. Expected: PASS.
- [ ] **Step 6: Commit.**
```bash
git add apps/admin/src/lib/bookings/format.ts apps/admin/src/lib/bookings/format.spec.ts apps/admin/src/lib/bookings/refund.ts apps/admin/src/lib/bookings/refund.spec.ts
git commit -m "feat(admin): partial-refund amount validation + partially-refunded status meta"
```

---

### Task A2: Error-code copy for new API codes

**Files:** Modify `apps/admin/src/lib/api/error.ts` (`FRIENDLY_BY_CODE`)

- [ ] **Step 1:** Add friendly strings for the new codes (append to the existing map alongside `BOOKING_NOT_REFUNDABLE`/`REFUND_FAILED`):
```ts
  INVALID_REFUND_AMOUNT: 'That refund amount is not valid for this booking.',
  CANCELLATION_REQUEST_NOT_FOUND: 'That cancellation request no longer exists.',
  CANCELLATION_NOT_PENDING: 'This request has already been resolved.',
```
- [ ] **Step 2:** Typecheck + commit.
```bash
git add apps/admin/src/lib/api/error.ts
git commit -m "feat(admin): friendly copy for refund/cancellation error codes"
```

---

### Task A3: Refund dialog — partial amount + mis-click safeguard

**Files:**
- Modify: `apps/admin/src/components/bookings/refund-booking.tsx`
- Modify: `apps/admin/src/lib/bookings/actions.ts` (`refundBooking` passes `amount`)

**Interfaces:**
- Consumes: `validateRefundAmount` (A1). Adds an optional `hasOpenRequest?: boolean` prop.
- Produces: `refundBooking(code, { reason?, amount? })` server action; the dialog
  sends `amount` only for a partial.

- [ ] **Step 1: Extend the server action** `refundBooking`:
```ts
export interface RefundBookingInput { reason?: string; amount?: number; }

export async function refundBooking(code: string, input: RefundBookingInput = {}): Promise<RefundBookingState> {
  const reason = input.reason?.trim();
  const body: Record<string, unknown> = {};
  if (reason) body.reason = reason;
  if (input.amount !== undefined) body.amount = input.amount;
  try {
    await apiWrite('POST', `/api/v1/admin/bookings/${encodeURIComponent(code)}/refund`, body);
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${code}`);
  revalidatePath('/cancellation-requests');
  return {};
}
```
> Update the single existing caller in `refund-booking.tsx` from
> `refundBooking(code, reason)` to `refundBooking(code, { reason, amount })`.

- [ ] **Step 2: Extend the dialog** `refund-booking.tsx`. Add an amount `Field`
  (default value = `totalAmount` when there IS an open request; empty when not),
  a mode line explaining "Full refund releases seats · Partial keeps the
  booking", and — **when `!hasOpenRequest`** — a warning banner ("No cancellation
  request on file — you're refunding proactively") plus a required confirm
  `Checkbox` that gates the `AlertDialogAction`. On confirm: run
  `validateRefundAmount(amountInput, totalAmount)`; if the parsed amount equals
  `Number(totalAmount)` send `{ reason }` (full), else `{ reason, amount }`
  (partial). Keep the existing `useTransition` + `toast` + inline `role="alert"`
  error pattern. Use `@tourism/ui` `Checkbox` (confirm it's exported; else use a
  `Field` + native checkbox following repo idiom).

- [ ] **Step 3: Typecheck + build the admin app.**
Run: `pnpm nx typecheck @tourism/admin`
Expected: PASS.

- [ ] **Step 4: Commit.**
```bash
git add apps/admin/src/components/bookings/refund-booking.tsx apps/admin/src/lib/bookings/actions.ts
git commit -m "feat(admin): partial refund amount + proactive-refund safeguard"
```

---

### Task A4: Deny action + booking-detail request panel

**Files:**
- Modify: `apps/admin/src/lib/bookings/actions.ts` (add `denyCancellation`)
- Create: `apps/admin/src/components/bookings/deny-cancellation.tsx`
- Modify: `apps/admin/src/app/(admin)/bookings/[code]/page.tsx` (render request panel + partial-refund details)
- Modify: `apps/admin/src/lib/bookings/data.ts` (`getBooking` already returns the enriched `AdminBookingDetail` — no change if the type regen'd; verify)

- [ ] **Step 1: Add `denyCancellation` action** (sibling of `refundBooking`):
```ts
export async function denyCancellation(requestId: string, code: string, decisionNote?: string): Promise<RefundBookingState> {
  const note = decisionNote?.trim();
  try {
    await apiWrite('POST', `/api/v1/admin/cancellation-requests/${encodeURIComponent(requestId)}/deny`, note ? { decisionNote: note } : {});
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/cancellation-requests');
  revalidatePath(`/bookings/${code}`);
  return {};
}
```

- [ ] **Step 2: Create `deny-cancellation.tsx`** — clone `refund-booking.tsx`'s
  AlertDialog-with-reason pattern (Textarea = `decisionNote`, destructive
  confirm, `useTransition` + toast + inline error), calling `denyCancellation`.

- [ ] **Step 3: Render the request panel** on the detail page: when
  `booking.cancellationRequest?.status === 'REQUESTED'`, show a Card with the
  reason + requested-at and the `<RefundBooking hasOpenRequest />` + `<DenyCancellation requestId=... code=... />`
  buttons. Extend the existing `status === 'REFUNDED'` audit block to also render
  for `PARTIALLY_REFUNDED` and show `booking.refundedAmount`.

- [ ] **Step 4: Typecheck + commit.**
Run: `pnpm nx typecheck @tourism/admin`
```bash
git add apps/admin/src/components/bookings/deny-cancellation.tsx apps/admin/src/lib/bookings/actions.ts "apps/admin/src/app/(admin)/bookings/[code]/page.tsx"
git commit -m "feat(admin): deny action + cancellation panel on booking detail"
```

---

### Task A5: Cancellation-request queue page + nav

**Files:**
- Create: `apps/admin/src/lib/cancellation-requests/data.ts`
- Create: `apps/admin/src/app/(admin)/cancellation-requests/page.tsx`
- Create: `apps/admin/src/components/cancellation-requests/cancellation-requests-view.tsx`
- Modify: `apps/admin/src/components/shell/app-shell.tsx` (Operations nav)

**Interfaces:**
- Consumes: `getApiClient` typed `GET /api/v1/admin/cancellation-requests`.
- Produces: `listCancellationRequests(params): Promise<{ data; meta }>`; a
  paginated queue page under Operations linking each row to `/bookings/{code}`.

- [ ] **Step 1: `data.ts`** (mirror `subscribers/data.ts`):
```ts
import type { components } from '@tourism/core';
import { getApiClient } from '../api/client';

export type CancellationRequest = components['schemas']['AdminCancellationRequestDto'];
export type PageMeta = components['schemas']['PageMetaDto'];
export interface CancellationRequestList { data: CancellationRequest[]; meta: PageMeta; }

export async function listCancellationRequests(
  params: { page?: number; pageSize?: number; status?: CancellationRequest['status'] } = {},
): Promise<CancellationRequestList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/cancellation-requests', {
    params: { query: { page: params.page, pageSize: params.pageSize, status: params.status } },
  });
  return data as unknown as CancellationRequestList;
}
```

- [ ] **Step 2: Page** (mirror `subscribers/page.tsx` — `AdminListHeader`,
  `ErrorAlert`, `parsePage`/`parsePageSize`, pass rows+meta to the view).

- [ ] **Step 3: View** (mirror `subscribers-view.tsx` for the static table +
  `ServerTablePagination`, OR `enquiries-view.tsx` if you want row-click). Columns:
  booking code (link to `/bookings/{code}`), tour, customer, departure date,
  reason (truncate), requested-at (`formatRelativeTime`/`formatShortDate`),
  "Review →" link. No mutations here — the money actions live on the detail page.

- [ ] **Step 4: Nav.** In `app-shell.tsx`, import a `lucide-react` icon (e.g.
  `TicketX`/`FileClock`) and add to the Operations `items` array:
```tsx
{ title: 'Cancellations', href: '/cancellation-requests', icon: FileClock },
```

- [ ] **Step 5: Typecheck + build.**
Run: `pnpm nx run-many -t typecheck build --projects=@tourism/admin`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add apps/admin/src/lib/cancellation-requests apps/admin/src/app apps/admin/src/components
git commit -m "feat(admin): cancellation-request queue page under Operations"
```

---

### Task A6: Admin slice gate + review

- [ ] **Step 1:** `pnpm nx run-many -t lint typecheck test build --projects=@tourism/admin` — green.
- [ ] **Step 2:** Manual smoke against the running API: open `/cancellation-requests`, open a PAID booking detail, exercise a partial refund (verify amount input + the no-request safeguard), a full refund, and a deny.
- [ ] **Step 3:** STOP for user source review → rebase + `--ff-only`.

---

## Slice 4 — Web FE (branch `feat/refund-cancellation-web`)

### Task W1: API fn + server action for the real request (TDD on the pure builder)

**Files:**
- Modify: `apps/web/src/lib/api/booking.ts` (add `requestBookingCancellation`)
- Modify: `apps/web/src/lib/booking/actions.ts` (add `requestCancellationAction`)
- Create: `apps/web/src/lib/booking/cancellation-request.ts` (pure body builder)
- Create: `apps/web/src/lib/booking/cancellation-request.spec.ts`
- Delete: `apps/web/src/lib/booking/cancel-request.ts` + `cancel-request.spec.ts`

**Interfaces:**
- Produces: `buildCancellationRequestBody(reason: string): { reason?: string }`
  (pure — trims; omits `reason` when blank);
  `requestBookingCancellation(code, body): Promise<void>` (authed POST);
  `requestCancellationAction(code, reason): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Write `cancellation-request.spec.ts`** (replaces the deleted enquiry-string spec):
```ts
import { buildCancellationRequestBody } from './cancellation-request';

describe('buildCancellationRequestBody', () => {
  it('trims a provided reason', () => {
    expect(buildCancellationRequestBody('  change of plans  ')).toEqual({ reason: 'change of plans' });
  });
  it('omits reason when blank', () => {
    expect(buildCancellationRequestBody('   ')).toEqual({});
    expect(buildCancellationRequestBody('')).toEqual({});
  });
});
```

- [ ] **Step 2: Delete the old files.**
```bash
git rm apps/web/src/lib/booking/cancel-request.ts apps/web/src/lib/booking/cancel-request.spec.ts
```

- [ ] **Step 3: Run — expect FAIL** (new module missing). `pnpm nx test @tourism/web -- cancellation-request`. Expected: FAIL.

- [ ] **Step 4: Implement `cancellation-request.ts`.**
```ts
/** Shapes the cancellation-request body; omits an empty reason. */
export function buildCancellationRequestBody(reason: string): { reason?: string } {
  const trimmed = reason.trim();
  return trimmed ? { reason: trimmed } : {};
}
```

- [ ] **Step 5: Add the api fn** in `booking.ts` (mirror `cancelBooking`):
```ts
/** Request cancellation/refund of a PAID booking (`POST /bookings/{code}/cancellation-request`). */
export async function requestBookingCancellation(code: string, body: { reason?: string }): Promise<void> {
  await authedJson(`/api/v1/bookings/${encodeURIComponent(code)}/cancellation-request`, {
    method: 'POST',
    body,
  });
}
```

- [ ] **Step 6: Add the server action** in `actions.ts` (mirror `cancelBookingAction`):
```ts
export async function requestCancellationAction(code: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestBookingCancellation(code, buildCancellationRequestBody(reason));
    revalidatePath(`/account/bookings/${code}`);
    revalidatePath('/account/bookings');
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      console.error('[booking] cancellation request failed', { code, apiCode: e.code, status: e.status });
      return { ok: false, error: errorMessage(e.code) };
    }
    console.error('[booking] cancellation request unexpected error', e);
    return { ok: false, error: errors.generic };
  }
}
```
Add the imports (`requestBookingCancellation` from `../api/booking`, `buildCancellationRequestBody` from `./cancellation-request`).

- [ ] **Step 7: Run — expect PASS.** `pnpm nx test @tourism/web -- cancellation-request`. Expected: PASS.
- [ ] **Step 8: Commit.**
```bash
git add apps/web/src/lib/booking/cancellation-request.ts apps/web/src/lib/booking/cancellation-request.spec.ts apps/web/src/lib/api/booking.ts apps/web/src/lib/booking/actions.ts
git commit -m "feat(web): booking-tied cancellation request action (replaces enquiry hack)"
```

---

### Task W2: i18n copy for the new states

**Files:** Modify `libs/shared/i18n/src/lib/messages.ts`

- [ ] **Step 1:** In `messages.booking.detail` (~line 391), add keys for the
  status-aware states (keep straight-apostrophe house style used around them):
```ts
  requestPending: 'Cancellation requested — we’ll email you about a refund.',
  requestDenied: 'Your cancellation request was declined.',
  requestResubmit: 'Request cancellation again',
  refundedNote: (amount: string) => `Refunded ${amount}.`,
  partiallyRefundedNote: (amount: string) => `Partially refunded ${amount}.`,
```
- [ ] **Step 2:** In `messages.booking.list.status` (~line 383), add:
```ts
  PARTIALLY_REFUNDED: 'Partially refunded',
```
- [ ] **Step 3:** In `messages.booking.errors` (~line 325), add friendly copy for
  the new API codes so `errorMessage()` resolves them:
```ts
  CANCELLATION_NOT_ALLOWED: 'This booking can’t be cancelled online. Contact us for help.',
  DEPARTURE_ALREADY_STARTED: 'This trip has already started — please contact us directly.',
  CANCELLATION_ALREADY_REQUESTED: 'You’ve already sent a cancellation request for this booking.',
```
- [ ] **Step 4:** Add the `PARTIALLY_REFUNDED` tone in
  `apps/web/src/lib/booking/my-bookings.ts` `STATUS_TONES` (reuse the destructive
  tone or a distinct token-based one — no hex):
```ts
  PARTIALLY_REFUNDED: 'border-transparent bg-destructive/15 text-destructive',
```
  Add a `bookingStatusTone('PARTIALLY_REFUNDED')` case to `my-bookings.spec.ts`.
- [ ] **Step 5:** Typecheck + test + commit.
```bash
git add libs/shared/i18n/src/lib/messages.ts apps/web/src/lib/booking/my-bookings.ts apps/web/src/lib/booking/my-bookings.spec.ts
git commit -m "feat(web): copy + status tone for cancellation-request states"
```

---

### Task W3: `BookingActions` becomes status-aware against real request data

**Files:** Modify `apps/web/src/components/booking/booking-actions.tsx`

- [ ] **Step 1: Rip out the enquiry hack.** Remove the imports of
  `buildCancellationRequestPayload` (`../../lib/booking/cancel-request`) and
  `submitEnquiry` (`../../lib/api/enquiry`), and the `sendRequest` enquiry body.

- [ ] **Step 2: Drive the PAID branch from `booking.cancellationRequest`.** New logic:
  - `booking.cancellationRequest?.status === 'REQUESTED'` → render the
    `t.requestPending` status line (no form; the earlier local `reqStatus==='sent'`
    state is replaced by server data after `router.refresh()`).
  - otherwise (no request, or `status === 'DENIED'`) → render the request form;
    if DENIED, also show `t.requestDenied` + `t.requestResubmit` label + the
    policy link. On submit call `requestCancellationAction(booking.code, reason)`;
    on `{ ok: true }` → `router.refresh()` (server re-fetch flips to the pending
    state); on error show `t.requestError` (or the returned `error`).
  - Keep a local `submitting` boolean for the in-flight button label only.
- [ ] **Step 3: Handle terminal states.** The final `return null` branch
  (CANCELLED/REFUNDED) should also cover `PARTIALLY_REFUNDED` — but since the page
  wants to show "Refunded $X" / "Partially refunded $X", render those notes
  (using `t.refundedNote(formatPrice(booking.refundedAmount))` /
  `t.partiallyRefundedNote(...)`) instead of `null` when `refundedAmount` is set.
  (`formatPrice` is imported on the page; pass what you need or format inline with
  the existing money helper.)
- [ ] **Step 4: Typecheck + build.**
Run: `pnpm nx run-many -t typecheck build --projects=@tourism/web`
Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add apps/web/src/components/booking/booking-actions.tsx
git commit -m "feat(web): status-aware cancellation UI from real request data"
```

---

### Task W4: Web slice gate + review

- [ ] **Step 1:** `pnpm nx run-many -t lint typecheck test build --projects=@tourism/web` — green.
- [ ] **Step 2:** Manual smoke: as a customer, request cancellation on a PAID booking → see "requested" state; deny it in admin → customer sees "declined" + can re-request; refund (partial) in admin → customer sees "Partially refunded $X".
- [ ] **Step 3:** STOP for user source review → rebase + `--ff-only`.

---

## Docs sweep (CLAUDE.md rule 9 — after the merges, do NOT skip)

- [ ] `docs/03-reference/functions-admin.md`: A-BKG-3 → partial (drop the 🕒
  "Partial refund" note); **add A-CXR-1** (List Cancellation Requests) + **A-CXR-2**
  (Deny) under a new `CancellationRequest` section (model code `CXR`).
- [ ] `docs/03-reference/functions-customer.md`: add a `U-BKG` row for
  `POST /bookings/:code/cancellation-request` (guards + upsert + outbox).
- [ ] `docs/03-reference/functions-system.md`: add the `CANCELLATION_REQUESTED` /
  `CANCELLATION_DENIED` outbox types (note the per-booking dedupe → no re-email on
  re-request).
- [ ] `docs/01-architecture/data-model.md`: `CancellationRequest` model +
  `CancellationRequestStatus` enum + Booking `refundedAmount`/`refundedAt` +
  `BookingStatus.PARTIALLY_REFUNDED`.
- [ ] `docs/roadmap.md` P4 row · `CLAUDE.md` project table (api/admin/web lines +
  test-count baselines) · `HANDOFF.md` §Next action (mark candidate A done; note
  refund is now partial-capable + queue live).
- [ ] Update the **test-count baselines** (api / web / admin) everywhere they
  appear once the final counts are known.
- [ ] The design spec's STATUS line
  (`docs/06-specs/2026-07-04-refund-cancellation-queue-design.md`) → mark complete.

---

## Self-Review (against the spec)

**Spec coverage** — every spec section maps to a task:
- Schema (enum, model, columns, EmailTypes) → **B1**.
- Partial-refund service + provider amount + INVALID guard + no-seat-release +
  PARTIALLY_REFUNDED + request resolution → **B2–B6** (+ **B4/B5** CTEs).
- Customer request endpoint (guards + upsert + outbox) → **B7–B10**.
- Read enrichment (customer badge + admin panel) → **B11**.
- Money-path adversarial review + migration GO gate → **B1 Step 7**, **B12**.
- Regen client → **S2**.
- Admin queue page + refund(partial + safeguard) + deny → **A1–A6**.
- Web status-aware UI + delete enquiry hack → **W1–W4**.
- Docs sweep → final section.

**Placeholder scan:** no "TBD/TODO/handle edge cases" — each code step carries
real code; the few "verify X against the installed SDK / PageMetaDto path"
notes are explicit verification steps, not deferrals.

**Type consistency:** `refundByAdmin({ ..., amount? })` is defined in B4 and
consumed by the controller in B6 with the same key; `classifyRefund` returns
`{ partial, amount }` used identically in B4/B5; `CancellationRequestSummaryDto`
(B7) is the shape embedded in B11 and returned by `createRequest` (B8);
`AdminCancellationRequestDto` (B7) is returned by `findAllForAdmin`/`denyRequest`
(B9) and consumed by the admin `data.ts` (A5); `validateRefundAmount` (A1) is
consumed by the dialog (A3); `buildCancellationRequestBody` (W1) feeds
`requestCancellationAction` (W1) and is asserted in its spec. Booking-status
strings match the Prisma enum (`PARTIALLY_REFUNDED`) across BE/admin/web.
