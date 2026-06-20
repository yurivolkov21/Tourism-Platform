# Data model

Donor-informed clean redesign. **Canonical source: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)** —
when this doc disagrees with the schema, the schema wins. Founding rationale:
[BLUEPRINT §6](../BLUEPRINT.md#6-new-data-model-clean-lily-informed). Decisions:
[../decisions/](../decisions/README.md). Risks: [risks.md](risks.md).

> **Status: live** — schema migrated to Supabase across P1.1 → P1.x. 17 models, 12 enums.

## Conventions (kept from donor)

UUID PKs (`@db.Uuid`, client-generated; `Outbox`/`MediaGarbage` use DB-default
`gen_random_uuid()` for raw-SQL inserts) · camelCase → `@map("snake_case")` + `@@map` ·
`@db.VarChar(n)` · `Decimal(12,2)` for money · closed enums · `created_at`/`updated_at` ·
indexes on FKs + filters · EN-only single-language columns (ADR-0005).

## Models (17)

| Model | Purpose | Notable fields / relations |
| --- | --- | --- |
| `User` | local mirror of Supabase auth | `supabaseId @unique`, `email @db.Citext @unique`, `role`, `locale="en"`; → bookings, reviews, wishlist |
| `TourCategory` | category **lookup** (replaced donor enum — D-P1.5) | `slug @unique`, `name`, `order`, `isActive`; → tours |
| `Destination` | place | `slug @unique`, `name`, `country`, `region`, `isActive`; M:N → tours |
| `Tour` | catalogue item | `slug @unique`, `title`, `summary`, `categoryId` FK, `basePrice`/`compareAtPrice`, `currency`, `isPublished`/`isFeatured`, **`suitableFor TravellerType[]` + `badges TourBadge[]`** (P1.7e), `included`/`excluded`/`highlights` `text[]` |
| `TourDestination` | **M:N** join (ADR-0002) | PK `(tourId, destinationId)`, `isPrimary` |
| `TourItineraryDay` | one row per day | `tourId`, `dayNumber`, `title`, `description` |
| `TourDeparture` | dated departure | `startDate`/`endDate` `@db.Date`, `priceOverride?`/`compareAtPrice?`, `seatsTotal`/`seatsBooked`, `status` |
| `TourFaq` | tour FAQ | `tourId`, `question`, `answer`, `order` |
| `TourPolicy` | structured policy (D-P1.1 — own model) | `tourId`, `kind PolicyKind`, `title`, `body`, `order` |
| `Booking` | order | `code @unique` (`BK-…`), `userId`/`tourId`/`departureId` FKs, `totalAmount`, `status`, `paymentProvider`, `providerSessionId?`/`providerPaymentId?`, `refundReason?`/`refundedById?`, contact fields |
| `Review` | one per booking | `bookingId @unique`, `tourId` (denormalised), `userId`, `rating`, `isApproved` |
| `Wishlist` | saved tour | composite PK `(userId, tourId)` |
| `PaymentEvent` | webhook idempotency log | `@@unique(provider, eventId)`, `processedAt?` (nullable → re-run on mid-flight crash) |
| `Enquiry` | "Inquire Now" lead (ADR-0003) | `name`/`email`/`phone?`/`message`, `tourId?`, `status EnquiryStatus`, **lead fields P1.7d: `nationality?`/`travelDate?`/`groupSize?`/`budgetTier?`/`interests[]`** |
| `MediaAsset` | Cloudinary asset, polymorphic | `(ownerType, ownerId, role)`, `publicId`, `type`, `posterId?` — no hard FK (ADR-0008 pragmatic) |
| `Outbox` | transactional email outbox (ADR-0007, P1.x-a) | `type EmailType`, `payload Json`, `status OutboxStatus`, `attempts`, `dedupeKey @unique` |
| `MediaGarbage` | orphaned Cloudinary ids awaiting destroy (P1.x-b) | `publicId @unique`, `resourceType`, `attempts` |

## Enums (12)

`UserRole` (CUSTOMER/ADMIN) · `DepartureStatus` (OPEN/CLOSED/CANCELLED) ·
`BookingStatus` (PENDING/PAID/CANCELLED/REFUNDED) · **`PaymentProvider` (STRIPE/PAYPAL** —
MoMo→PayPal, [ADR-0006](../decisions/0006-multi-gateway-momo.md) amended) ·
`EnquiryStatus` (NEW/CONTACTED/QUOTED/WON/LOST) · `MediaType` (IMAGE/VIDEO) ·
`MediaOwnerType` (TOUR/DESTINATION/USER) · `MediaRole` (hero/gallery/avatar) ·
`PolicyKind` (CANCELLATION/BOOKING/GENERAL) · **`EmailType`** (BOOKING_CONFIRMATION/
BOOKING_REFUNDED/REVIEW_APPROVED/ENQUIRY_RECEIVED) · **`OutboxStatus`** (PENDING/SENT/FAILED) ·
**`TravellerType`** (FAMILY/COUPLE/FRIENDS/SOLO/BUSINESS) + **`TourBadge`** (BEST_VALUE/
LIMITED_OFFER/EXCLUSIVE/NEW/POPULAR) (P1.7e merchandising).

## Deltas vs donor

| Change | Detail | Source |
| --- | --- | --- |
| **English-only** | dropped all `*_vi` columns → single text columns; array content → `text[]`; `User.locale` default `en` | [ADR-0005](../decisions/0005-en-only.md) |
| **Tour ↔ Destination M:N** | dropped `Tour.destinationId`; `TourDestination(tourId, destinationId, isPrimary)` | [ADR-0002](../decisions/0002-multi-destination-mn.md) |
| **Category lookup** | donor enum → `TourCategory` table (`categoryId` FK) | D-P1.5 |
| **Multi-gateway payments** | `Booking.paymentProvider` enum **STRIPE/PAYPAL** + generic `providerSessionId`/`providerPaymentId`; `PaymentEvent.provider` | [ADR-0006](../decisions/0006-multi-gateway-momo.md) (amended → PayPal) |
| **Price anchor** | `compareAtPrice Decimal?` on `Tour` **and** `TourDeparture` | D-P1.3 |
| **`TourFaq` / `TourPolicy`** | FAQ + structured policy as own models | D-P1.1 |
| **`Enquiry`** | lead capture + CRM status + structured lead fields | [ADR-0003](../decisions/0003-enquiry.md), D-P1.4, P1.7d |
| **Merchandising** | `Tour.suitableFor` + `Tour.badges` (Lily's theme/badges) | P1.7e |
| **Reliability tables** | `Outbox` (emails) + `MediaGarbage` (Cloudinary orphans) | [ADR-0007](../decisions/0007-pgboss-outbox-jobs.md), P1.x |

## Integrity & security hardening ([ADR-0008](../decisions/0008-security-integrity-hardening.md))

- **FK** `Booking.refundedById → User` `onDelete: SetNull`; `Booking`/`Tour`/`Destination`/
  `TourCategory` references use `Restrict` (referenced rows can't be hard-deleted → P2003 → 409).
- **MediaAsset** polymorphic `(ownerType, ownerId)` — no hard FK; integrity via same-tx
  `MediaGarbage` recording + the **media-reconcile cron** (Cloudinary destroy, P1.x-b).
- **CHECK** constraints: `rating 1..5`, `seatsBooked ≤ seatsTotal`, seats ≥ 0, amounts ≥ 0
  (in `prisma/migrations/*_hardening`).
- **Email uniqueness** at DB via `citext` unique column.
- **RLS** enabled on all tables (defense-in-depth; the API uses the service role).

## Atomicity notes (load-bearing)

- **Seat reservation** happens only at PAID, via a single-statement `$queryRaw` **CTE**
  (`claimSeatsForPaid`) — *not* an interactive `$transaction`/`FOR UPDATE` (pooler-safe). The
  confirmation `Outbox` row is inserted **inside that same CTE** (`ON CONFLICT (dedupe_key) DO
  NOTHING`). Admin refund releases seats + writes a `BOOKING_REFUNDED` outbox row in its CTE.
- Low-concurrency writes (review-approved, enquiry-received) use a short interactive
  `$transaction` to commit the state change + outbox row together.

> ERD: generate from `schema.prisma` (`prisma generate` / a Mermaid exporter) when needed.
