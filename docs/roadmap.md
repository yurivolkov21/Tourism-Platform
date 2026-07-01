# Roadmap — tourism-platform

Phase-by-phase plan. Each phase = its own spec + plan + branch (spec→plan→execute).
Founding phase list: [BLUEPRINT §7](BLUEPRINT.md#7-phased-roadmap). Decisions: [decisions](02-decisions/README.md).

> Update the status column as work lands. ✅ done · 🚧 in progress · ⬜ not started.

## Phases

| Phase | Deliverable | Status |
| --- | --- | --- |
| **P0** | Nx scaffold: apps + libs + tags | ✅ done (`d720036`) |
| **P0.6** | Module boundaries (ESLint flat-config + enforce-module-boundaries) | ✅ done |
| **P0.8** | Port donor conventions + rename `@org`→`@tourism` + AI cleanup | ✅ done |
| **P1** | **Backend:** fresh Prisma schema + port infra + seed | ✅ **complete** (P1.1–P1.8 + **P1.x** done): schema/auth/CRUD/bookings/Stripe+PayPal/media/reviews+wishlist+enquiry+stats/seed+client+e2e + pg-boss jobs (outbox emails + cron). **+ blog Posts CRUD** + **admin bookings list/detail** (`GET /admin/bookings` paginated + `:code` detail) — backend now ~99% of P4's admin scope. **~223 api tests.** |
| **P2** | Design system: `shared/tokens` + `web/ui` (+ `mobile/ui` later) | ✅ **done** — Style Dictionary tokens (**"Emerald Heritage"**, no-hex enforced) + shadcn/Base UI 54 comps in `@tourism/ui` |
| **P3** | Web (customer): home → destinations → tours → detail → booking → account | 🟢 **~99% + DEPLOYED** — home · destinations (overview + **3 region pages**) · tours (listing **+ free-text search** · **pagination** · **availability badge** · detail) · about · contact (**real enquiry + interest dropdown from live categories**) · content + **complete legal pages** · **auth (login/register/forgot/reset)** · **account (dashboard · settings · bookings list+detail+cancel/refund-request · saved)** · **booking flow (Stripe/PayPal + private-departure request + checkout pages)** · reviews (unified DB) · **wishlist save-UI** all done; **component reform done** (forms → `@tourism/ui`); real data wired across. **Final polish pass DONE + MERGED** (`ca1cfd0`): a11y WCAG 2.2 AA · SEO (sitemap/robots/JSON-LD/OG/canonical) · perf (next/image, React `cache`, reduced-motion) · logo → single Nexora wordmark. **Remaining:** none blocking (optional Lighthouse fine-tuning). |
| **P4** | Admin: manage tours/destinations/departures/media/reviews/bookings | ✅ **CRUD breadth done + DEPLOYED** — admin auth (Supabase SSR + proxy, `/auth/admin/sync` allowlist) · app shell (sidebar/topbar/theme/user-menu) · dashboard (live `/admin/stats/dashboard`) · **CRUD: Destinations · Categories · Tours · Departures · Posts** (Server-Component fetch + Server-Action mutations, `@tourism/ui`, token-only). Dev port **:3002**. **UI REDESIGN in progress (2026-06-30):** Login (React Bits Aurora WebGL backdrop + glass card + shared Nexora logo) · app shell (inset sidebar, dashboard-01 pattern, footer account) · **dashboard rebuilt to shadcn dashboard-01 parity** (SectionCards + daily area chart + TanStack/dnd DataTable; BE `dailyTrend`) · **Destinations module COMPLETE** (list reskin w/ instant client-side filter+tabs · Form Layout 2 create/edit w/ auto-slug + locked country + region dropdown · **hero+gallery image upload** to Cloudinary; BE +`DESTINATION_GALLERY` purpose +`publicId` on media read) — all DONE + deployed. **Categories module COMPLETE** (list+detail+form template, no images). **Bookings module COMPLETE** (2026-07-01, branch `feat/admin-bookings`): read-only list (server-side status tabs + code/name/email search + pagination via URL) · detail (order/trip/customer facts) · **refund action** (`POST /admin/bookings/:code/refund`, PAID-only, reason dialog, friendly `BOOKING_NOT_REFUNDABLE`/`REFUND_FAILED`) · new sidebar "Operations" group · TDD pure `format.ts` (status badge/canRefund/money/guests); code-review APPROVE 0 findings. **Detail enrichment (branch `feat/admin-booking-detail`):** BE adds an admin-only `AdminBookingDetailDto` (kept off the customer-shared `BookingDto`; explicit allow-list mapper — no leak of paidAt/cancelledAt/providerPaymentId/refundReason/refundedBy to `/bookings/me`) + regen types; FE detail = 2-col card layout (**redesigned** — dropped the sparse vertical timeline for a **summary-led** Order rail: lifecycle dates Booked/Paid/Cancelled/Refunded as compact fact rows, only events that happened) with **refund audit** (reason/who), **payment reference** + "View in Stripe", copy-code, relative time; list gains a Payment column + always-on total count. TDD `detail.ts` (timeline/relative-time/stripe-url); code-review APPROVE 0 findings. **Enquiries/CRM module COMPLETE** (branch `feat/admin-enquiries`): list (server-side status tabs NEW→CONTACTED→QUOTED→WON/LOST + pagination via URL · client-side name/email search within page since BE has no `search`) · **detail via right-hand drawer** (Sheet — no BE `GET :id` needed, list `EnquiryDto` already carries the full message) with contact links + full message + **status change** (`PATCH /admin/enquiries/:id/status`, optimistic + rollback) · sidebar "Operations" Enquiries no longer `soon`. TDD `status.ts`; code-review APPROVE. **This closes Group 1 (Bookings + Enquiries).** **Destinations + Categories detail ENRICHED** (branch `feat/admin-detail-linked-tours`): both detail pages reworked to the **card layout** (matches the redesigned Booking detail) + relative-time; each now shows the **linked tours** ("Used by N tours" / "Tours in this category") with Draft/Primary chips + links to each tour's edit page. BE: admin-only `AdminDestinationDetailDto`/`AdminTourCategoryDetailDto` (kept off the public-shared DTOs; new `findDetailForAdmin` includes the M:N/1:N tours, explicit map, no leak) + regen types + specs. Shared `LinkedToursCard` + `lib/relative-time.ts` (factored out of bookings). Remaining: detail pages + media upload for Tours/Posts · Tours increment-2 (itinerary/FAQs/policies) · list reskin for Tours/Posts/Reviews. |
| **DEPLOY** | Free-tier cloud deploy (Vercel + Render + Supabase) | ✅ **LIVE** — web+admin on **Vercel**, API (NestJS+pg-boss) on **Render** free, DB on **Supabase**; `/health` (DB ping) + **cron-job.org** keep-alive (every 10 min, free; auto-disables after 25 consecutive fails) + Cloudflare-tunnel fallback. Render free = 750 instance-h/workspace/month (one always-on service ≈744h fits). Runbook: [deploy](05-runbooks/deploy.md). Upgrade-to-paid path = no code change. |
| **P5** | Mobile (Expo): browse → detail → booking → account (reuse `shared/core`) | ⬜ |
| **P6** | Content/SEO (blog/tips) + trust polish | ⬜ — **BE done** (public `GET /posts` + `/posts/:slug`, admin Posts CRUD). **Web blog reader MISSING:** no `/blog` or `/blog/[slug]` route, no posts API client; home `BlogTeaser` uses **fixtures + dead `#` anchors** (not clickable). TODO: `/blog` index + `/blog/[slug]` (markdown render + Article JSON-LD) + wire home teaser to real `GET /posts` + nav/footer link + sitemap. |

## P1 — Backend breakdown (proposed sub-phases)

Each sub-phase its own spec→plan→branch. Detail/decisions: [decisions](02-decisions/README.md) (D-P1.*).

EN-only ([ADR-0005](02-decisions/0005-en-only.md)); security/integrity hardened
([ADR-0008](02-decisions/0008-security-integrity-hardening.md)) throughout.

| Sub | Scope | Notes |
| --- | --- | --- |
| ✅ **P1.1** | Prisma schema (EN-only, M:N, multi-gateway, FKs/CHECK) + migration + **RLS** + PrismaService (PrismaPg) + `prisma.config.ts` + Joi env | **done** — migrated to new Supabase project (SG) |
| ✅ **P1.2** | Envelope (`ApiResponse`→`@tourism/core`) + TransformInterceptor + HttpExceptionFilter + `@SkipTransform`; helmet/CORS; Swagger; **Sentry** | **done** — smoke-tested (DB connect + envelope). Raw-body→P1.5, auth decorators→P1.3 |
| ✅ **P1.3** | Auth: SupabaseJwtGuard + RolesGuard + decorators (`@Public`/`@Roles`/`@CurrentUser`) + auth/users sync (`/auth/sync`, `/auth/admin/sync`, `/users/me`) | **done** — global guards; smoke-tested (public 200 / protected 401). `ADMIN_EMAILS` allowlist |
| ✅ **P1.4** | CRUD: **destinations ✅** · **tours ✅** (+categories, +itinerary/FAQs/policies, **+M:N**) · **departures ✅** (nested, seat/date guards) | done: P1.4a destinations · P1.4b tours/categories · P1.4c departures. M:N + slug refs changed DTO shape vs donor |
| ✅ **P1.5** | Bookings + **multi-gateway payments (Stripe + PayPal)** | done: P1.5a bookings core · P1.5b Stripe (checkout/webhook/refund, atomic seat-claim CTE) · P1.5c PayPal (Orders v2, capture-on-return). **MoMo→PayPal pivot** ([ADR-0006](02-decisions/0006-multi-gateway-momo.md)). Emails deferred → P1.x |
| ✅ **P1.6** | Media (Cloudinary) signed direct upload + media-set endpoints + read-attach | done: `lib/cloudinary-url`, `modules/{uploads,media}`, `PUT /admin/{tours,destinations}/:slug/media`. Reconcile/destroy job → P1.x |
| ✅ **P1.7** | Reviews + wishlist + **enquiry** + admin-stats (+ user-avatar wiring) + donor-parity merchandising | done: P1.7a reviews (#15) · P1.7b wishlist+enquiry (#16, throttle 5/min + honeypot) · P1.7c admin-stats+user-avatar (#17) · **P1.7d enquiry lead fields** (#23, nationality/travelDate/groupSize/budgetTier/interests — Lily's form parity) · **P1.7e tour merchandising** (#24, `TravellerType` suitableFor + `TourBadge` badges). 187 api tests |
| ✅ **P1.x (jobs)** | **pg-boss** module: outbox emails (Resend — confirm/refund/review-approved/enquiry) + cron (abandoned-booking cleanup, media reconcile incl. Cloudinary destroy) | done: P1.x-a outbox+emails (PR #21, `Outbox` table written atomically in the seat-claim CTE; ESM dynamic-import) · P1.x-b cron (PR #22, `MediaGarbage` table + `*/15m` cleanup + daily reconcile). [ADR-0007](02-decisions/0007-pgboss-outbox-jobs.md). 184 api tests |
| ✅ **P1.8** | Seed + generate `shared/core` API client + tests (≥80% logic) + e2e | done: P1.8a seed (PR #18, idempotent catalog + self-signed PAID booking) · P1.8b `@tourism/core` typed client (PR #19, openapi-typescript + openapi-fetch, wired `/regen-types`) · P1.8c supertest e2e + coverage ≥80% (PR #20, stmts 81.9% · 162 unit tests). Wired `/seed` + `/regen-types` |

### P1 prerequisites (need from product owner)

- Decisions **D-P1.1, D-P1.3–D-P1.6** in [decisions](02-decisions/README.md) (D-P1.2/0.7/0.8 resolved via ADRs).
- Secrets/DB to run locally: Supabase (DATABASE_URL + DIRECT_URL + keys), **Stripe** test, **MoMo** test, Cloudinary, Resend, Sentry DSN → `apps/api/.env`.

## P3 — Web (customer) breakdown

Layout-first with fixtures shaped like the eventual `@tourism/core` DTOs (wire real data later);
tokens-only (no-hex), reuse `@tourism/ui`, copy in `@tourism/i18n`. Plan:
[p3-web-build-plan](07-plans/2026-06-21-p3-web-build-plan.md) · spec:
[p3-destinations](06-specs/2026-06-21-p3-destinations-design.md).

| Page / area | Route | Status |
| --- | --- | --- |
| **Home** (Lily-style clone) | `/` | ✅ hero · **"Built with" coloured tech-cloud marquee** · destinations bento · experiences · featured · why-choose · trust · blog-teaser · enquiry — **featured/bento wired to live API** (ISR 300) |
| **Destinations overview** | `/destinations` | ✅ hero · full-bleed region mosaics (feature tiles) · when-to-visit · popular (image posters) · testimonials · travel-tips · enquiry |
| **Region pages** | `/destinations/[region]` | ✅ SSG ×3 (northern / central / southern) — hero · intro bento · highlights · **per-region L2 signature** (North = dark adventure-stats · Central = heritage timeline · South = delta image-postcards) · **tours + destination tabs wired to live data** (`selectRegionBookables`, ISR 300, fixture fallback) · gallery · value-props · **rich Plan-your-trip form** (maps Enquiry model). Editorial imagery stays curated. 404 on unknown region. |
| **FAQ** | `/faq` | ✅ searchable grouped accordion (category icons) · sticky TOC · FAQPage JSON-LD |
| **Privacy / Terms / Cancellation** | `/privacy` `/terms` `/cancellation-policy` | ✅ **complete pages** (`LegalArticle`) — placeholders filled with real facts (Nexora · real email/phone/HCM address · Supabase Singapore region · Vietnam law · age 18); draft callout removed (`reviewNote` now optional). *Not lawyer-reviewed — fine for the demo.* **Cancellation & Refund**: request-based + human-handled (tiers as *guidelines*, not an engine); linked from footer + booking-detail. Refund **execution** (partial-amount + first-class request queue) deferred to the **admin-UI phase**. |
| **Nav / footer** | — | ✅ **Redesigned navbar** (sticky → floating **glass pill** on scroll · **hover-pill** links · **animated arrow CTA**, motion-safe) with the **Nexora "NEX" logo** · **Tours** dropdown + button **→ `/tours`** · Destinations dropdown **→ per-region pages** · about/contact wired · footer (ivory NEX logo) support → about/faq/privacy/terms/contact |
| **Shared content template** | — | ✅ `ContentHero` (emerald header) + `OnThisPage` (sticky TOC scroll-spy) |
| **Tours listing** | `/tours` | ✅ static — sidebar facets (Destination · Category · Duration · Price) + mobile drawer · sort · `TourCard` grid · empty state · **free-text search** (`searchTours` in `@tourism/core`, accent/đ-insensitive; hero `?q=` feeds it) · **client-side pagination** (`pageView`/`pageNumbers` TDD; 10/15/25 per page) · **availability badge** per card. **Client-side filter** (`filterTours`/`sortTours`) keeps the page static. |
| **Tour detail** | `/tours/[slug]` | ✅ SSG — tour hero · overview · highlights · **itinerary accordion** · what's-included · sticky **BookingBox** (real "Book now" → `/tours/[slug]/book` + "Travel on your own dates" → private request · **seats-left per departure**) · gallery · enquiry. |
| **About** | `/about` | ✅ AboutHero · **"Our story" alternating image timeline** (centre spine + haloed year nodes) · by-the-numbers · team (baseline-aligned cards) · enquiry |
| **Contact** | `/contact` | ✅ ContentHero · **Contact-01 inquiry** (real details: VTC hotline + Gmail + HCM location · "Built with" strip · real enquiry form → `POST /enquiries` · **interest dropdown from live tour categories**, ISR 1h, i18n fallback) · **MapLibre/mapcn map** (lazy) · short FAQ accordion · image CtaBand |
| **Auth** (customer) | `/login` `/register` `/forgot-password` `/reset-password` | ✅ Supabase email/password + OAuth buttons · password strength meter · email-confirm gating (Supabase domain-gated). |
| **Account** | `/account` `/account/profile` `/account/security` `/account/bookings` | ✅ **travel-dashboard** hub (stats incl. saved count · next trip) · **settings** (profile + security merged · connected accounts · **Danger Zone delete-account** → BE `deleteMe`) · bookings list. |
| **Booking flow** | `/tours/[slug]/book` `/checkout/{success,cancel}` | ✅ sectioned form (Field Layout 2) · pre-fill from profile · **two modes**: scheduled (departure picker w/ **seats-left** → Stripe/PayPal pay) · **private-departure request** (own dates → Enquiry, quote-based, no payment) · inline calendar date-picker. Stripe sandbox tested live. |
| **Motion pass** | — | ✅ increment-1 merged (`6666acc`) + increment-2 (NumberTicker · BlogTeaser · story spine-fill · staggers). All motion gated behind `useReducedMotion`/`motion-reduce:` + a global `prefers-reduced-motion` baseline (hover-zoom/card-lift). |
| **Final polish pass** | — | ✅ **MERGED** (`ca1cfd0`). **a11y (WCAG 2.2 AA):** skip-link + single `<main>` per page · full-opacity `:focus-visible` · contact labels + checkbox assoc · filter/sort/chip/pagination labelling · `aria-current` nav · `aria-hidden` decorative icons · booking `aria-describedby` · checkout live region · avatar input `sr-only`. **SEO:** `sitemap.ts` + `robots.ts` · root `metadataBase`/title-template/canonical/OG/twitter · Organization (TravelAgency) + tour Product + Breadcrumb JSON-LD · `src/lib/site.ts` base URL. **perf:** `fetchTourDetail` React `cache()` (no double-fetch) · gallery + saved thumbs → `next/image`. |
| **Wire real data** | — | ✅ **wired** — home featured/bento · `/destinations` overview · **region-detail tours+destinations** · `/tours` listing+detail · enquiry → `POST /enquiries` · reviews (tour-detail + homepage testimonials) · contact interest dropdown · **tour-card next-departure availability** (all via `@tourism/core` / native fetch, ISR). Only curated editorial imagery remains static (real `MediaAsset` pending admin upload). |
| **Tour availability badge** | — | ✅ BE `TourSummaryDto.nextDepartureDate`/`nextDepartureSeatsLeft` (soonest OPEN upcoming departure) → card `<TourAvailability>`: "Only N seats left" (≤5) · "Next: {date}" · "On request"; never "sold out". Pure `tourAvailability`/`nextDepartureInfo` (TDD). |
| **Booking detail + cancel** | `/account/bookings/[code]` | ✅ full booking info + status actions — PENDING: "Pay now" (checkout) + "Cancel booking" (`cancelOwnPending`, confirm dialog); PAID: "Request cancellation" → Enquiry to the team (refunds admin-only); pure `buildCancellationRequestPayload` (TDD). List cards link here. `/checkout/cancel` links back here (Pay now / Cancel) — abandoned PENDING stays retry-able, swept by the 30m cleanup cron. |
| **Wishlist save-UI** | tour detail · `/account` · `/account/saved` | ✅ heart in tour-detail BookingBox (**signed-in only**, hidden for guests; optimistic toggle via wishlist server actions; detail stays ISR) · **dedicated `/account/saved`** (card grid + remove, like My bookings) · dashboard "Saved for later" = compact top-3 + "View all (N)". BE wishlist (P1.7b) `GET/POST/DELETE /wishlist`. |
| **Component reform** | — | ✅ **Tier 1–3a done** — native forms (plan-trip · enquiry · hero · faq search) → `@tourism/ui` `Field`/`Input`/`Textarea`/`Button`/`ToggleGroup` · shared `LEAD_*` field baseline (h-10 + shadow) · clear-all links + password toggle → `Button` · dead `tours-explorer` fixture + orphan i18n removed. |
| **Branding** | — | ✅ name **"Nexora"** + **"NEX" origami logo** (`.nexora-fold` two-tone, no-tile in header / ivory in footer) + favicon (`app/icon.svg`); set once in `@tourism/i18n` `brand.name` |

> **✅ Resolved (dev tooling, 2026-06-23):** `pnpm nx dev @tourism/web` froze the machine on
> Windows — root-caused to the **Turbopack dev-server memory leak** (next.js #66326/#81161),
> not app code (prod `build`/`start` run cool). **Fix:** `dev` target pinned to `next dev
> --webpack` (`apps/web/package.json`). Prod build still uses Turbopack. Details + the
> isolation test in
> [runbooks/local-dev.md](05-runbooks/local-dev.md#web-dev-server-eats-ram--freezes-the-machine-windows--known-issue).

---

> **⚠ Legal note:** `/privacy`, `/terms`, `/cancellation-policy` now read as complete pages
> (placeholders filled with real project facts; draft callout removed). They are **not
> lawyer-reviewed** — fine for this demo, but a real launch should have qualified counsel review
> them. Long-form content lives in `apps/web/src/content/{privacy,terms,cancellation}.ts`.

## Donor code worth porting

See HANDOFF.md §"Donor code worth porting" for exact paths in
`tourism-be-api/apps/api/src/` (guards, interceptors, filters, stripe, config, prisma, email, media).
