# Data model

Clean redesign, donor-informed. **Canonical spec: [BLUEPRINT §6](../BLUEPRINT.md#6-new-data-model-clean-lily-informed).**
Decisions: [../decisions/](../decisions/README.md). Risks: [risks.md](risks.md).

> Skeleton — the ERD + full entity detail land with `schema.prisma` in **P1.1**.

## Conventions (kept from donor)

UUID PKs (`@db.Uuid`) · camelCase → `@map("snake_case")` + `@@map` · `@db.VarChar(n)` ·
`Decimal(12,2)` for money · closed enums · `created_at`/`updated_at` · indexes on FKs + filters.

## Deltas vs donor

| Change | Detail | Source |
| --- | --- | --- |
| **English-only** | drop all `*_vi` columns → single text columns (`name`, `title`, `summary`, …). Array content (`highlights`, `included`, `excluded`) → `text[]`. Keep `User.locale` default `en`. | [ADR-0005](../decisions/0005-en-only.md) |
| **Tour ↔ Destination M:N** | drop `Tour.destination_id`; add join `tour_destinations(tour_id, destination_id, is_primary)`; index `(tour_id)` + `(destination_id, is_primary)` | [ADR-0002](../decisions/0002-multi-destination-mn.md) |
| **Multi-gateway payments** | `Booking.paymentProvider` enum (`STRIPE`\|`MOMO`) + generic `providerSessionId` / `providerPaymentId` (replace stripe-specific cols); `PaymentEvent.provider` | [ADR-0006](../decisions/0006-multi-gateway-momo.md) |
| **Price anchor** | `compare_at_price Decimal?` on `Tour` (and/or `Departure`) | D-P1.3 |
| **Value/Highlights** | `highlights text[]` (EN) | resolved via ADR-0005 |
| **`TourFaq`** (new) | `tour_id, question, answer, order` | — |
| **Policies** | text field(s) on `Tour` | D-P1.1 |
| **`Enquiry`** (new) | `name, email, phone, message, tour_id?, status(NEW/CONTACTED/CLOSED)` | [ADR-0003](../decisions/0003-enquiry.md), D-P1.4 |

## Integrity & security hardening ([ADR-0008](../decisions/0008-security-integrity-hardening.md))

- **FK** `Booking.refundedById → User` `onDelete: SetNull` (was a bare UUID snapshot).
- **MediaAsset** stays polymorphic `(ownerType, ownerId)` **+ reconcile job** (pg-boss) + same-tx cleanup + tests.
- **CHECK** constraints: `rating 1..5`, `seatsBooked ≤ seatsTotal`, seats ≥ 0, amounts ≥ 0.
- **Email uniqueness** at DB: `citext` or unique index on `lower(email)`.
- **RLS** enabled on all tables (defense-in-depth; API uses service role).

## Entities (overview)

Port-as-is bones: `User · Destination · TourItineraryDay · TourDeparture · Booking · Review · Wishlist · PaymentEvent · MediaAsset`.
New/changed: `TourDestination (M:N)` · `TourFaq` · `Enquiry` · payment-provider fields · single-language columns.

📝 *Entity tables, enums, indexes, RLS policies, ERD — fill in P1.1.*
