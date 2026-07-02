# Admin Bookings polish (Wave 6) — implementation plan

**STATUS: COMPLETE (2026-07-02)** — all 3 slices executed via subagent-driven development and
ff-merged to `main`: slice 0 `829558a` (tourId indexes applied to Supabase with user go/no-go) ·
slice 1 `763eb5b` (detail enrichment + userId filter + regen; `ecc:code-reviewer`
APPROVE-WITH-NOTES) · slice 2 `cd39082` (detail cards + list deep-link). Gate green per slice;
api tests 257, admin tests 127. **FOLLOW-UP (from the slice-1 review, MEDIUM):** the
payment-events JSONB path query seq-scans `payment_events` on every admin booking-detail view —
fine at current volume; when webhook volume grows, add a generated `booking_id` column + btree
index (or formalize an FK). LOW note: the envelope-shape coupling (webhook payload paths) has no
DB-backed integration test — matches the existing raw-SQL test strategy.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Booking detail answers "who is this customer / did the webhook finish / which session was this / is the departure full?" — customer identity + other-bookings mini-list, metadata-only PaymentEvent trail, `providerSessionId`, departure seats — plus the Wave-5 follow-up `@@index([tourId])` migration and a `?userId=` list deep-link. Per spec `docs/06-specs/2026-07-02-admin-bookings-polish-design.md`.

**Architecture:** 3 slices, one branch each. Slice 0: schema-only index migration (user go/no-go before apply). Slice 1: additive `AdminBookingDetailDto` enrichment (allow-list mapper + `Promise.all` side reads; PaymentEvents linked via the payload JSONB paths the webhook handlers already use) + optional `userId` on the admin list query. Slice 2: admin FE — detail-page cards + list deep-link, all deploy-lag-guarded.

**Tech Stack:** NestJS 11 + Prisma 7 (api) · Next.js 16 admin · jest.

## Global Constraints

- **Deploy-lag guards** on every new FE field (Render ships after Vercel): `?? []` / `?? null` / optional-chain; blocks hidden until the API ships them.
- **PII:** `payment_events.payload` is NEVER selected/exposed — metadata columns only.
- **Public surface unchanged:** customer `BookingDto` endpoints untouched; all additions live on the admin detail DTO / admin list query only.
- **Pooler:** parallel reads via `Promise.all`, never batch `$transaction`.
- **Copy/quotes:** do NOT change quote style in existing copy (no curly→straight "fixes" — recurring implementer gotcha); straight quotes in code; JSX apostrophes as `&apos;` matching file conventions.
- No hex colors; relative imports (no `@/`); Base UI `render` prop conventions; Conventional Commits, no AI attribution; never stage unrelated dirty files (`docs/07-plans/*.md` linter-touched, `playground.md`).
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile` (build is the TS gate for admin). Baselines: api 254 tests, admin 124.
- Subagent model routing: haiku = transcription tasks, sonnet = reasoning tasks + ALL task reviewers; `ecc:code-reviewer` on slice 1. Merging a green slice to `main` is pre-authorized; pause on CRITICAL/HIGH only.
- Regen routine (controller runs inline, slice 1 only): background `pnpm nx serve @tourism/api` → poll `http://localhost:3000/api/docs-json` to 200 → `pnpm nx run @tourism/core:api-types` → eyeball the diff → kill the port-3000 process tree → `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` → commit `libs/shared/core/src/lib/api/schema.ts` alone (`chore(core): regen API types (admin booking detail enrichment)`).

---

# Slice 0 — `@@index([tourId])` migration (Wave-5 follow-up)

Branch off `main`: `git checkout -b perf/tour-id-indexes`

### Task 1: index Booking.tourId + Enquiry.tourId

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (Booking block ~line 376-378; Enquiry block ~line 480)
- Create (generated): `apps/api/prisma/migrations/<timestamp>_add_tour_id_indexes/migration.sql`

**Interfaces:** none (schema-only; no API shape change, no regen).

- [ ] **Step 1: Edit the schema.** In `model Booking`, after the existing `@@index([status, createdAt])` line add:

```prisma
  @@index([tourId])
```

In `model Enquiry`, after its `@@index([status, createdAt])` line add:

```prisma
  @@index([tourId])
```

- [ ] **Step 2: ⛔ USER CHECKPOINT — do not proceed without an explicit go.** Tell the user the migration is ready to apply to the live Supabase DB (two `CREATE INDEX` on small tables, additive, no locks of consequence) and wait for confirmation. This checkpoint was agreed in the spec.

- [ ] **Step 3: Generate + apply the migration.** From `apps/api` (migrations read `DIRECT_URL` via `prisma.config.ts`):

