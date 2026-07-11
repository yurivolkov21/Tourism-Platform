# Admin wave C — implementation plan

**Spec:** `docs/06-specs/2026-07-11-admin-wave-c-design.md`
**Branch:** `feat/admin-wave-c` · **Scope:** `apps/api` + `apps/admin` (+ web `generateMetadata`)

**STATUS: ✅ COMPLETE** — merged to `main` 2026-07-11 (`a123d48`, ff-only); `post_seo_fields` migration applied to live Supabase (columns verified). Gate green: api 386 · admin 213 · web 231 tests. Adversarial review fixes as recorded in the previous STATUS note.

Standing rules: TDD on service methods + pure helpers (failing spec first) ·
straight quotes · no unrelated-line reformatting · tokens only · reuse the crud
stack (`FacetFilter`/`ServerTablePagination`/`AlertDialog` patterns) ·
`noValidate` forms · kill orphan node before nx runs · adversarial review before
merge (migration) · live migration only after user confirm.

## Tasks

### T1 — API: bookings statusCounts (TDD)

- [x] Spec first in `bookings.service.spec.ts`: list response carries
      `statusCounts` from a groupBy over the same where **minus status**;
      groupBy failure → field omitted; zero rows → zero counts.
- [x] Implement in `findAllForAdmin` + `PaginatedAdminBookingsDto.statusCounts?`.

### T2 — API: post SEO + publishedAt (TDD, migration)

- [x] Prisma: `Post.metaTitle`/`metaDescription` + migration
      `post_seo_fields` (additive; applied live at merge time only).
- [x] Spec first in `posts.service.spec.ts`: create/update persist SEO fields ·
      explicit future `publishedAt` kept on PUBLISHED · omitted keeps the
      now()-on-flip behavior · public DTO exposes the fields.
- [x] DTOs (create/update/public/admin) + service mapping.

### T3 — API: subscriber delete + outbox delete + payment-events (TDD)

- [x] Specs first: newsletter `deleteById` (404) · outbox `deleteById`
      (PENDING/FAILED ok · SENT 409 `OUTBOX_ROW_SENT` · 404) ·
      `paymentEvents.findAllForAdmin` (pagination, provider/type/bookingId
      filters, booking-code join, payload included).
- [x] Endpoints: `DELETE /admin/newsletter/subscribers/:id` ·
      `DELETE /admin/outbox/:id` · `GET /admin/payment-events` (+ DTOs, module
      wiring for payment-events — decide home: payments module admin controller).

### T4 — Regen typed client

- [x] Serve API → `pnpm nx run @tourism/core:api-types` → commit schema.ts.

### T5 — Admin: bookings breakdown + tab counts

- [x] TDD `bookingBreakdown(detail)` in `lib/bookings/detail.ts` (uniform
      per-guest split from the booking's own total; guards → null).
- [x] Detail rail: "Price breakdown" block (adults × unit · children × unit ·
      total) between Guests and Payment.
- [x] `BookingsFilters` tabs render count badges from `statusCounts` (All =
      sum); page threads the field through.

### T6 — Admin: post form SEO + schedule + list badge

- [x] `lib/posts/schema.ts` + form: SEO section (metaTitle ≤70,
      metaDescription ≤160, live counters) + `publishedAt` datetime-local
      (PUBLISHED only, empty = now); actions map to the DTO.
- [x] Posts list status cell: **Scheduled** badge when published-in-future.
- [x] Web `/blog/[slug]` `generateMetadata`: prefer metaTitle/metaDescription.

### T7 — Admin: self-profile card

- [x] `lib/users/actions.ts` `updateOwnProfile` (PATCH `/users/me` via authed
      client) + "Your profile" edit card on `/users/me` (isSelf-gated,
      fullName + phone, noValidate + field errors, toast + revalidate).

### T8 — Admin: subscribers remove + outbox delete + /payment-events page

- [x] Subscribers: per-row Remove (confirm dialog) + server action.
- [x] Outbox: Delete beside Retry (PENDING/FAILED rows; confirm; 409 toast).
- [x] `/payment-events` (Operations nav): server-driven table (provider/type
      facets, pagination) + payload drawer + booking link; `loading.tsx`.

### T9 — Gate + adversarial review + merge

- [x] Kill orphan node → full affected gate green.
- [x] Adversarial review (migration + new endpoints + derived breakdown) —
      fix confirmed findings.
- [x] Report → user confirms → `prisma migrate deploy` live → commit →
      ff-merge → push → delete branch.
- [x] Docs sweep (rule 9): STATUS · roadmap · CLAUDE.md rows + test counts ·
      HANDOFF (wave C done → D backlog) · functions-admin.md (new endpoints) ·
      data-model.md (Post SEO fields) · functions-customer.md if public post
      DTO documented there.
