# Design + plan — Unified reviews (verified + curated/featured)

> Status: **awaiting approval** · Branch: `feat/reviews-unified` · Date: 2026-06-28
> One `reviews` table powers both surfaces: the tour-detail **verified** reviews (already DB-backed)
> and the homepage **testimonials** (currently a hardcoded i18n fixture). Additive + backward-compatible.

## Current state (verified by code read)

| Surface | Source | Path |
| --- | --- | --- |
| Tour-detail "Traveller reviews" | **DB** (booking-verified) | `GET /tours/:slug/reviews` → `reviews` table |
| Homepage "Loved by travellers" | **Hardcoded** | `messages.testimonials.items` (i18n) |

`Review` today: `id, tourId, userId, bookingId(unique), rating, title?, body, isApproved, createdAt,
updatedAt` — all three FKs **NOT NULL**; reviewer name is read live from `user.fullName`. Every review is
earned (a unique `bookingId`), which is why the UI shows "Verified traveller".

## Goal

- Keep verified reviews exactly as they work today (no regression).
- Let admins **feature** a review on the homepage and **author curated testimonials** (no booking) with a
  free-text author name + location.
- Wire the homepage testimonials to a new `GET /reviews/featured` (fixture stays as a fallback).

## Schema change (additive, backward-compatible)

New Prisma enum `ReviewSource { VERIFIED, CURATED }`. On `Review`:

| Column | Change | Backfill / default |
| --- | --- | --- |
| `authorName` | **NEW** `String` | backfill `= user.fullName` for existing rows (snapshot; survives user delete/anonymise — ties into [[DELETE /users/me]]) |
| `authorLocation` | **NEW** `String?` | null (curated-only; the customer review form doesn't capture country) |
| `source` | **NEW** `ReviewSource @default(VERIFIED)` | existing rows → `VERIFIED` |
| `isFeatured` | **NEW** `Boolean @default(false)` | false |
| `tripLabel` | **NEW** `String?` | null (free-text trip name when no `tourId`; else fall back to `tour.title`) |
| `tourId` | NOT NULL → **nullable** | unchanged data (relaxation only) |
| `userId` | NOT NULL → **nullable** | unchanged data |
| `bookingId` | NOT NULL unique → **nullable** unique | Postgres allows multiple NULLs under a unique index |

Why nullable FKs: a curated testimonial has no real user/booking, and may not map to one DB tour.
Verified reviews keep all three set, so their behaviour is identical.

Reads after the change:

- Tour-detail: unchanged query, but reviewer name reads `authorName` (fallback `user.fullName`).
- Homepage: `reviews WHERE isApproved AND isFeatured` ordered newest/curated-first.

## Risk analysis (why this is safe)

1. **Migration is additive** — new nullable columns + a relaxation of NOT NULL → nullable. No column
   dropped/retyped; existing rows untouched besides the `authorName` backfill `UPDATE`.
2. **Old API code keeps working** against the new schema (it just ignores the new columns), so the
   migration can be applied to prod **before** the new code ships.
3. **Render does not auto-migrate** (`startCommand = node main.js`). Migration is applied **manually**
   via `DIRECT_URL=… prisma migrate deploy` (port 5432) per `docs/05-runbooks/deploy.md` — a reviewed,
   one-off step we run together, step by step.
4. **Customer review creation is untouched** — `POST /reviews` still requires a booking and sets
   `userId/bookingId/tourId` + now also snapshots `authorName` and `source=VERIFIED`.
5. Curated reviews are created only through a **new admin path**, never the customer path.

## Increment plan (each ends green: lint + typecheck + test + build)

- **Inc 1 — Schema + back-compat (BE):** add the enum + 5 columns + nullable relax; migration with the
  `authorName` backfill. Update `reviews.service.create` to snapshot `authorName` + `source`. Update the
  public read to select/emit `authorName`. `/regen-types`. Update `reviews.service.spec`. *No
  behaviour change yet.*
- **Inc 2 — Featured endpoint (BE):** `GET /reviews/featured` (+ `FeaturedReviewDto`: rating, body,
  title, authorName, authorLocation, tripLabel|tour.title, createdAt). Service + controller + tests.
  `/regen-types`.
- **Inc 3 — Homepage wiring (FE):** `fetchFeaturedReviews()` + testimonials reads it (ISR/revalidate),
  falls back to the i18n fixture when empty/unreachable. Map fields → the existing carousel.
- **Inc 4 — Admin reviews UI (FE, new page — none exists today):** moderation list (approve/un-approve
  via the existing `PATCH /reviews/:id/moderation`), a **feature/un-feature** toggle, and a **create
  curated testimonial** form. New admin endpoints: `PATCH /admin/reviews/:id/feature`,
  `POST /admin/reviews/curated`. Server Components + Server Actions (mirror existing admin CRUD;
  remember the Vercel undici string-body gotcha — [[vercel-undici-fetch-body-gotcha]]).
- **Inc 5 — Seed:** mark 1–2 real reviews `isFeatured`, add 2–3 `CURATED` featured testimonials with
  `authorLocation`, so the homepage shows data immediately.

Suggested sequencing: **1 → 2 → 3 → 5** lands the homepage on real data with low risk; **4 (admin UI)**
is the largest piece and can follow once the core is verified. (Admin UI can be split out if preferred.)

## Testing

TDD the pure/service logic: `reviews.service` create (snapshots authorName/source), the featured query,
and the curated-create validation. Gate + `check:no-hex`. Manual: apply migration to a scratch DB, verify
tour-detail still renders + homepage pulls featured.

## Rollout (prod)

1. Land Inc 1 code on `main`.
2. **Manually** `DIRECT_URL=… prisma migrate deploy` against prod (additive → safe with old code live).
3. Deploy API (Render) + web (Vercel).
4. Run the curated/feature seed or feature a couple of reviews via admin (Inc 4) so the homepage fills.

## Out of scope (this round)

Per-tour rating recompute changes; review photos; multi-language reviews; capturing reviewer country in
the customer review form; review replies.

## Open decisions (confirm before coding)

1. **Admin UI now or later?** Full Inc 4 in this feature, or land 1–3 + 5 first and do the admin UI as a
   fast follow-up? *(recommend: core first, admin UI right after.)*
2. **`authorName` snapshot on every review** (recommended) — OK?
3. **`authorLocation` curated-only** (verified reviews show no location) — OK?