Run: `pnpm exec prisma migrate dev --name add_tour_id_indexes`
Expected: a new `prisma/migrations/<timestamp>_add_tour_id_indexes/migration.sql` containing exactly two statements shaped like `CREATE INDEX "bookings_tour_id_idx" ON "bookings"("tour_id");` and `CREATE INDEX "enquiries_tour_id_idx" ON "enquiries"("tour_id");`, reported as applied.

- [ ] **Step 4: Gate.** Run: `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — all green (api 254 unchanged; schema-only).

- [ ] **Step 5: Commit + merge.**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "perf(api): index Booking.tourId + Enquiry.tourId (Wave-5 follow-up)"
git checkout main && git merge --ff-only perf/tour-id-indexes && git branch -d perf/tour-id-indexes && git push
```

---

# Slice 1 — BE: detail enrichment + `userId` list filter

Branch off `main`: `git checkout -b feat/admin-bookings-polish-be`

### Task 2: service — enriched `AdminBookingDetail` (TDD)

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` (`BOOKING_DETAIL_INCLUDE` ~line 48 · `AdminBookingDetail` interface ~line 61 · `toAdminBookingDetail` ~line 86 · `findByCodeForAdmin` ~line 612)
- Test: `apps/api/src/modules/bookings/bookings.service.spec.ts` (`makePrisma` ~line 26; `findByCodeForAdmin` describe ~line 685)

**Interfaces:**
- Produces (service layer — Task 3 mirrors these onto Swagger DTOs; Task 5 regen makes them FE-visible):
  - `AdminBookingDetail` gains `providerSessionId: string | null` · `departure: { startDate: string; endDate: string; seatsTotal: number; seatsBooked: number }` · `customer: { id: string; fullName: string | null; email: string; createdAt: string }` · `otherBookings: { total: number; items: OtherBookingItem[] }` · `paymentEvents: PaymentEventSummary[]`
  - `export interface OtherBookingItem { code: string; status: BookingStatus; createdAt: string; tourTitle: string; totalAmount: string; currency: string }`
  - `export interface PaymentEventSummary { id: string; provider: PaymentProvider; type: string; eventId: string; receivedAt: string; processedAt: string | null }`

- [ ] **Step 1: Update the test harness.** In `bookings.service.spec.ts` `makePrisma` (line ~50), add a zero-default `count` to the booking mock block so older tests stay green:

```ts
    booking: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data })),
      update: jest.fn(),
      ...m.booking,
    },
```

- [ ] **Step 2: Extend the TWO existing `findByCodeForAdmin` row mocks** (lines ~689 and ~729): each `findUnique` row additionally needs (values per row, ids consistent):

```ts
            userId: 'user-1',
            providerSessionId: 'cs_abc123',
            user: {
              id: 'user-1',
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              createdAt: new Date('2026-01-05T00:00:00Z'),
            },
```

and extend each row's `departure` to:

```ts
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 12,
              seatsBooked: 7,
            },
