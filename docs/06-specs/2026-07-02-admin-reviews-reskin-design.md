# Admin Reviews reskin + surfacing (Wave 2) — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/admin` Reviews module (list · drawer · curated form) + small additive
  `@tourism/api` changes (DTO surfacing + curated-only delete). Wave 2 of the enrichment roadmap
  (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction, spec for execution
- **Trigger:** Reviews is the LAST admin surface still on the pre-template look (bespoke `<Table>`,
  hand-rolled header/tab links, two loose action buttons). The audit also found captured-but-hidden
  data: `tripLabel` is write-only (absent from `AdminReviewDto`), `title` is returned but never
  rendered, the tour shows as a bare slug, and a mis-entered curated testimonial can only be
  hidden (unapproved), never removed.

## Decisions (user-approved)

- **Delete = CURATED-only.** `DELETE /admin/reviews/:id` hard-deletes a curated testimonial;
  a VERIFIED review → 409 `REVIEW_NOT_CURATED` (audit trail preserved — hide via unapprove).
  **No edit** (delete + recreate covers the testimonial-typo case — YAGNI).
- **List = client load-all** (`pageSize: 100`, Tours-style): instant tabs-with-counts + filters.
  Revisit-if-grows note: current volume ~26; if reviews exceed the 100 cap, switch to the
  Bookings-style server pagination (documented, not built now).
- **Detail = right-hand drawer** (Enquiries pattern) — the list row already carries the full body;
  no BE detail endpoint.
- **Out of scope:** edit curated · user/booking links from a review (wave 6 territory) · rating
  filter (YAGNI) · any public reviews endpoint change.

## Slice 1 — BE: surfacing + curated-only delete

- **`AdminReviewDto`** += `tripLabel: string | null` (exists on the model, currently write-only)
  and `tourTitle: string | null`; `findAllForAdmin`'s include gains `title` on the tour select and
  the mapper adds both fields (`AdminReviewItem` type in the service updates in lockstep).
- **`ReviewsService.deleteCuratedById(id)`**: 404 when missing; `source !== CURATED` → 409
  `{ code: 'REVIEW_NOT_CURATED', message: 'Only curated testimonials can be deleted — unapprove a
  verified review to hide it.' }`; else hard `delete`. Controller: `DELETE /admin/reviews/:id`
  (`@Roles(ADMIN)`, `ParseUUIDPipe`, `@ApiOkResponse({ type: ReviewDto })` echo, 404/409 documented).
- Service specs: delete happy path · 404 · 409 for VERIFIED · mapper carries tripLabel/tourTitle.
- Admin `FRIENDLY_BY_CODE` (apps/admin/src/lib/api/error.ts) gains `REVIEW_NOT_CURATED`.
- Regen `@tourism/core` types. `ecc:code-reviewer` on the slice (BE surface + destructive op).

## Slice 2 — Admin FE: list reskin + drawer + form reskin

- **Page** (`app/(admin)/reviews/page.tsx`): template container `flex flex-col gap-6 px-4 py-6
  lg:px-6` + `AdminListHeader` (title "Reviews", current description, action "New testimonial");
  fetch all via `listAdminReviews({ pageSize: 100 })`; drop the `?status=` URL filter + bespoke
  header/tab buttons; `ErrorAlert` on failure.
- **`ReviewsView` (client)** — 9th table on the shared TanStack foundation
  (`AdminTableShell` + `ColumnsMenu` + `ClientTablePagination`), plus the drawer state (mirrors
  `enquiries-view.tsx`'s list+drawer composition):
  - **Tabs** All / Pending / Approved with count Badges (client `useMemo`).
  - **Source facet**: Base UI `DropdownMenu` + `DropdownMenuCheckboxItem` (Verified / Curated) —
    THE admin multi-option facet pattern.
  - **Search**: instant, over `authorName + title + body` (lowercase includes).
  - **Columns**: Author (name, location muted below; opens the drawer) · Review (title bold +
    body `line-clamp-2`; opens the drawer) · Rating (star + number) · Tour (**`tourTitle`** linked
    to `/tours/[tourSlug]`, — for curated) · Source badge · Status (dot Badge + Featured outline
    badge) · Posted (`formatRelativeTime(createdAt)`, hideable) · Actions ⋮.
  - **Actions ⋮ menu** (replaces the two loose buttons; Base UI safe — mutation items use
    `onClick`, never `render` a native button): Approve/Unapprove · Feature/Unfeature ·
    **Delete** (rendered ONLY when `source === 'CURATED'`; controlled `AlertDialog` confirm;
    destructive variant). All actions toast success/failure (`toast.success('Approved.')` etc.,
    per the feedback-layer standard) and the drawer (if open on that row) reflects the change.
  - **Drawer** (right `Sheet`, Enquiries pattern; row's own data, client-only): title + full body ·
    rating stars · author + location + **tripLabel** · Source/Status/Featured badges · tour link ·
    Created/Updated (absolute + relative) · the same Approve/Feature/Delete actions.
  - Empty states: true-zero ("No reviews yet…") vs filtered-empty, per the Posts table precedent.
- **`deleteReview(id)` server action** (`lib/reviews/actions.ts`, alongside the existing
  moderate/feature actions): `DELETE /api/v1/admin/reviews/{id}` via the typed client,
  `revalidatePath('/reviews')`, returns `{ error? }`.
- **Curated form reskin** (`components/reviews/curated-form.tsx` + `app/(admin)/reviews/new/page.tsx`):
  Form Layout 2 — `FieldSet`/`FieldLegend`/`Field`/`FieldLabel`/`FieldError` (replacing raw
  `Label` + ad-hoc error `<p>`s), sections **Traveller** (name, location, trip label) and
  **Testimonial** (rating, body), `flex justify-end` Cancel(outline)+Submit; field `name`s and
  `lib/reviews/{schema,actions}` unchanged. Page container → `mx-auto max-w-4xl space-y-6 px-4
  py-6 lg:px-6`.
- Delete `components/reviews/review-actions.tsx` (the loose-buttons component) once the ⋮ menu
  replaces it — verify no other importer.

## Testing

- BE: 4 new service specs (delete ok/404/409 + mapper fields); existing reviews specs stay green.
- FE: reskin of reviewed patterns — typecheck/build-guarded + per-task review; existing
  `lib/reviews` specs (if any) untouched-green. Deploy-lag guards: `r.tripLabel ?? null`,
  `r.tourTitle ?? r.tourSlug ?? '—'` (Render lags Vercel).
- Gate per slice; slice 1 → `ecc:code-reviewer`; slice 2 self-certified unless findings.
- Merging to `main` after a green slice is pre-authorized (user reviews on the deploy).

## Risks

- **Destructive endpoint:** CURATED-only guard is the audit-trail protection — must be asserted in
  a test; the FE hides Delete for VERIFIED but the BE guard is the authority.
- **Base UI footguns:** mutation menu items via `onClick`; controlled AlertDialog outside the menu.
- **Drawer staleness:** after approve/feature/delete, reconcile the open drawer from the fresh
  rows (the Enquiries `useEffect` reconcile pattern) — don't show a deleted/stale row.
- **`review-actions.tsx` removal:** confirm the list page was its only importer.

## Success criteria

- Reviews is visually indistinguishable in structure from the other template lists (header, tabs
  with counts, facet, search, Columns, pagination, ⋮ actions), with a working full-text drawer.
- `tripLabel` + `title` + tour title/link are visible; a curated testimonial can be deleted (with
  confirm + toast), a verified review cannot (friendly 409 if forced).
- Curated form is Form Layout 2. Gate green per slice; no template-pattern deviations.
