# Design spec — Admin Tours CRUD (increment-1)

> Branch: `feat/admin-tours-crud` · 3rd admin model, after Destinations + Categories.
> Reuses the established CRUD template (Server-Component fetch + Server-Action mutations,
> `@tourism/ui`, token-only, envelope-`.data`-unwrap, `nativeButton={false}` on Button-as-Link).
> API: `apps/api/src/modules/tours/admin-tours.controller.ts` (`/admin/tours`).

## Why Tours is different

Unlike Destinations/Categories (flat, ~5 fields), `CreateTourDto` carries: identity, **slug references**
(category + M:N destinations + a primary), logistics, pricing, classification, **enum arrays**
(`suitableFor`/`badges`), **content arrays** (`highlights`/`included`/`excluded`), plus **nested
sub-entities** (`itinerary`/`faqs`/`policies`, replace-all) — and media + departures live on their own
endpoints. Doing it all at once = an enormous form. So we scope.

## Scope — increment-1 (this branch)

A usable tour editor covering the **scalar + reference + array** fields. Endpoints:
`GET/POST /admin/tours`, `GET/PATCH/DELETE /admin/tours/:slug`.

**List page** (`/tours`): Table — Title · Category · Primary destination · Price (`basePrice` +
strike `compareAtPrice`) · Duration · status badges (Published / Draft, + Featured). Filters: search,
category (select), `isPublished`. Pagination + empty state + "New tour". Un-soon the nav item.

**Create/Edit form** — grouped fields:

- **Identity:** `title` (req 1–200), `slug?` (≤200, auto-kebab), `summary?` (≤500 textarea).
- **References:** `categorySlug` (**Select** ← all active categories) · `destinationSlugs[]`
  (**multi-combobox with search** ← all active destinations, ≥1; selected shown as removable chips) ·
  `primaryDestinationSlug` (**Select** constrained to the chosen destinations; auto-default to first chosen).
- **Logistics:** `durationDays` (1–60) · `maxGroupSize?` (1–100) · `meetingPoint?` (≤300).
- **Pricing:** `basePrice` (decimal ≥0) · `compareAtPrice?` (≥0) · `currency?` (3-letter, default USD).
- **Classification:** `difficulty?` (≤30) · `isPublished` (Switch) · `isFeatured` (Switch).
- **Merchandising:** `suitableFor[]` (checkboxes ← `TravellerType`: FAMILY/COUPLE/FRIENDS/SOLO/BUSINESS) ·
  `badges[]` (checkboxes ← `TourBadge`: BEST_VALUE/LIMITED_OFFER/EXCLUSIVE/NEW/POPULAR).
- **Content arrays:** `highlights` / `included` / `excluded` — **chip/tag input** (type + Enter to add a
  chip, click ✕ to remove; serialized to a hidden field → `string[]`). [signed off]

**Delete:** AlertDialog confirm → `DELETE` → handle **409** ("still published / has bookings" →
guidance: unpublish / can't delete with bookings).

## Deferred to increment-2 (Tours advanced) — explicitly OUT of scope here

- **Nested sub-entities:** `itinerary[]` (day/title/description), `faqs[]`, `policies[]` — repeatable
  sub-forms (add/remove/reorder rows), replace-all semantics. Significant UI; its own increment.
- **Media:** `PUT /admin/tours/:slug/media` (Cloudinary upload) — plan already defers admin media.
- **Departures:** `/admin/tours/:slug/departures*` — a nested model managed inside a tour; own increment.

On edit, we send only the increment-1 fields via `PATCH`; omitted sub-entity arrays are **left
untouched** by the API (confirmed in `UpdateTourDto` docs), so deferring them is safe — editing a tour
here will NOT wipe its itinerary/faqs/policies/media.

## Data + validation

- **`lib/tours/schema.ts`** (zod, TDD): mirror the DTO bounds; `destinationSlugs` min 1;
  `primaryDestinationSlug` refined to be ∈ `destinationSlugs`; `basePrice`/`compareAtPrice`
  `z.coerce.number()`; enum arrays via `z.enum`. `toTourPayload` drops empty optionals, splits the
  textarea arrays, coerces numbers.
- **`lib/tours/data.ts`:** `listTours` (`{data,meta}` as-is) · `getTour` (single → unwrap `.data`).
  Form needs option sources → reuse `listCategories` + `listDestinations` (fetch `pageSize:100`,
  `isActive:true`) server-side in the new/edit pages, pass arrays to the client form.
- **`lib/tours/actions.ts`:** `createTour`/`updateTour` (`POST`/`PATCH`, zod, 400 bad-ref + 409 slug
  via `apiErrorMessage`) · `deleteTour` (409). `revalidatePath('/tours')`.

## Tasks (dependency-ordered, one commit each)

- **TR1** — `lib/tours/schema.ts` + `toTourPayload` (TDD `schema.spec.ts`: bounds, primary∈dests refine,
  array splitting, number coercion).
- **TR2** — `lib/tours/data.ts` (`listTours` + `getTour`).
- **TR3** — list page `/tours` (Table + filters + pagination + empty) + un-soon nav.
- **TR4** — `TourForm` (client) + `createTour`/`updateTour` actions + `new` / `[slug]/edit` pages
  (edit prefetches categories + destinations + the tour).
- **TR5** — delete (`DeleteTour` AlertDialog + `deleteTour`, 409).
- **TR6** — gate (lint/typecheck/test/build) + no-hex; stop for review.

## Decisions (signed off 2026-06-24)

1. **Scope:** ✅ Defer itinerary/FAQs/policies + media + departures to increment-2 (as above).
2. **Content arrays:** ✅ **chip/tag input** (not line-per-line textarea).
3. **Destinations picker:** ✅ **multi-combobox with search** + removable chips (not checkbox list).