```

Both existing detail tests also need the side-read mocks quiet: pass `$queryRaw: jest.fn().mockResolvedValue([])` into `makePrisma` for each (the shared default resolves `[{ id: 'bk-1' }]`, which is not an event row).

- [ ] **Step 3: Write the NEW failing tests.** Append inside the `findByCodeForAdmin` describe:

```ts
    it('maps customer, seats, session id, other bookings and payment events', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          code: 'BK-OTHER',
          status: 'PAID',
          createdAt: new Date('2026-05-01T00:00:00Z'),
          totalAmount: { toString: () => '150.00' },
          currency: 'USD',
          tour: { title: 'Mekong Delta Day Trip' },
        },
      ]);
      const count = jest.fn().mockResolvedValue(7);
      const $queryRaw = jest.fn().mockResolvedValue([
        {
          id: 'evt-row-1',
          provider: 'STRIPE',
          type: 'checkout.session.completed',
          eventId: 'evt_1',
          receivedAt: new Date('2026-07-01T10:00:00Z'),
          processedAt: null,
        },
      ]);
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-1',
            code: 'BK-1',
            status: 'PAID',
            numAdults: 2,
            numChildren: 0,
            totalAmount: { toString: () => '99.00' },
            currency: 'USD',
            paymentProvider: 'STRIPE',
            contactName: 'Jane',
            contactEmail: 'jane@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-1',
            providerSessionId: 'cs_abc123',
            user: {
              id: 'user-1',
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              createdAt: new Date('2026-01-05T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 12,
              seatsBooked: 7,
            },
            paidAt: new Date('2026-07-01T10:00:00Z'),
            cancelledAt: null,
            providerPaymentId: 'pi_123',
            refundReason: null,
            refundedBy: null,
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-07-01T10:00:00Z'),
          }),
          findMany,
          count,
        },
        $queryRaw,
      });

      const result = await svcWith(prisma).findByCodeForAdmin('BK-1');

      expect(result.providerSessionId).toBe('cs_abc123');
      expect(result.departure.seatsTotal).toBe(12);
      expect(result.departure.seatsBooked).toBe(7);
      expect(result.customer).toEqual({
        id: 'user-1',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        createdAt: '2026-01-05T00:00:00.000Z',
      });
      expect(result.otherBookings.total).toBe(7);
      expect(result.otherBookings.items).toEqual([
        {
          code: 'BK-OTHER',
          status: 'PAID',
          createdAt: '2026-05-01T00:00:00.000Z',
          tourTitle: 'Mekong Delta Day Trip',
          totalAmount: '150.00',
          currency: 'USD',
        },
      ]);
      expect(result.paymentEvents).toEqual([
        {
          id: 'evt-row-1',
          provider: 'STRIPE',
          type: 'checkout.session.completed',
          eventId: 'evt_1',
          receivedAt: '2026-07-01T10:00:00.000Z',
          processedAt: null,
        },
      ]);
      // Other-bookings query excludes the current booking + caps at 5, newest first.
      const otherArgs = findMany.mock.calls[0][0];
      expect(otherArgs.where).toEqual({ userId: 'user-1', id: { not: 'bk-1' } });
      expect(otherArgs.take).toBe(5);
      expect(otherArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('returns empty otherBookings/paymentEvents when the customer has no history', async () => {
      const prisma = makePrisma({
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'bk-2',
            code: 'BK-2',
            status: 'PENDING',
            numAdults: 1,
            numChildren: 0,
            totalAmount: { toString: () => '39.00' },
            currency: 'USD',
            paymentProvider: 'PAYPAL',
            contactName: 'Bob',
            contactEmail: 'bob@example.com',
            contactPhone: null,
            specialRequests: null,
            userId: 'user-2',
            providerSessionId: null,
            user: {
              id: 'user-2',
              fullName: null,
              email: 'bob@example.com',
              createdAt: new Date('2026-06-01T00:00:00Z'),
            },
            tour: { slug: 'hoi-an', title: 'Hoi An Walking Tour' },
            departure: {
              startDate: new Date('2026-08-15T00:00:00Z'),
              endDate: new Date('2026-08-18T00:00:00Z'),
              seatsTotal: 10,
              seatsBooked: 0,
            },
            paidAt: null,
            cancelledAt: null,
            providerPaymentId: null,
            refundReason: null,
            refundedBy: null,
            createdAt: new Date('2026-06-30T08:00:00Z'),
            updatedAt: new Date('2026-06-30T08:00:00Z'),
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      });

      const result = await svcWith(prisma).findByCodeForAdmin('BK-2');

      expect(result.providerSessionId).toBeNull();
      expect(result.customer.fullName).toBeNull();
      expect(result.otherBookings).toEqual({ total: 0, items: [] });
      expect(result.paymentEvents).toEqual([]);
    });
```

- [ ] **Step 4: Run to verify the new tests fail** (and note which OLD detail tests now also fail — expected until Step 5 lands).

Run: `pnpm nx test @tourism/api`
Expected: the 2 new tests FAIL (`customer`/`otherBookings` undefined); the 2 pre-existing detail tests may fail on the new reads until the mocks from Step 2 are in place (they were updated in Step 2, so only the 2 new tests should fail).

- [ ] **Step 5: Implement.** In `bookings.service.ts`:

(a) `BOOKING_DETAIL_INCLUDE` becomes:

```ts
/** Detail read adds the admin refunder + the customer account + departure capacity. */
const BOOKING_DETAIL_INCLUDE = {
  tour: { select: { slug: true, title: true } },
  departure: {
    select: { startDate: true, endDate: true, seatsTotal: true, seatsBooked: true },
  },
  refundedBy: { select: { fullName: true, email: true } },
  user: { select: { id: true, fullName: true, email: true, createdAt: true } },
} satisfies Prisma.BookingInclude;
```

(b) Above the `AdminBookingDetail` interface add the two exported item shapes + a private raw-row shape:

```ts
/** Another booking by the same customer — detail mini-list row. */
export interface OtherBookingItem {
  code: string;
  status: BookingStatus;
  createdAt: string;
  tourTitle: string;
  totalAmount: string;
  currency: string;
}

/**
 * Webhook event linked to a booking — METADATA ONLY (the JSONB payload holds
 * provider payment data / PII and is deliberately never selected).
 * `processedAt` null = the handler never finished — the prime debug signal.
 */
export interface PaymentEventSummary {
  id: string;
  provider: PaymentProvider;
  type: string;
  eventId: string;
  receivedAt: string;
  processedAt: string | null;
}

/** Raw `$queryRaw` row for the payment-event trail (dates still `Date`). */
interface PaymentEventRow {
  id: string;
  provider: PaymentProvider;
  type: string;
  eventId: string;
  receivedAt: Date;
  processedAt: Date | null;
}
```

(c) In the `AdminBookingDetail` interface: replace the `departure` line and add the new fields (keep the rest untouched):

```ts
  departure: { startDate: string; endDate: string; seatsTotal: number; seatsBooked: number };
  providerSessionId: string | null;
  customer: { id: string; fullName: string | null; email: string; createdAt: string };
  otherBookings: { total: number; items: OtherBookingItem[] };
  paymentEvents: PaymentEventSummary[];
```

(d) `toAdminBookingDetail` — the side reads are composed by the caller, so narrow its return type and add the row-local fields:

```ts
/** Explicit allow-list mapper — no accidental passthrough of internal columns. */
function toAdminBookingDetail(
  b: BookingWithDetail,
): Omit<AdminBookingDetail, 'otherBookings' | 'paymentEvents'> {
```

and inside the returned object: extend `departure` to

```ts
    departure: {
      startDate: b.departure.startDate.toISOString(),
      endDate: b.departure.endDate.toISOString(),
      seatsTotal: b.departure.seatsTotal,
      seatsBooked: b.departure.seatsBooked,
    },
```

and add alongside `providerPaymentId`:

```ts
    providerSessionId: b.providerSessionId,
    customer: {
      id: b.user.id,
      fullName: b.user.fullName,
      email: b.user.email,
      createdAt: b.user.createdAt.toISOString(),
    },
```

(e) `findByCodeForAdmin` becomes:

```ts
  /** One booking by code for an admin (sees any booking; no owner check). 404 if missing. */
  async findByCodeForAdmin(code: string): Promise<AdminBookingDetail> {
    const booking = await this.prisma.booking.findUnique({
      where: { code },
      include: BOOKING_DETAIL_INCLUDE,
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking "${code}" not found`,
      });
    }

    // Side reads in parallel (Promise.all — pooler-safe, no batch $transaction).
    // PaymentEvent has no FK to Booking: link through the SAME payload paths the
    // webhook handlers route by (Stripe metadata.bookingId / PayPal custom_id).
    const othersWhere = { userId: booking.userId, id: { not: booking.id } };
    const [otherRows, otherTotal, eventRows] = await Promise.all([
      this.prisma.booking.findMany({
        where: othersWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          code: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          currency: true,
          tour: { select: { title: true } },
        },
      }),
      this.prisma.booking.count({ where: othersWhere }),
      this.prisma.$queryRaw<PaymentEventRow[]>(Prisma.sql`
        SELECT id, provider, type, event_id AS "eventId",
               received_at AS "receivedAt", processed_at AS "processedAt"
        FROM payment_events
        WHERE (provider = 'STRIPE'
               AND payload->'data'->'object'->'metadata'->>'bookingId' = ${booking.id})
           OR (provider = 'PAYPAL'
               AND payload->'resource'->>'custom_id' = ${booking.id})
        ORDER BY received_at DESC
      `),
    ]);

    return {
      ...toAdminBookingDetail(booking),
      otherBookings: {
        total: otherTotal,
        items: otherRows.map((r) => ({
          code: r.code,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          tourTitle: r.tour.title,
          totalAmount: r.totalAmount.toString(),
          currency: r.currency,
        })),
      },
      paymentEvents: eventRows.map((e) => ({
        id: e.id,
        provider: e.provider,
        type: e.type,
        eventId: e.eventId,
        receivedAt: e.receivedAt.toISOString(),
        processedAt: e.processedAt ? e.processedAt.toISOString() : null,
      })),
    };
  }
```

- [ ] **Step 6: Run tests.**

Run: `pnpm nx test @tourism/api`
Expected: ALL pass (254 + 2 new = 256).

- [ ] **Step 7: Commit.**

```bash
git add apps/api/src/modules/bookings/bookings.service.ts apps/api/src/modules/bookings/bookings.service.spec.ts
git commit -m "feat(api): admin booking detail — customer, other bookings, payment-event trail, session id, seats"
```

### Task 3: Swagger DTOs for the new detail fields

**Files:**
- Modify: `apps/api/src/modules/bookings/dto/admin-booking-detail.dto.ts`

**Interfaces:**
- Consumes: the Task-2 service shapes (names/types must match EXACTLY — the generated FE types come from these decorators).
- Produces: `AdminBookingDetailDto` with `providerSessionId` · `departure: AdminBookingDepartureRefDto` (adds `seatsTotal`/`seatsBooked`) · `customer: BookingCustomerDto` · `otherBookings: OtherBookingsDto` · `paymentEvents: PaymentEventSummaryDto[]`.

- [ ] **Step 1: Rewrite `admin-booking-detail.dto.ts`** — keep `RefundedByDto` and the existing fields; the full new file:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus, PaymentProvider } from '@prisma/client';
import { BookingDepartureRefDto, BookingDto } from './booking.dto';

/** The admin user who issued a refund — shown in the detail refund-audit panel. */
export class RefundedByDto {
  @ApiProperty({ nullable: true, type: String, example: 'Jane Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;
}

/** Departure ref + capacity (admin detail only — the public ref has no seat data). */
export class AdminBookingDepartureRefDto extends BookingDepartureRefDto {
  @ApiProperty({ example: 12 })
  seatsTotal!: number;

  @ApiProperty({ example: 7 })
  seatsBooked!: number;
}

/** The customer ACCOUNT behind the booking (vs. the contact snapshot fields). */
export class BookingCustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Jane Doe' })
  fullName!: string | null;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ format: 'date-time', description: 'Account created — "customer since".' })
  createdAt!: string;
}

/** Another booking by the same customer — detail mini-list row. */
export class OtherBookingItemDto {
  @ApiProperty({ example: 'BK-7Q2KX9AB' })
  code!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: 'Mekong Delta Day Trip' })
  tourTitle!: string;

  @ApiProperty({ type: String, example: '150.00' })
  totalAmount!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;
}

/** The customer's other bookings — capped preview + true total. */
export class OtherBookingsDto {
  @ApiProperty({ example: 7, description: 'Total OTHER bookings (current one excluded).' })
  total!: number;

  @ApiProperty({ type: [OtherBookingItemDto], description: 'Newest first, at most 5.' })
  items!: OtherBookingItemDto[];
}

/**
 * Webhook event linked to this booking — metadata only (the raw payload holds
 * provider payment data and is deliberately not exposed). `processedAt` null =
 * the handler never finished (received but processing crashed mid-flight).
 */
export class PaymentEventSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ example: 'checkout.session.completed' })
  type!: string;

  @ApiProperty({ example: 'evt_1PabcXYZ', description: 'Provider-side event id.' })
  eventId!: string;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  processedAt!: string | null;
}

