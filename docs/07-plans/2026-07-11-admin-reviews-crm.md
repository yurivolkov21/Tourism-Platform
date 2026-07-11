# Reviews upgrade + Enquiry CRM (Wave B2) — implementation plan

**Spec:** `docs/06-specs/2026-07-11-admin-reviews-crm-design.md`
**Branch:** `feat/admin-reviews-crm` · **Scope:** `apps/api` + `apps/admin`

**STATUS: PLANNED**

Standing rules: TDD on service methods + pure helpers (failing spec first) ·
straight quotes · no unrelated-line reformatting · tokens only · reuse
`@tourism/ui` + the crud stack · kill orphan node before nx runs · adversarial
review before merge (migration) · migration applied to live Supabase only after
user confirm.

## Tasks

### T1 — API: reviews list filters + enriched DTO (TDD)

- [ ] Extend `reviews.service.spec.ts` first: `findAllForAdmin` builds `where`
      for `source`/`rating`/`search` (insensitive OR authorName/title/body),
      maps `userName`/`userEmail`/`bookingCode` from the new includes (null for
      curated rows).
- [ ] `ListAdminReviewsQueryDto` += `source?/rating?/search?` (class-validator:
      enum, int 1–5, ≤120 trim); service `where` + `include { user, booking }`;
      `AdminReviewDto` += `userName/userEmail/bookingCode` + mapper.

### T2 — API: edit curated review (TDD)

- [ ] Spec first: `updateCuratedById` — partial update happy path · 404
      `REVIEW_NOT_FOUND` · 409 `REVIEW_NOT_CURATED` for VERIFIED.
- [ ] `UpdateCuratedReviewDto` (all-optional create-curated fields) +
      `PATCH /admin/reviews/:id` on the admin controller + service method.

### T3 — API: EnquiryNote model + endpoints (TDD)

- [ ] Prisma: `EnquiryNote` model (spec shape) + `notes` relation on `Enquiry`
      + `@@index([email])` on `Enquiry`; migration
      `add_enquiry_notes_and_email_index` (CREATE TABLE + FKs cascade/set-null
      + indexes) — **applied locally only; live deploy after user confirm at
      merge time**.
- [ ] `enquiry.service.spec.ts` first: `listNotes` (asc, 404 unknown enquiry) ·
      `addNote` (author id + fullName snapshot from `@CurrentUser`, 404).
- [ ] `EnquiryNoteDto` + `CreateEnquiryNoteDto { body }` +
      `GET/POST /admin/enquiries/:id/notes` (controller narrows null user like
      admin-posts).

### T4 — API: repeatCount + notesCount on the admin list (TDD)

- [ ] Spec first: list mapping — `repeatCount` from a per-page
      `groupBy(['email'])` (exact match, defensive fallback 1),
      `notesCount` from `_count.notes`; public enquiry DTO untouched.
- [ ] Implement in `findAllForAdmin` (one extra groupBy per page,
      `Promise.all`-safe) + `EnquiryDto` fields.

### T5 — Regenerate the typed client

- [ ] Serve the API locally → `/regen-types` flow → commit the regenerated
      `libs/shared/core/src/lib/api/schema.ts`.

### T6 — Admin: reviews server-driven refactor

- [ ] `reviews/page.tsx`: parse `page/pageSize/status/source/rating/q`
      (TDD-first `parseRatingParam` in `lib/params.ts`), fetch with them.
- [ ] `reviews-view.tsx`: `manualPagination` + `ServerTablePagination`; URL
      toolbar — status tabs, `FacetFilter` source + rating (single-select),
      debounced search (350ms, the bookings pattern); remove the B1 client
      sorting + in-memory tab/source/query filtering; counts hint stays
      meta-driven.

### T7 — Admin: edit curated + drawer links

- [ ] `lib/reviews/actions.ts` `updateCurated` + `/reviews/[id]/edit` page
      reusing the create form (prefill; CURATED-only guard → 404/redirect).
- [ ] Row ⋮ + drawer: Edit (curated only); drawer customer block (name ·
      mailto · View customer `/users/[id]` · View their bookings
      `/bookings?userId=`) + booking code link `/bookings/[code]`.

### T8 — Admin: enquiry notes panel + repeat badge

- [ ] `lib/enquiries/actions.ts` `listNotes`/`addNote` server actions.
- [ ] Drawer Notes panel: fetch on open (useTransition), thread asc w/ author +
      relative time, `noValidate` textarea + field error, optimistic append +
      rollback toast.
- [ ] List: "Repeat ×N" badge (`repeatCount > 1`) + notes-count chip; drawer
      repeat badge links `?q=<email>`.

### T9 — Gate + adversarial review + merge

- [ ] Kill orphan node → `pnpm nx affected -t lint typecheck test build` green.
- [ ] **Adversarial review** (migration + repeatCount query + DTO-leak check +
      optimistic notes) — fix confirmed findings.
- [ ] Report → user confirms → apply migration to live Supabase
      (`prisma migrate deploy`) → commit → ff-merge → push → delete branch.
- [ ] Docs sweep (rule 9): this STATUS · roadmap P4 + P1 API rows · CLAUDE.md
      api/admin rows + test counts · HANDOFF (B2 done, wave C next) ·
      `functions-admin.md` (new endpoints A-REV-x/A-ENQ-x) · `data-model.md`
      (EnquiryNote + email index).
