# HANDOFF — tourism-platform (resume here)

**Read this first when opening a new session.** Full plan: [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).
Design references study: [`docs/03-reference/reference-sites-analysis.md`](docs/03-reference/reference-sites-analysis.md).

## What this is

A **greenfield rebuild** of a tourism booking platform, styled after
**<https://lilystravelagency.com/>** (primary design reference) + Nom Nom Travel.
Nx + pnpm monorepo with **mobile from day one**.

- **This repo (`c:\develop\Apps\Main-Projects\tourism-platform`)** = the new, active project.
- **Donor repo (`c:\develop\Apps\Main-Projects\tourism-be-api`)** = the previous build, now **FROZEN reference** — read it to **port proven code**, but **do not modify it**.

## Why we rebuilt (Yuri's intent)

Clean, deliberately-designed **data model** (past decisions felt hasty), tighter
data control, add **mobile**, and a coherent Lily-style FE (no "thập cẩm" patching).
Strategy: greenfield + keep donor as a safety net to port from. Keep our
**self-serve online booking** (Stripe) — the edge Lily lacks (they close via chat).

## Locked decisions

| Area | Choice |
| --- | --- |
| Monorepo | **Nx 22 + pnpm** |
| Mobile | **Expo / React Native** (max code reuse with web via shared libs) |
| Backend | **NestJS** — *fresh clean Prisma schema* + **PORT** donor's proven infra |
| Web / Admin | **Next.js 16** App Router, Lily-style |
| Data model | multi-destination **M:N**, lightweight **Enquiry** ("Inquire Now"), + highlights / FAQ / policies / price-anchor (`compareAtPrice`) |
| i18n | **English-only** (ADR-0005; was EN/VI) |
| Direction | Lily-adapted (warm, trust-forward) |

## Current state — P1 + P2 DONE · P3 web DONE · P4 admin CRUD DONE · P6 + blog-v2 COMPLETE (all 5 waves, 2026-07-05) · **refund execution + cancellation-request queue COMPLETE + DEPLOYED (2026-07-05)** · **web feedback layer (toast + AlertDialog) COMPLETE, deploy pending merge (2026-07-06)** · **DEPLOYED** (`main`)