/**
 * Admin-only booking detail (`GET /admin/bookings/:code`). Extends the shared
 * `BookingDto` with lifecycle timestamps, payment references, the refund audit,
 * the customer account + their other bookings, departure capacity, and the
 * webhook event trail — fields deliberately kept OFF the customer-facing
 * `BookingDto` so they never reach `/bookings/me`.
 */
export class AdminBookingDetailDto extends BookingDto {
  @ApiProperty({ type: AdminBookingDepartureRefDto })
  declare departure: AdminBookingDepartureRefDto;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paidAt!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  cancelledAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Captured charge/order id at the payment gateway (Stripe PaymentIntent / PayPal capture).',
    example: 'pi_3QabcXYZ',
  })
  providerPaymentId!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Checkout session / PayPal order id minted at checkout start (pre-capture reference).',
    example: 'cs_test_a1B2c3',
  })
  providerSessionId!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Customer cancelled within the free window' })
  refundReason!: string | null;

  @ApiProperty({ nullable: true, type: RefundedByDto })
  refundedBy!: RefundedByDto | null;

  @ApiProperty({ type: BookingCustomerDto })
  customer!: BookingCustomerDto;

  @ApiProperty({ type: OtherBookingsDto })
  otherBookings!: OtherBookingsDto;

  @ApiProperty({ type: [PaymentEventSummaryDto] })
  paymentEvents!: PaymentEventSummaryDto[];
}
```

(Note the `declare departure` override — it re-types the inherited field for Swagger without emitting a duplicate class field.)

- [ ] **Step 2: Verify.**

Run: `pnpm nx run @tourism/api:typecheck && pnpm nx test @tourism/api`
Expected: clean typecheck (the controller's `Promise<AdminBookingDetail>` stays assignable), 256 tests pass.

- [ ] **Step 3: Commit.**

```bash
git add apps/api/src/modules/bookings/dto/admin-booking-detail.dto.ts
git commit -m "feat(api): AdminBookingDetailDto — customer/otherBookings/paymentEvents/session/seats"
```

### Task 4: `userId` filter on the admin bookings list (TDD)

**Files:**
- Modify: `apps/api/src/modules/bookings/dto/list-admin-bookings-query.dto.ts`
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` (`findAllForAdmin` where-clause ~line 574)
- Test: `apps/api/src/modules/bookings/bookings.service.spec.ts` (the `findAllForAdmin` describe, near the existing AND-composition test ~line 655)

