# Admin information-richness audit + enrichment roadmap

- **Date:** 2026-07-02
- **Method:** 4 parallel read-only audit agents cross-referencing three layers per module —
  Prisma model ↔ API DTO/service ↔ admin UI (list · detail · form). Posts findings come from the
  earlier deep-dive (same day).
- **Purpose:** one consolidated pass over every admin module so enrichment work is planned once,
  not discovered mid-feature (user request).

## Per-module verdicts

### Posts (deep-dive earlier today)

Model is thin (10 scalars) and admin already shows 100% of it + author. What's missing is
structural, not hidden data:

1. **Cover image** — DB ready (`MediaOwnerType.POST` + fixture hero rows exist); API lacks
   `UploadPurpose.POST_COVER` + `PUT /admin/posts/:slug/media` + DTO media. Unblocks P6 web blog.
2. **Derived facts (FE-only):** word count + reading time (~200 wpm) rail fact; headings-outline
   ("In this post") rail card.
3. **Author avatar:** users already have `USER_AVATAR` media → add `avatarUrl` to `PostAuthorDto`.

### Destinations — rich enough; minor list wins

- All scalars + linked tours already surfaced. Candidates: **tours-count column** on the list ·
  **list thumbnail** (media already ships in the list payload, just unused) · richer "Used by
  tours" rows (category chip) · media dimensions in lightbox (low value).

### Categories — rich enough; minor list wins

- All scalars surfaced; no media capability at schema level (no `MediaOwnerType.CATEGORY`) — the
  UI correctly reflects that. Candidates: **tours-count column** on the list · published/draft
  split on the detail count. Category imagery would be a schema change — defer until the public
  site wants it.

### Tours — content-rich, commercially blind

Content editing (itinerary/FAQ/policy/media/merchandising) fully covered. Gaps are operational:

- Detail has **no bookings/revenue card**, no reviews list (only the aggregate rating), no
  departures schedule summary (only "next departure"), no enquiry/wishlist lead signals.
- List: no thumbnail / rating / next-departure columns despite the data already being in
  `TourSummaryDto`.

### Departures — thinnest module; structural gap

- **No read-only detail page** (only list + edit form) → nowhere to show `createdAt`/`updatedAt`
  (returned by API, rendered nowhere) or linked bookings.
- **Bookings relation never surfaced** — can't see which bookings sit on a departure without
  manually cross-filtering the Bookings module.
- Candidates: departure detail page (facts + linked bookings + utilization %), bookings count/link
  per row, seats utilization as a visual.

### Bookings — good lifecycle/audit; customer blind spot

- `user` relation never joined/shown — admin sees only the contact snapshot, can't jump to the
  customer's other bookings (no Users module exists at all).
- `PaymentEvent` webhook history never surfaced (debugging stuck payments), `providerSessionId`
  missing from the detail DTO (pre-capture debugging).
- Candidates ranked: customer identity + other-bookings; PaymentEvent trail; providerSessionId in
  the payment block; seats-remaining beside the Trip card.

### Enquiries — biggest pure "wire-it-up" gap in the app

- **5 qualification fields captured in DB but absent from `EnquiryDto` + UI:** `nationality`,
  `travelDate`, `groupSize`, `budgetTier`, `interests` (built in P1.7d exactly so sales can qualify
  leads — currently write-only). The web private-departure request form SENDS these; admin never
  sees them.
- `tour` never joined — drawer shows "About a tour: Yes" instead of the tour title/link.
- No server-side search (client search is silently page-scoped). No lead-age signal.

### Reviews — the LAST module not on the template

- Bespoke `<Table>`, hand-rolled header/tabs, button-pair actions — pre-template style throughout.
- `tripLabel` write-only (never read back into the DTO), `title` never rendered, tour shown as bare
  slug (no title/link), `userId`/`bookingId` returned but never linked, no detail drawer for
  full-text, **no delete/edit for curated reviews**, no source/rating/featured filters, no search.

### Dashboard — rich BE, under-surfaced UI

Server already computes and returns, UI discards:

- `topToursByRating` + `topToursByWishlist` — never rendered.
- `bookingsByStatus` — fetched, not visualized (table computes its own counts off a separate
  50-row fetch).
- `dailyTrend.bookings` — plotted nowhere (only revenue).
- No pending-reviews / pending-enquiries tiles despite both being operational queues.

### Media (nav `soon`) — missing end-to-end, correctly gated

- No admin browse/list/search endpoint over `MediaAsset` exists; media only lives embedded in
  Tour/Destination/(soon Posts) forms. A library page = net-new BE (list/search/delete/reuse) +
  orphan/garbage visibility. Real feature, own spec, not a surfacing fix.

## Cross-cutting patterns (why audit-first paid off)

1. **List thumbnails** — same gap on Destinations, Tours, Posts(-to-be): media is already in the
   list payloads; one consistent column treatment should land across all three at once.
2. **Related-entity cards on detail** — the `LinkedToursCard` idea generalizes: tour→bookings/
   departures/reviews, departure→bookings, booking→customer's other bookings. One visual pattern.
3. **"Captured but not exposed" DTO gaps** — Enquiries ×5 fields, Reviews `tripLabel`,
   Bookings `providerSessionId`: same class of fix (DTO + regen + render).
4. **Template debt** — Reviews is the single remaining pre-template surface.

## Proposed roadmap (waves, in order)

| Wave | Scope | BE? | Size |
| --- | --- | --- | --- |
| **1. Posts enrichment** — ✅ **DONE 2026-07-02** (`fcd6b95` · `893044c` · `f2ae4b4`) | cover image (POST_COVER + media endpoint + DTO + form MediaField + detail hero + list thumbnail) · reading time + outline (FE) · author avatar (`PostAuthorDto.avatarUrl`) | small | M |
| **2. Reviews reskin + surfacing** — ✅ **DONE 2026-07-02** (`a6e9ee8` · `832b120`) | template migration (AdminListHeader/TanStack/tabs+counts) · render `title`/`tripLabel`/tour title+link · full-text drawer · source facet · **delete CURATED-only** (decided; edit = YAGNI) | small (DTO + delete endpoint) | M |
| **3. Enquiries CRM upgrade** — ✅ **DONE 2026-07-02** (`71127da` · `063fb41`) | 5 qualification fields → DTO + drawer "Trip details" block · join tour title/link · server-side `search` (name/email/phone/message) · lead age on Received + drawer | small | S–M |
| **4. Dashboard quick wins** — ✅ **DONE 2026-07-02** (`6bf0b93` · `8b0d98e`) | chart Revenue\|Bookings toggle · bookings-pipeline card · Top tours card (Revenue/Rating/Wishlisted tabs) · Needs-attention tiles (via small BE `pendingCounts`) | tiny (`pendingCounts`) | S |
| **5. Tours + Departures ops visibility** — ✅ **DONE 2026-07-02** (`5a8f13e` · `bdaf411` · `6b566a4`) | departure detail page (facts + bookings + utilization) · tour detail Performance/Departures-summary cards + Reviews link · list sweep (tours cover/rating/next-departure · destinations cover · tours-count) · bookings tourId/departureId filters | medium | L |
| **6. Bookings polish** — ✅ **DONE 2026-07-02** (`829558a` · `763eb5b` · `cd39082`) | join customer + other-bookings mini-list + `?userId=` deep-link · PaymentEvent trail (metadata-only, JSONB-path link) · providerSessionId · seats-remaining · **+ the Wave-5 `@@index([tourId])` follow-up (applied to Supabase)** | small | S–M |
| **7. Media library** | admin MediaAsset browse/search/delete/reuse + garbage visibility | **new BE feature** | L — own spec |

Each wave = spec → plan → slices per the standing workflow; waves 2–7 order can be re-shuffled by
the user without dependency issues (only wave 5's thumbnail sweep loosely benefits from wave 1's
thumbnail treatment landing first as the reference).

## Explicitly deferred (YAGNI for now)

- Post tags/related-tours/SEO fields/scheduled publishing · category imagery (schema change) ·
  Users admin module (bigger than a booking join — revisit after wave 6) · analytics/view counts ·
  bulk actions.