> **Next action:** web feedback layer (toast + flash infra + AlertDialog
> standardization on `apps/web`) is done on `feat/web-feedback-layer` and awaiting
> merge → deploy. Remaining candidates, user picks: real content authoring ·
> P5 mobile (teammate's lane — do not touch `origin/nghia*` branches).
>
> **Verification status (user, 2026-07-05, on deployed):** ✅ **Stripe** partial
> refund + deny confirmed working end-to-end (real test-mode booking → partial
> refund → `PARTIALLY_REFUNDED`, seats kept; deny on seed booking OK since deny is
> DB-only). ⚠️ **PayPal refund e2e NOT verified — account-gated** (user's PayPal
> sandbox is suspended pending verification). The PayPal refund path is implemented
> (partial amount + `paypalRequestId` idempotency) + unit-tested + opus-reviewed,
> but never run against a real sandbox capture. **Next session: verify PayPal
> refund e2e once the sandbox account is active** (book → pay via PayPal → refund).
> Note: seed `BK-SEEDPAID` cannot be refunded (fake `pi_seed_paid_1`, no real
> gateway payment — refund correctly returns `REFUND_FAILED` and keeps it PAID).

```text
apps/   api (NestJS 11) · web + admin (Next 16) · mobile (Expo SDK 54)
libs/   shared/{core,tokens,i18n} · web/ui (React) · mobile/ui (RN)
```

**Now (frontier):**

- **API (P1) — complete + DEPLOYED on Render.** P1.1–P1.8 + P1.x (jobs). Schema+RLS,
  envelope, auth, CRUD, bookings, **Stripe + PayPal (+ admin refund, partial or full)**, media, reviews/
  wishlist/enquiry/stats, seed + typed `@tourism/core` client, pg-boss outbox+cron.
  **+ blog Posts CRUD + admin bookings list/detail + next-departure availability + blog-v2 BE complete (post tags/related-tours/author · body-image register upsert · newsletter subscribe + admin subscribers list) + refund execution + cancellation-request queue (2026-07-05: admin refund accepts optional partial `amount` → `PARTIALLY_REFUNDED`/`refundedAmount`, idempotency-keyed provider call; new `CancellationRequest` model + customer `POST /bookings/:code/cancellation-request` + admin list/deny).** 338 api tests.
- **Design (P2) — done.** `@tourism/tokens` ("Emerald Heritage", no-hex) + `@tourism/ui`
  (shadcn/Base UI, 54 comps). Brand **"Nexora"** (NEX origami logo).
- **Web (P3 + P6) — complete, customer-facing live on Vercel.** Home · destinations overview · 3
  region pages (**tours+destinations wired to live data**) · tours listing (**+ free-text search**
  · **pagination 10/15/25** · **availability badge**) · tour detail · about · contact (**real
  enquiry → DB + interest dropdown from live categories**) · faq/privacy/terms · **auth
  (login/register/forgot/reset, Supabase)** · **account (dashboard · settings =
  profile+security+connected+delete · bookings list+detail+cancel/refund-request · saved tours)** ·
  **booking flow** (sectioned form ·
  Stripe/PayPal pay · **private-departure request** · checkout success/cancel · inline
  date-picker) · reviews (real DB) · **wishlist save-UI** (heart on tour-detail BookingBox,
  signed-in only; manage/un-save in account) · redesigned footer · **blog** (`/blog` index +
  article reader · tag/search filter chips · share row · prev/next · outline scrollspy +
  scroll-progress · "Updated on" stamp · `/blog/rss.xml` · **live footer newsletter signup**) ·
  **real booking-tied cancellation request** (2026-07-05, replaces the Enquiry hack;
  status-aware `BookingActions` — requested/denied/refunded/partially-refunded copy).
  **Component reform done** (Tier 1/2/3a: native forms → `@tourism/ui`; shared lead-form
  field baseline; dead-code swept). **Final polish pass MERGED** (`ca1cfd0`). **Web feedback
  layer** (2026-07-06, `feat/web-feedback-layer`): ported admin's toast + flash pattern
  (`<Toaster>`/`<FlashToaster>`/`lib/flash.ts`) into the root layout; migrated account
  settings (profile/email/password/avatar/delete), booking cancel + cancellation-request,
  contact/enquiry-family/newsletter, and the wishlist save/remove toggles to fire outcome
  toasts (field-level validation stays inline; lead-capture forms keep their success panel
  and toast only failures); standardized cancel-booking + delete-account confirms on
  `AlertDialog`; auth flows intentionally excluded. 185 web tests.
- **Admin (P4) — CRUD breadth done + DEPLOYED on Vercel.** Auth + shell + dashboard +
  CRUD (Destinations · Categories · Tours · Departures · Posts) + **blog-v2 authoring**
  (tag combobox · related-tours picker · inline body-image editor w/ Write|Preview) +
  **Subscribers list + CSV export** under Operations + **refund execution + cancellation-request
  queue** (2026-07-05: refund dialog partial-amount + proactive-refund safeguard, deny action +
  cancellation panel on booking detail, new `/cancellation-requests` queue page). UI polish
  deferred. 152 admin tests.
- **Real data wired:** home · destinations overview · **region-detail** · tours listing+detail ·
  enquiry · reviews · contact · **tour-card availability**. Only curated editorial imagery stays
  static (real `MediaAsset` pending admin upload).

### History (P0–P1.6 detail)

- **P0 / P0.6 / P0.8** — 9-project scaffold; module boundaries enforced
  (`@nx/enforce-module-boundaries`, scope+type); `@tourism/*` scope; donor
  conventions ported; AI cruft removed. pnpm `overrides`/`allowBuilds` live in
  **`pnpm-workspace.yaml`** (pnpm 11 ignores the package.json `pnpm` field).
- **P1.1** — fresh Prisma schema (9 enum / 15 model, EN-only, M:N, multi-gateway,
  FK/CHECK) + migration + **RLS** + PrismaService (PrismaPg) + Joi env. Migrated to
  a **live Supabase project** (`tourism-platform`, SG, ref `zxryyqhczgrbidjocwly`;
  creds in gitignored `apps/api/.env`). Donor "tour-booking" untouched (ADR-0001).
- **P1.2** — response envelope (`ApiResponse` → `@tourism/core`) + TransformInterceptor
  - HttpExceptionFilter + bootstrap (helmet/CORS/Swagger/Sentry/dotenv).
- **P1.3** — auth: SupabaseJwtGuard (jose JWKS) + RolesGuard + `@Public`/`@Roles`/
  `@CurrentUser` + `/auth/sync`, `/auth/admin/sync`, `/users/me` (global guards).
- **P1.4** — CRUD epic, all merged: **P1.4a** destinations · **P1.4b** tours +
  tour-categories (M:N `destinationSlugs[]`+`primaryDestinationSlug`, nested
  itinerary/FAQs/policies, slug refs) · **P1.4c** departures (nested under tour,
  seat/date guards). Pattern: public + admin controllers, `Promise.all` pagination
  (departures = arrays, bounded), slugify, `P2002→409` / `P2003→409`, class-validator
  DTOs, service unit tests, `/gate`, smoke.
- **P1.5** — bookings + payments, all merged: **P1.5a** bookings core (PENDING
  lifecycle, soft seat-check) · **P1.5b** Stripe (checkout + raw-body HMAC webhook +
  admin refund; **atomic seat-claim CTE** via `PaymentsService.claimSeatsForPaid`) ·
  **P1.5c** PayPal (Orders v2, capture-on-return + webhook backstop). **MoMo→PayPal
  pivot** (ADR-0006 amended — audience is inbound foreign tourists). Confirmation/refund
  emails deferred → P1.x.
- **P1.6** — media (Cloudinary signed direct upload): `lib/cloudinary-url`,
  `modules/{uploads,media}`, `POST /admin/uploads/signed-url`, `PUT /admin/{tours,
  destinations}/:slug/media` (replace-all), read-attach `media[]` on tour/destination
  reads. Reconcile/destroy job deferred → P1.x.
- **Tests:** 119 passing (api). CI green (lint·typecheck·test·build + CodeQL +
  GitGuardian). **Dependabot: 0 open** (js-yaml DoS resolved via `^4.2.0` override).
- **Gate:** `nx run-many -t lint typecheck test` + `build` green; mobile `build`
  is an Expo EAS cloud build (needs global `eas-cli`) → excluded from the local gate.

## Next steps (resume order)

1. **Final polish pass — DONE + MERGED** (`ca1cfd0`):
   - **a11y (WCAG 2.2 AA):** skip-link + single `<main>` landmark per page · full-opacity
     `:focus-visible` ring · contact form real labels + checkbox association · filter/sort/chip/
     pagination labelling · `aria-current` nav · `aria-hidden` on decorative icons · booking
     `aria-describedby` · checkout live region · avatar input `sr-only`.
   - **SEO:** `app/sitemap.ts` + `app/robots.ts` · root `metadataBase`/title-template/canonical/
     openGraph/twitter · Organization (TravelAgency) JSON-LD · tour-detail Product + BreadcrumbList
     JSON-LD + real canonical/OG (was a hardcoded title) · region BreadcrumbList. Base URL via
     `NEXT_PUBLIC_SITE_URL` → Vercel prod host → localhost (`src/lib/site.ts`).
   - **perf/motion:** global `prefers-reduced-motion` baseline (covers hover-zoom/card-lift) ·
     `fetchTourDetail` wrapped in React `cache()` (no double-fetch) · gallery + saved thumbnails →
     `next/image`. *(Fonts already variable → all weights; hero stays static for LCP.)*
   - *(Legal pages `/privacy` `/terms` `/cancellation-policy` = complete real-looking content,
     not lawyer-reviewed — fine for the demo.)*
2. **Then:** P4 admin UI polish · P5 mobile (teammate's lane). *(P6 blog reader + the whole
   blog-v2 roadmap — Waves 1–5, incl. inline body images, reader polish, newsletter + RSS —
   COMPLETE 2026-07-05.)*
   - **Fold into the admin-UI phase — DONE (2026-07-05):** refund **execution** UI — partial/amount refund (`refundByAdmin` accepts an `amount`; omitted/=total → full `REFUNDED`, `0 < amount < total` → `PARTIALLY_REFUNDED`) + a first-class **cancellation-request queue** (the PAID "Request cancellation" is now a real booking-tied `CancellationRequest`, not an Enquiry; admin resolves from `/cancellation-requests` via refund or deny). Customer-facing policy is already live at `/cancellation-policy`. See
     [spec](docs/06-specs/2026-07-04-refund-cancellation-queue-design.md) +
     [plan](docs/07-plans/2026-07-04-refund-cancellation-queue-plan.md).

*Done since last handoff (2026-07-06): **web feedback layer** (`feat/web-feedback-layer`,
`a8e5c7d`..`6a61972`): toast + flash infra ported from admin · outcome toasts across account
settings, booking cancel/cancellation-request, contact/enquiry/newsletter, wishlist toggles ·
`AlertDialog` on the two destructive confirms (cancel booking, delete account); awaiting merge.
Previously (2026-07-05): **blog-v2 roadmap complete** — Wave 3 Slice 2 admin
inline-image editor (`335a60f`) · Wave 4 reader polish (`b9b5158`) · Wave 5 newsletter + RSS
(`15c5cb4` BE w/ live migration + `a91909d` FE). **Refund execution + cancellation-request
queue complete** (2026-07-05, `b327dde`..`65acf64`): partial-refund CTE + idempotency key ·
customer cancellation-request endpoint (replaces Enquiry hack) · admin queue + deny + refund-dialog
partial amount. Baselines: api 338 · web 185 · admin 152.*

> **Domain-gated (deferred until a real domain is bought):** Resend email delivery
> (enquiry ack / booking confirm / refund) + Supabase custom-domain email confirmation.
> The DB rows + in-app flows work regardless; only the outbound emails wait on the domain.
>
> **Seats / inventory model (business logic):** seats are tracked **per `TourDeparture`**
> (`seatsTotal` + `seatsBooked`), **not** per tour. `seatsBooked` is incremented **only on
> PAID** (payment capture) via `PaymentsService.claimSeatsForPaid` — an atomic, conditional
> CTE (`+ seats WHERE booked + seats <= total`); creating a PENDING booking does **not**
> hold seats. Overbook race → auto-refund + cancel; admin refund releases seats back.
> Seats-left is shown on **tour detail** (BookingBox) + the **booking page** departure
> picker, but **not** on the listing/search grid (potential "few seats left" badge later).
>
> Live resume buffer: the roadmap-level **RESUME STATE** in
> [docs/07-plans/2026-07-03-blog-v2-roadmap.md](docs/07-plans/2026-07-03-blog-v2-roadmap.md)
> (the `.remember/` scratch dir referenced by older handoffs no longer exists).
> Per-phase 06-specs/plans: [`docs/06-specs/`](docs/06-specs/) + [`docs/07-plans/`](docs/07-plans/).

## Donor code worth porting (read, adapt — don't import across repos)

In `c:\develop\Apps\Main-Projects\tourism-be-api\apps\api\src\`:

- `common/guards/` SupabaseJwtGuard (JWKS + HS256), RolesGuard
- `common/interceptors/` TransformInterceptor (envelope), `common/filters/` HttpExceptionFilter
- `modules/payments/` Stripe webhook (raw-body + HMAC + idempotency), `stripe.service.ts`
- `config/` Joi env validation; `prisma/` PrismaPg adapter + pooler setup
- `modules/email/` Resend; `modules/media/` Cloudinary
- `prisma/schema.prisma` (reference the GOOD bones; redesign cleanly)
- Donor `docs/postman/` harness, `docs/05-runbooks/`, CI patterns.

## Working conventions (carry from donor)

- **Spec → plan → execute** for multi-step features (`docs/` specs+plans); **TDD on pure logic**; **English-only** (ADR-0005); **one feature = one branch**, confirm before merge.
- Run **`/gate`** before declaring green (lint+typecheck+test+build). For Nx: `pnpm nx run-many -t lint typecheck test build` (or affected).
- Windows: CRLF warnings on commit are harmless. pnpm 11 active; Node ≥ 22.

## Gotchas

- pnpm settings (overrides, allowBuilds) live in **`pnpm-workspace.yaml`**, not package.json.
- Nx 22 generators: two libs can't share a leaf name (e.g. `ui`) → pass `--name` (mobile/ui is `mobile-ui`).
- Nx generators run `pnpm install` internally — an un-approved build script blocks them (fixed via `allowBuilds`).
- `tsc --noEmit` includes `*.spec.ts`; `nest build` excludes them — run typecheck, not just build (donor CI lesson).