**Interfaces:**
- Produces: `GET /admin/bookings?userId=<uuid>` — AND-composes with status/search/tourId/departureId. Slice 2's list page passes it through.

- [ ] **Step 1: Write the failing test** (mirror the existing tourId/departureId composition test):

```ts
    it('AND-composes the userId filter with status', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        booking: { findMany, count: jest.fn().mockResolvedValue(0) },
      });
      await svcWith(prisma).findAllForAdmin({
        status: BookingStatus.PAID,
        userId: 'user-1',
      } as never);
      const where = findMany.mock.calls[0][0].where;
      expect(where.status).toBe(BookingStatus.PAID);
      expect(where.userId).toBe('user-1');
    });
```

- [ ] **Step 2: Run to verify it fails.** `pnpm nx test @tourism/api` — the new test FAILS (`where.userId` undefined).

- [ ] **Step 3: Implement.** In `list-admin-bookings-query.dto.ts` after `departureId` add:

```ts
  /** Filter to one customer's bookings. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;
```

In `findAllForAdmin`'s `where` composition, after the `departureId` line add:

```ts
      ...(query.userId ? { userId: query.userId } : {}),
```

- [ ] **Step 4: Run tests.** `pnpm nx test @tourism/api` — all pass (257).

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/bookings/dto/list-admin-bookings-query.dto.ts apps/api/src/modules/bookings/bookings.service.ts apps/api/src/modules/bookings/bookings.service.spec.ts
git commit -m "feat(api): userId filter on admin bookings list"
```

### Task 5 (controller, inline): slice gate + review + regen + merge

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green.
- [ ] **Step 2: `ecc:code-reviewer`** on the slice diff (`git diff main...HEAD`). Fix MEDIUMs where cheap; STOP on CRITICAL/HIGH. Grep-check no quote-style drift: `git diff main...HEAD | grep -E "^[-+].*[""'']"` eyeball.
- [ ] **Step 3: Regen types** per the Global-Constraints routine; commit `libs/shared/core/src/lib/api/schema.ts` alone: `chore(core): regen API types (admin booking detail enrichment)`.
- [ ] **Step 4: Re-gate** (consumers now see the new schema): `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — green.
- [ ] **Step 5: Merge.**

