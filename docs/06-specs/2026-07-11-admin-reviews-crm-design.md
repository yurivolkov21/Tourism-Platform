# Reviews upgrade + Enquiry CRM (Wave B2) — design spec

**Date:** 2026-07-11 · **Scope:** api + admin · **Status:** approved
(user 2026-07-11: wave B2 of the B→C→D debt plan; notes = thread model
`EnquiryNote`, not a single text field).

## Goal

Close the two "operations" debts from the 2026-07-10 audit:

1. **Reviews**: edit a curated testimonial (today: delete + recreate) · real
   links from a review to its customer and booking · rating filter · **server-
   side pagination** (today the page loads 100 rows once — anything beyond is
   unreachable).
2. **Enquiry CRM**: internal notes (timestamped thread with the admin's name)
   · repeat-lead detection by email.

## Non-goals

- Editing VERIFIED reviews' content (customer words stay immutable; moderation
  toggles already exist).
- Note edit/delete (append-only thread; revisit if real usage demands it).
- Email normalization at write time (repeat-lead matches the stored email
  exactly; the public form's casing is accepted as-is — documented limitation).
- Reviews column sorting: converting the table to server-mode **supersedes the
  B1 client sort on Reviews** (sorting one fetched page is misleading; the
  server-mode rule from B1 applies — no API sort yet).

## Current state (verified 2026-07-11)

- `Review` has `userId`/`bookingId` FKs and `AdminReviewDto` already exposes
  them — but no joined user name/email or booking code, and the service
  includes only `tour`.
- Admin list query = `page/pageSize/isApproved` only (no source/rating/search);
  FE `reviews/page.tsx` hardcodes `pageSize: 100` + filters client-side.
- No update endpoint for curated reviews (`POST curated`, `PATCH moderation`,
  `PATCH feature`, `DELETE` curated-only exist).
- `Enquiry` has no notes and no index on `email`; enquiries FE is already
  URL-driven server pagination with a status drawer (`enquiries-view.tsx`).
- Admin identity in controllers = `@CurrentUser()` (narrow null like
  `admin-posts.controller.ts`).

## Design

### API — reviews

- **`ListAdminReviewsQueryDto`** gains `source? (VERIFIED|CURATED)`,
  `rating? (int 1–5)`, `search? (≤120)` — insensitive OR over
  `authorName/title/body`. `findAllForAdmin` builds the `where` accordingly and
  now `include`s `user` (id, fullName, email) + `booking` (code).
- **`AdminReviewDto`** gains `userName`, `userEmail`, `bookingCode` (all
  nullable; admin-only DTO, explicit mapping — nothing touches the public
  review DTOs).
- **`PATCH /admin/reviews/:id`** — `UpdateCuratedReviewDto` (all-optional
  subset of create-curated: `authorName?, authorLocation?, tripLabel?,
  rating?, title?, body?`): 404 `REVIEW_NOT_FOUND`, 409 `REVIEW_NOT_CURATED`
  for VERIFIED rows (mirrors delete's guard).

### API — enquiry

- **New model** (migration also adds `@@index([email])` on `enquiries`):

  ```prisma
  model EnquiryNote {
    id         String   @id @default(uuid())
    enquiryId  String   @map("enquiry_id")
    authorId   String?  @map("author_id")      // SetNull if the admin is deleted
    authorName String   @map("author_name") @db.VarChar(200) // snapshot
    body       String   @db.VarChar(2000)
    createdAt  DateTime @default(now()) @map("created_at")
    enquiry Enquiry @relation(fields: [enquiryId], references: [id], onDelete: Cascade)
    author  User?   @relation(fields: [authorId], references: [id], onDelete: SetNull)
    @@index([enquiryId, createdAt])
    @@map("enquiry_notes")
  }
  ```

- **Endpoints** (`@Roles(ADMIN)`): `GET /admin/enquiries/:id/notes` (asc by
  createdAt) · `POST /admin/enquiries/:id/notes` (`{ body }`, stamps
  `@CurrentUser` id + fullName snapshot; 404 unknown enquiry).
- **`EnquiryDto`** gains `repeatCount` (total enquiries sharing this row's
  exact email, incl. itself — computed per page via one
  `enquiry.groupBy({ by: ['email'], where: { email: { in: pageEmails } } })`)
  and `notesCount` (`_count.notes`). List response only — the public
  `POST /enquiries` DTO is untouched.

### Admin FE

- **Reviews → server-driven** (the bookings/enquiries pattern): `page.tsx`
  parses `page/pageSize/status(pending|approved)/source/rating/q` (rating
  guarded by a tiny TDD'd `parseRatingParam`), passes them to
  `listAdminReviews`; `reviews-view` flips to `manualPagination` +
  `ServerTablePagination`; toolbar = status tabs (URL) + `FacetFilter` source +
  `FacetFilter` rating (5→1, single-select) + debounced server search +
  ColumnsMenu. Client sorting removed (see non-goals).
- **Edit curated**: `/reviews/[id]/edit` reusing the create-curated form
  (prefilled) + `updateCurated` server action; Edit appears only for CURATED
  rows (row ⋮ + drawer button). VERIFIED rows keep moderation-only actions.
- **Drawer links**: customer block (name + `mailto:` email · "View customer" →
  `/users/[id]` · "View their bookings" → `/bookings?userId=`) and booking
  code → `/bookings/[code]` when present.
- **Enquiries**: drawer gains a **Notes** panel (thread asc + relative time +
  author name; textarea + "Add note", server actions `listNotes`/`addNote`
  fetched on drawer open, optimistic append with rollback-on-error toast).
  List rows show a "Repeat ×N" badge when `repeatCount > 1` (also in the
  drawer, where it links to `?q=<email>` — the existing search already scopes
  the list to that lead) and a subtle notes-count chip.

## Error handling

- Notes: enquiry 404 → toast; empty body blocked client-side (`noValidate` +
  field error, standing rule) and by class-validator server-side.
- Reviews edit: VERIFIED → 409 surfaces as a toast; unknown id → 404 page.
- repeatCount query failure must not break the list (compute defensively in
  the service; fall back to 1).

## Testing

- API (service specs, house convention): reviews — filter/search where-building,
  update-curated partial + 404/409 guards, DTO mapping incl. user/booking;
  enquiry — notes create (author stamp)/list/404, repeatCount + notesCount
  mapping.
- Admin: TDD `parseRatingParam`; existing view specs stay green; notes panel
  logic kept thin (server actions + optimistic state).
- `/regen-types` after the DTO changes; gate green on affected projects.
- **Adversarial review before merge** (schema migration — standing rule).

## Definition of done

Admin can edit any curated testimonial in place; every review row/drawer links
to its customer and booking; reviews list is genuinely paginated server-side
with status/source/rating/search filters; enquiry drawer carries a working
notes thread with author + time; repeat leads are visibly flagged and one click
lists every enquiry from that email; migration applied to live Supabase; gate
green; docs swept.
