# Sample fixture data (`apps/api/prisma/fixtures`)

Realistic, varied sample data for `@tourism/api`, generated from a single source
so the TypeScript and JSON copies can never drift.

- **`sample-data.ts`** — typed export (`import { tours, bookings, ... } from './sample-data'`),
  using Prisma enum references (`BookingStatus.PAID`, `TravellerType.COUPLE`, …).
- **`json/<model>.json`** — one file per model, plain JSON, byte-for-byte the same records.
- **`gen.cjs`** — the generator. Edit here and re-run; do **not** hand-edit the outputs.

```bash
cd apps/api/prisma/fixtures && node gen.cjs   # regenerates + self-validates
```

> Standalone by design — this is **not** wired into `prisma/seed.ts`. Use it for
> unit/e2e fixtures, mocks, and manual DB loads. The records are shaped for
> Prisma `createMany` (FKs by explicit UUID; insert parents before children).

## What's inside (429 records across 18 models)

| Model | Rows | Model | Rows |
| --- | --- | --- | --- |
| users | 24 | bookings | 30 |
| tourCategories | 6 | paymentEvents | 18 |
| destinations | 16 | reviews | 26 |
| tours | 23 | wishlist | 20 |
| tourDestinations | 38 | enquiries | 25 |
| tourItineraryDays | 15 | posts | 10 |
| tourFaqs | 13 | outbox | 12 |
| tourPolicies | 16 | mediaAssets | 83 |
| tourDepartures | 50 | mediaGarbage | 4 |

## Edge cases deliberately exercised

**Status / lifecycle — every enum value appears at least once**

- `BookingStatus`: PENDING, PAID, CANCELLED, REFUNDED (refunds carry `refundedById`,
  `refundReason`, `paidAt` + `cancelledAt`).
- `DepartureStatus`: OPEN, CLOSED, CANCELLED — plus a **sold-out** OPEN departure
  (`seatsBooked == seatsTotal`) and a minimum `seatsTotal` of 5.
- `EnquiryStatus`: NEW → CONTACTED → QUOTED → WON → LOST.
- `OutboxStatus` (PENDING/SENT/FAILED) × every `EmailType`, `FAILED` rows carry `lastError`.
- `PaymentProvider` STRIPE + PAYPAL throughout; `PaymentEvent`s include unprocessed
  rows (`processedAt: null`) to model webhook retries.
- `TourBadge`, `TravellerType`, `PolicyKind`, `MediaType`/`MediaOwnerType`/`MediaRole`,
  `ReviewSource`, `PostStatus` all fully covered.

**Boundary values — strings sized to the exact `@db.VarChar` cap**

`users.fullName` = 120, `destinations.description` = 2000, `tours.title` = 200,
`tours.summary` = 500, `tourPolicies.body` = 4000, `bookings.specialRequests` = 1000,
`reviews.body` = 2000, `reviews.tripLabel` = 160, `enquiries.message` = 2000,
`posts.title` = 160, `posts.excerpt` = 300. Also: `numChildren` 0 and >0, decimal
prices with real precision (`1299.99`, `612.50`), `compareAtPrice` both null and set,
a draft (unpublished) tour, an inactive category and destination.

**Unicode / i18n text**

Vietnamese diacritics in destination/tour names (Đà Nẵng, Huế, Hội An, Hạ Long,
Mã Pí Lèng), accented reviewer names (Müller, Nguyễn, Åkesson, Zoë O'Neill,
Zieliński), and non-ASCII throughout enquiries and reviews.

**Nullable / optional paths**

Curated reviews with null `tourId`/`userId`/`bookingId`; general enquiries with no
tour; users with null `fullName`/`phone`; bookings with null `contactPhone`.

## Conventions

- **UUIDs** are deterministic and readable (per-model hex prefix), so FK wiring is
  stable across regenerations.
- **Decimals** are strings (`"39.00"`) to match Prisma's `Decimal` serialization.
- **Dates**: `@db.Date` fields are `YYYY-MM-DD`; timestamps are ISO-8601, offset from
  a fixed base of 2026-07-01 (future OPEN departures, past CLOSED/CANCELLED ones).

The generator self-validates on every run: FK integrity, unique/composite-unique
constraints, enum validity + full coverage, and VarChar caps. It exits non-zero on
any violation.