```bash
git checkout main && git merge --ff-only feat/admin-bookings-polish-be && git branch -d feat/admin-bookings-polish-be && git push
```

---

# Slice 2 — Admin FE: detail cards + list deep-link

Branch off `main`: `git checkout -b feat/admin-bookings-polish-ui`

### Task 6: lib — seats helper (TDD) + data plumbing

**Files:**
- Modify: `apps/admin/src/lib/bookings/format.ts` (+ `formatSeatsSummary`)
- Test: `apps/admin/src/lib/bookings/format.spec.ts`
- Modify: `apps/admin/src/lib/bookings/data.ts` (`BookingListParams` + `listBookings` query)

**Interfaces:**
- Consumes: `components['schemas']['AdminBookingDetailDto']` (regenerated in Task 5) — via the existing `AdminBookingDetail` re-export in `lib/bookings/detail.ts` (no change needed there).
- Produces: `formatSeatsSummary(seatsTotal: number | undefined, seatsBooked: number | undefined): string | null` — null hides the fact (deploy-lag guard). `BookingListParams.userId?: string` forwarded to the API.

- [ ] **Step 1: Write the failing tests.** Append to `format.spec.ts` (match the file's existing import style):

```ts
describe('formatSeatsSummary', () => {
  it('formats booked/total plus seats left', () => {
    expect(formatSeatsSummary(12, 7)).toBe('7/12 booked · 5 left');
  });

  it('clamps negative leftover to 0 left', () => {
    expect(formatSeatsSummary(10, 12)).toBe('12/10 booked · 0 left');
  });

  it('returns null when either field is missing (API not deployed yet)', () => {
    expect(formatSeatsSummary(undefined, 7)).toBeNull();
    expect(formatSeatsSummary(12, undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail.** `pnpm nx test @tourism/admin` — FAIL (`formatSeatsSummary` not exported).

- [ ] **Step 3: Implement** in `format.ts`:

```ts
/**
 * Departure capacity line for the admin Trip card — "7/12 booked · 5 left".
 * Returns null when either count is missing (deploy-lag guard: the API may not
 * ship the seat fields yet), which hides the fact entirely.
 */
export function formatSeatsSummary(
  seatsTotal: number | undefined,
  seatsBooked: number | undefined,
): string | null {
  if (typeof seatsTotal !== 'number' || typeof seatsBooked !== 'number') return null;
  const left = Math.max(seatsTotal - seatsBooked, 0);
  return `${seatsBooked}/${seatsTotal} booked · ${left} left`;
}
```

- [ ] **Step 4: Run tests.** `pnpm nx test @tourism/admin` — pass (124 + 3 = 127).

- [ ] **Step 5: Data plumbing.** In `data.ts` add `userId?: string;` to `BookingListParams` and `userId: params.userId,` inside the `query` object of `listBookings` (after `departureId`).

- [ ] **Step 6: Build.** `pnpm nx build @tourism/admin` — green.

- [ ] **Step 7: Commit.**

```bash
git add apps/admin/src/lib/bookings/format.ts apps/admin/src/lib/bookings/format.spec.ts apps/admin/src/lib/bookings/data.ts
git commit -m "feat(admin): seats summary helper + userId list param"
```

### Task 7: booking detail page — seats, customer account, other bookings, payment events, session ref

**Files:**
- Modify: `apps/admin/src/app/(admin)/bookings/[code]/page.tsx`

**Interfaces:**
- Consumes: `AdminBookingDetail` new fields (`customer` · `otherBookings` · `paymentEvents` · `providerSessionId` · `departure.seatsTotal/seatsBooked`) — ALL may be `undefined` at runtime until Render deploys (deploy-lag): guard each block. `formatSeatsSummary` from `../../../../lib/bookings/format` (Task 6). Existing `Fact`/`SummaryRow`/`formatDate`/`formatRelativeTime`/`formatMoney`/`BookingStatusBadge` stay as-is.

- [ ] **Step 1: Imports.** Add `Badge` to the `@tourism/ui` import list; add `formatSeatsSummary` to the `./format` import; keep everything else.

- [ ] **Step 2: Trip card — seats fact.** Inside the Trip card's `<dl>` after the Departure fact:

```tsx
                {formatSeatsSummary(booking.departure.seatsTotal, booking.departure.seatsBooked) ? (
                  <Fact
                    label="Seats"
                    value={formatSeatsSummary(
                      booking.departure.seatsTotal,
                      booking.departure.seatsBooked,
                    )}
                  />
                ) : null}
```

- [ ] **Step 3: Customer card — account section + other bookings.** Inside the Customer card's `<CardContent>`, after the `specialRequests` block append (note every read is `booking.customer?.` / `booking.otherBookings?.` — deploy-lag):

```tsx
              {booking.customer ? (
                <>
                  <Separator />
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <Fact
                      label="Account"
                      value={booking.customer.fullName?.trim() || booking.customer.email}
                    />
                    <Fact
                      label="Account email"
                      value={<span className="break-all">{booking.customer.email}</span>}
                    />
                    <Fact label="Customer since" value={formatDate(booking.customer.createdAt)} />
                  </dl>
                </>
              ) : null}

              {booking.otherBookings ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Other bookings ({booking.otherBookings.total})
                  </p>
                  {booking.otherBookings.items.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No other bookings.</p>
                  ) : (
                    <ul className="divide-border divide-y">
                      {booking.otherBookings.items.map((b) => (
                        <li key={b.code} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <Link
                              href={`/bookings/${b.code}`}
                              className="hover:text-primary font-mono text-sm hover:underline"
                            >
                              {b.code}
                            </Link>
                            <p className="text-muted-foreground truncate text-xs">{b.tourTitle}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-muted-foreground text-xs">
                              {formatDate(b.createdAt)}
                            </span>
                            <BookingStatusBadge status={b.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {booking.customer && booking.otherBookings.total > booking.otherBookings.items.length ? (
                    <Link
                      href={`/bookings?userId=${booking.customer.id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      View all {booking.otherBookings.total} bookings
                    </Link>
                  ) : null}
                </div>
              ) : null}
```

- [ ] **Step 4: Payment events card.** In the main column (after the Customer card):

```tsx
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment events</CardTitle>
            </CardHeader>
            <CardContent>
              {!booking.paymentEvents || booking.paymentEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No webhook events received yet.</p>
              ) : (
                <ul className="divide-border divide-y">
                  {booking.paymentEvents.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">{e.type}</p>
                        <p className="text-muted-foreground text-xs">
                          {e.provider === 'STRIPE' ? 'Stripe' : 'PayPal'} ·{' '}
                          {formatDate(e.receivedAt)}
                          <span className="ml-1">{formatRelativeTime(e.receivedAt)}</span>
                        </p>
                      </div>
                      {e.processedAt ? (
                        <Badge variant="outline" className="shrink-0">
                          Processed
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">
                          Unprocessed
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
```

(If `Badge` in `@tourism/ui` has no `destructive` variant, check `libs/web/ui` for the variant set and use the established warning/destructive treatment other admin pages use — do NOT invent new colors.)

- [ ] **Step 5: Session reference in the Order summary rail.** Inside the existing `booking.providerPaymentId ? (...)` block's `<div className="space-y-1">`, after the Stripe link, this stays; ADD a separate guarded block right after the whole providerPaymentId block:

```tsx
              {booking.providerSessionId ? (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Session reference</p>
                    <p className="font-mono text-xs break-all">{booking.providerSessionId}</p>
                  </div>
                </>
              ) : null}
```

- [ ] **Step 6: Verify.** `pnpm nx build @tourism/admin` — green (build is the TS gate). Then load the page in dev if the API is running (`pnpm nx dev @tourism/admin`) — optional smoke, the RSC icon-prop class of bug only shows at runtime.

- [ ] **Step 7: Commit.**

```bash
git add "apps/admin/src/app/(admin)/bookings/[code]/page.tsx"
git commit -m "feat(admin): booking detail — customer account, other bookings, payment events, session ref, seats"
```

### Task 8: bookings list — `?userId=` deep-link + indicator

**Files:**
- Modify: `apps/admin/src/app/(admin)/bookings/page.tsx`

**Interfaces:**
- Consumes: `listBookings({ userId })` (Task 6). The link arriving here is minted by Task 7 (`/bookings?userId=<uuid>`).

- [ ] **Step 1: Parse + forward.** In `page.tsx`:

Add a uuid narrowing helper next to `parseStatus`/`parsePage`:

```tsx
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Narrows a raw `?userId=` to a uuid (anything else = ignore the filter, avoid API 400s). */
function parseUserId(raw?: string): string | undefined {
  return raw && UUID_RE.test(raw) ? raw : undefined;
}
```

Extend the searchParams type + reads:

```tsx
  searchParams: Promise<{
    status?: string;
    page?: string;
    q?: string;
    pageSize?: string;
    userId?: string;
  }>;
```

```tsx
  const userId = parseUserId(sp.userId);
```

and pass it through:

```tsx
    result = await listBookings({ page, pageSize, status, search: search || undefined, userId });
```

- [ ] **Step 2: Indicator.** Import `Link` from `next/link`. Right after `<BookingsFilters ... />` add (server-rendered, clears by dropping the param):

```tsx
        {userId ? (
          <p className="text-muted-foreground text-sm">
            Showing bookings for one customer —{' '}
            <Link href="/bookings" className="text-primary hover:underline">
              Clear filter
            </Link>
          </p>
        ) : null}
```

Also extend the empty-state condition so a filtered-empty result reads right: change `{status || search ? ... }` to `{status || search || userId ? ... }`.

- [ ] **Step 3: Verify.** `pnpm nx build @tourism/admin` — green.

- [ ] **Step 4: Commit.**

```bash
git add "apps/admin/src/app/(admin)/bookings/page.tsx"
git commit -m "feat(admin): bookings list userId deep-link + active-filter indicator"
```

### Task 9 (controller, inline): slice gate + merge + docs/memory

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green (admin 127).
- [ ] **Step 2: Merge.**

```bash
git checkout main && git merge --ff-only feat/admin-bookings-polish-ui && git branch -d feat/admin-bookings-polish-ui && git push
```

- [ ] **Step 3: Docs + memory (standing workflow — before moving on).** Update `docs/07-plans/2026-07-02-admin-enrichment-roadmap.md` (Wave 6 → ✅ DONE + commit shas; note the index follow-up landed) and prepend a STATUS line to THIS plan file; update the `tourism-platform-state` memory (Wave 6 done, new test baselines, any new gotchas). Commit docs alone: `docs: mark Wave 6 (Bookings polish) complete`.
- [ ] **Step 4: Tell the user** Wave 6 is deployed (Vercel auto-deploys `main`; Render redeploys the API — remind them the detail page hides the new blocks until Render finishes) and ask to review on the live admin before Wave 7 brainstorming starts.

## Self-review notes (plan ↔ spec)

- Spec coverage: slice 0 → Task 1 · providerSessionId/seats/customer/otherBookings/paymentEvents → Tasks 2-3 (+7) · userId filter → Tasks 4 (+8) · metadata-only PII rule → Task 2 SQL + Task 3 DTO comment · deploy-lag guards → Tasks 6-8 · regen → Task 5 · review protocol → Tasks 5/9. No gaps found.
- Type consistency: `OtherBookingItem`/`PaymentEventSummary` (service) ↔ `OtherBookingItemDto`/`PaymentEventSummaryDto` (Swagger) ↔ FE reads (`booking.otherBookings.items[].tourTitle` etc.) — names match across Tasks 2/3/7.
- `declare departure` override: TS-legal (subtype), Swagger picks up the redeclared `@ApiProperty` — flagged for the Task-3 reviewer to double-check the generated spec during Task 5 regen.
