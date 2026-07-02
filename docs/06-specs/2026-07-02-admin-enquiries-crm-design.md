# Admin Enquiries CRM upgrade (Wave 3) — design

- **Date:** 2026-07-02
- **Scope:** `@tourism/api` Enquiry admin read surface + `@tourism/admin` Enquiries view. Wave 3 of
  the enrichment roadmap (`docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`).
- **Status:** approved direction, spec for execution
- **Trigger (audit findings):** the web private-departure/plan-trip forms SEND five qualification
  fields (`nationality`, `travelDate`, `groupSize`, `budgetTier`, `interests` — built in P1.7d
  precisely so sales can qualify leads) but `EnquiryDto` omits them all: the data is write-only.
  The drawer shows "About a tour: Yes" instead of the tour (no join). The search box silently
  filters only the current page (the API has no `search` param). No lead-age signal for triage.

## Decisions (user-approved)

- **Search scope:** server-side `search` over **name + email + phone + message** (case-insensitive
  `contains` OR), URL-driven `?q=` like Bookings. Replaces the page-scoped client search.
- **Lead age:** relative age from `createdAt` (`formatRelativeTime`) on the list's Received column
  and in the drawer — no per-stage timestamps (updatedAt is not a reliable stage clock — YAGNI).
- **Out of scope:** repeat-lead detection (same-email count — revisit with Wave 6's customer view)
  · editing enquiry content · CRM notes/comments · any public enquiry surface change.

## Slice 1 — BE: DTO + tour join + server search

- **`EnquiryDto`** += `nationality: string | null` · `travelDate: string | null` (date-time) ·
  `groupSize: number | null` · `budgetTier: string | null` · `interests: string[]` ·
  `tourSlug: string | null` · `tourTitle: string | null`.
- **`EnquiryService.findAllForAdmin`**: `include: { tour: { select: { slug: true, title: true } } }`
  + a flat mapper (new `AdminEnquiryItem` shape in the service — currently returns raw rows; the
  mapper spreads the scalars and adds `tourSlug`/`tourTitle` from the join, `null` for general
  enquiries). `PaginatedEnquiries.items` types update in lockstep.
- **`ListEnquiriesQueryDto`** += optional `search` (`@IsString() @MaxLength(160)`, trimmed); when
  present the where gains
  `OR: [{name contains}, {email contains}, {phone contains}, {message contains}]` all
  `mode: 'insensitive'`, AND-composed with the existing `status` filter.
- Service specs: search builds the OR-where (and composes with status) · mapper carries the 5
  qualification fields + tourTitle/tourSlug (and nulls for a general enquiry).
- Regen `@tourism/core` types. `ecc:code-reviewer` on the slice (query building — verify no
  injection surface, Prisma parameterizes).

## Slice 2 — Admin FE: drawer Trip details + tour link + server search + lead age

All inside the existing `enquiries-view.tsx` frame (URL-driven tabs/pagination stay):

- **Search → server-side**: the search `Input` becomes a small form; submit/Enter →
  `pushParams({ q })` (new `q` handling in `pushParams`, resets `page`); the page
  (`app/(admin)/enquiries/page.tsx`) reads `?q=` and passes `search` to `listEnquiries`; the
  `lib/enquiries/data.ts` params gain `search?: string`. The client-side `filtered` memo goes away
  (rows arrive pre-filtered); the toolbar shows the active query with a clear (✕) affordance
  (an `X` reset inside the input or a "Clear" link — match the Bookings filters pattern,
  `components/bookings/bookings-filters.tsx`).
- **Drawer "Trip details" block** (between Contact and Message, `Separator`-framed): rows only for
  present values — Nationality · Travel date (`toLocaleDateString('en-GB', …)`) · Group size ·
  Budget · Interests as outline `Badge` chips. The whole block renders only if at least one field
  has data.
- **Tour row**: "About a tour" → the tour title linked to `/tours/[tourSlug]`; deploy-lag guard
  `selected.tourTitle ?? (selected.tourId ? 'Yes' : 'General enquiry')` (old-API fallback).
- **Lead age**: Received column value becomes `receivedAt(createdAt)` + a muted
  `formatRelativeTime(createdAt)` suffix; the drawer's SheetDescription gains the same relative
  suffix.
- Deploy-lag guards on all new fields (`?? null` / conditional rows) — Render lags Vercel.

## Testing

- BE: +2-3 service specs (existing enquiry specs stay green).
- FE: frame is the reviewed Enquiries pattern — task-review + build gate; no new pure logic worth
  a spec (date formatting reuses existing helpers).
- Gate per slice; slice 1 → `ecc:code-reviewer`; slice 2 self-certified unless findings.
  Merging after green slices is pre-authorized.

## Risks

- **Mapper introduction changes the service return shape** — public `create` path untouched;
  only `findAllForAdmin` grows a mapper. Controller types follow the service.
- **Search on message** can match long bodies — acceptable (admin triage tool); Prisma
  parameterizes `contains`, no injection surface.
- **URL `q` + status combined** must keep pagination sane (reset to page 1 on either change —
  `pushParams` already deletes `page` on status change; extend the same to `q`).

## Success criteria

- The drawer shows the five qualification fields (when sent) + the tour title/link — no more
  write-only lead data, no more "Yes".
- Searching hits the whole dataset server-side (name/email/phone/message), not just the page.
- Received shows lead age at a glance. Gate green per slice.
