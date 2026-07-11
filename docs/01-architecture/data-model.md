# Data model

Donor-informed clean redesign. **Canonical source: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)** —
when this doc disagrees with the schema, the schema wins. Founding rationale:
[BLUEPRINT §6](../BLUEPRINT.md#6-new-data-model-clean-lily-informed). Decisions:
[../02-decisions/](../02-decisions/README.md). Risks: [risks.md](risks.md).

> **Status: live** — schema migrated to Supabase across P1.1 → P1.x → P-Content → blog-v2
> (W1 tags/tours joins · W3 `MediaRole.body` · W5 `Subscriber` + media compound unique) →
> refund + cancellation-request queue (2026-07-05) →
> admin reviews + enquiry CRM wave B2 (2026-07-11 — `EnquiryNote` +
> `Enquiry.email` index; also backfilled RLS on 4 older tables —
> `cancellation_requests`/`post_tags`/`post_tag_links`/`post_tours` — that had
> shipped without it) → admin wave C (2026-07-11 — migration
> `post_seo_fields` adds `Post.metaTitle`/`metaDescription`, applied live) →
> admin media-library wave D1 (2026-07-11 — migration `media_asset_alt` adds
> `MediaAsset.alt`, applied live).
> **24 models, 16 enums.**

## Conventions (kept from donor)

UUID PKs (`@db.Uuid`, client-generated; `Outbox`/`MediaGarbage` use DB-default
`gen_random_uuid()` for raw-SQL inserts) · camelCase → `@map("snake_case")` + `@@map` ·
`@db.VarChar(n)` · `Decimal(12,2)` for money · closed enums · `created_at`/`updated_at` ·
indexes on FKs + filters · EN-only single-language columns (ADR-0005).

## Models (24)

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
| `Booking` | order | `code @unique` (`BK-…`), `userId`/`tourId`/`departureId` FKs, `totalAmount`, `status` (incl. `PARTIALLY_REFUNDED`), `paymentProvider`, `providerSessionId?`/`providerPaymentId?`, `refundReason?`/`refundedById?`, **`refundedAmount?`/`refundedAt?`** (partial-refund audit, 2026-07-05); 1:1 → `cancellationRequest?` |
| `CancellationRequest` | a PAID customer's request to cancel/refund a booking (2026-07-05) | `bookingId @unique` FK (Restrict), `userId` FK (Restrict) — requester, `reason`, `status CancellationRequestStatus` (default `REQUESTED`), `decisionNote?`, `decidedById?` FK → User (SetNull), `decidedAt?`; one live row per booking — a `DENIED` row is reset to `REQUESTED` on re-request |
| `Review` | unified verified + curated | `rating`, `title?`, `body`, `isApproved`, `isFeatured`, `source ReviewSource` (VERIFIED/CURATED); VERIFIED → `bookingId? @unique`/`tourId?`/`userId?` set; CURATED testimonials have those FKs **nullable** + `authorName`, `authorLocation?`, `tripLabel?` (unified-reviews migration) |
| `Wishlist` | saved tour | composite PK `(userId, tourId)` |
| `PaymentEvent` | webhook idempotency log | `@@unique(provider, eventId)`, `processedAt?` (nullable → re-run on mid-flight crash) |
| `Enquiry` | "Inquire Now" lead (ADR-0003) | `name`/`email`/`phone?`/`message`, `tourId?`, `status EnquiryStatus`, **lead fields P1.7d: `nationality?`/`travelDate?`/`groupSize?`/`budgetTier?`/`interests[]`**; **`@@index([email])`** (2026-07-11 — repeat-lead detection); 1:N → `notes` |
| `EnquiryNote` | internal CRM note on an enquiry (wave B2, 2026-07-11) | `id`, `enquiryId` FK → Enquiry (Cascade), `authorId?` FK → User (SetNull), `authorName` snapshot, `body`, `createdAt`; append-only (no update/delete endpoint); `@@index([enquiryId, createdAt])` |
| `MediaAsset` | Cloudinary asset, polymorphic | `(ownerType, ownerId, role)`, `publicId`, `type`, `posterId?`, **`alt?`** (editable alt text, wave D1 — `PATCH /admin/media/:id`) — no hard FK (ADR-0008 pragmatic); **`@@unique(ownerType, ownerId, publicId)`** (blog-v2 W5 — race-free body-image upsert) lets the same publicId legally serve several owners (reuse picker, wave D1) |
| `SiteMediaSlot` | brand-chrome image slot of the public web (Appearance, 2026-07-10) | `key @unique` (9 seeded: home-hero … about-story); images = `MediaAsset(ownerType=SITE, ownerId=slot.id)` — catalog of kinds/labels lives in API code (`site-media/slot-catalog.ts`) |
| `Outbox` | transactional email outbox (ADR-0007, P1.x-a) | `type EmailType`, `payload Json`, `status OutboxStatus`, `attempts`, `dedupeKey @unique` |
| `MediaGarbage` | orphaned Cloudinary ids awaiting destroy (P1.x-b) | `publicId @unique`, `resourceType`, `attempts` |
| `Post` | editorial blog article (P-Content + blog-v2) | `slug @unique`, `title`, `excerpt?`, `content` (markdown), `status PostStatus`, `publishedAt?` (explicit future value = scheduled — no cron, the public reader filters `publishedAt <= now()`), **`metaTitle?`/`metaDescription?`** (SEO overrides, wave C 2026-07-11), `authorId` FK → User (Restrict); cover = `MediaAsset(ownerType=POST, role=hero)`, inline body images = `role=body` (GC on post delete); tags via `PostTagLink`, hand-picked tours via `PostTour` |
| `PostTag` | free-form blog topic (blog-v2 W1) | `slug @unique`, `name`; upserted by slug from admin tag combobox |
| `PostTagLink` | Post ↔ PostTag **M:N** join | PK `(postId, tagId)` |
| `PostTour` | Post ↔ Tour **M:N** join (related tours, max 3, ordered) | PK `(postId, tourId)`, `order` |
| `Subscriber` | newsletter lead capture (blog-v2 W5) | `email @unique` (normalized lowercase), `source?`, `subscribedAt`; silent-dedupe upsert from the public subscribe endpoint |

## Enums (16)

`UserRole` (CUSTOMER/ADMIN) · `DepartureStatus` (OPEN/CLOSED/CANCELLED) ·
`BookingStatus` (PENDING/PAID/CANCELLED/REFUNDED/**PARTIALLY_REFUNDED** — 2026-07-05) ·
**`PaymentProvider` (STRIPE/PAYPAL** —
MoMo→PayPal, [ADR-0006](../02-decisions/0006-multi-gateway-momo.md) amended) ·
`EnquiryStatus` (NEW/CONTACTED/QUOTED/WON/LOST) · **`CancellationRequestStatus`**
(REQUESTED/REFUNDED/DENIED — support lifecycle for a PAID-booking cancellation
request, 2026-07-05) · `MediaType` (IMAGE/VIDEO) ·
`MediaOwnerType` (TOUR/DESTINATION/USER/POST/**SITE** — brand-chrome slots, 2026-07-10) · `MediaRole` (hero/gallery/avatar/**body** — blog-v2 W3 inline images) ·
`PolicyKind` (CANCELLATION/BOOKING/GENERAL) · **`EmailType`** (BOOKING_CONFIRMATION/
BOOKING_REFUNDED/REVIEW_APPROVED/ENQUIRY_RECEIVED/**CANCELLATION_REQUESTED**/
**CANCELLATION_DENIED**) · **`OutboxStatus`** (PENDING/SENT/FAILED) ·
**`TravellerType`** (FAMILY/COUPLE/FRIENDS/SOLO/BUSINESS) · **`TourBadge`** (BEST_VALUE/
LIMITED_OFFER/EXCLUSIVE/NEW/POPULAR) (P1.7e merchandising) · **`ReviewSource`** (VERIFIED/CURATED —
unified reviews, lets admins author testimonials with no booking) · **`PostStatus`** (DRAFT/PUBLISHED,
P-Content blog).

## Deltas vs donor

| Change | Detail | Source |
| --- | --- | --- |
| **English-only** | dropped all `*_vi` columns → single text columns; array content → `text[]`; `User.locale` default `en` | [ADR-0005](../02-decisions/0005-en-only.md) |
| **Tour ↔ Destination M:N** | dropped `Tour.destinationId`; `TourDestination(tourId, destinationId, isPrimary)` | [ADR-0002](../02-decisions/0002-multi-destination-mn.md) |
| **Category lookup** | donor enum → `TourCategory` table (`categoryId` FK) | D-P1.5 |
| **Multi-gateway payments** | `Booking.paymentProvider` enum **STRIPE/PAYPAL** + generic `providerSessionId`/`providerPaymentId`; `PaymentEvent.provider` | [ADR-0006](../02-decisions/0006-multi-gateway-momo.md) (amended → PayPal) |
| **Price anchor** | `compareAtPrice Decimal?` on `Tour` **and** `TourDeparture` | D-P1.3 |
| **`TourFaq` / `TourPolicy`** | FAQ + structured policy as own models | D-P1.1 |
| **`Enquiry`** | lead capture + CRM status + structured lead fields | [ADR-0003](../02-decisions/0003-enquiry.md), D-P1.4, P1.7d |
| **Merchandising** | `Tour.suitableFor` + `Tour.badges` (Lily's theme/badges) | P1.7e |
| **Reliability tables** | `Outbox` (emails) + `MediaGarbage` (Cloudinary orphans) | [ADR-0007](../02-decisions/0007-pgboss-outbox-jobs.md), P1.x |
| **Blog v2** | `PostTag` + `PostTagLink`/`PostTour` M:N joins · `MediaRole.body` (tracked inline images, excluded from cover replace-all, GC on post delete) · `Subscriber` + `MediaAsset` compound unique | [blog-v2 roadmap](../07-plans/2026-07-03-blog-v2-roadmap.md), W1/W3/W5 |
| **Refund + cancellation-request queue** | admin refund accepts optional partial `amount` (`BookingStatus.PARTIALLY_REFUNDED` + `refundedAmount`/`refundedAt`); new `CancellationRequest` model (booking-tied, replaces the old Enquiry-based request hack) + `CancellationRequestStatus` + 2 `EmailType`s | [spec](../06-specs/2026-07-04-refund-cancellation-queue-design.md), 2026-07-05 |

## Integrity & security hardening ([ADR-0008](../02-decisions/0008-security-integrity-hardening.md))

- **FK** `Booking.refundedById → User` `onDelete: SetNull`; `Booking`/`Tour`/`Destination`/
  `TourCategory` references use `Restrict` (referenced rows can't be hard-deleted → P2003 → 409).
- **MediaAsset** polymorphic `(ownerType, ownerId)` — no hard FK; integrity via same-tx
  `MediaGarbage` recording + the **media-reconcile cron** (Cloudinary destroy, P1.x-b).
- **Ref-safe media GC (wave D1, 2026-07-11):** since one publicId may now legally serve
  several owners (reuse picker), `MediaGarbage` enqueue is **guarded** — a publicId still
  referenced by any `media_assets` row (any owner) is never queued for destroy — and the
  reconcile cron re-checks at destroy time as a backstop; re-attaching a publicId purges any
  pending garbage row for it. Accepted residual: a rare READ COMMITTED write-skew between two
  overlapping drop transactions can still leak an undestroyed Cloudinary orphan (storage cost
  only, no data exposure).
- **CHECK** constraints: `rating 1..5`, `seatsBooked ≤ seatsTotal`, seats ≥ 0, amounts ≥ 0
  (in `prisma/migrations/*_hardening`).
- **Email uniqueness** at DB via `citext` unique column.
- **RLS** enabled on all tables (defense-in-depth; the API uses the service role).

## Atomicity notes (load-bearing)

- **Seat reservation** happens only at PAID, via a single-statement `$queryRaw` **CTE**
  (`claimSeatsForPaid`) — *not* an interactive `$transaction`/`FOR UPDATE` (pooler-safe). The
  confirmation `Outbox` row is inserted **inside that same CTE** (`ON CONFLICT (dedupe_key) DO
  NOTHING`). Admin refund releases seats + writes a `BOOKING_REFUNDED` outbox row in its CTE —
  **full** refund releases seats + flips `REFUNDED`; **partial** (`0 < amount < total`) keeps
  seats and flips `PARTIALLY_REFUNDED`, both gated on `status='PAID'` (idempotent retries) and
  both resolving an open `CancellationRequest` to `REFUNDED` in the same CTE. The provider call
  (Stripe/PayPal) uses a deterministic idempotency key (`booking-refund:<bookingId>`) and always
  runs **before** the DB write (2026-07-05).
- Low-concurrency writes (review-approved, enquiry-received) use a short interactive
  `$transaction` to commit the state change + outbox row together.

> ERD: generate from `schema.prisma` (`prisma generate` / a Mermaid exporter) when needed.
