<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

## CLAUDE.md — tourism-platform

Guidelines for any AI agent (or human) working in this repo. This is the map +
the rules; deep plan detail lives in [`HANDOFF.md`](HANDOFF.md) and
[`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

> **Source of truth wins.** When this file or any doc disagrees with the code
> (`apps/*/src`, `apps/api/prisma/schema.prisma`, the running Swagger spec), the
> code is right — fix the doc.

## What this is

**Nx 22 + pnpm** monorepo for a Lily-style tourism booking platform, with
**mobile from day one**. Greenfield rebuild of the frozen donor repo
`tourism-be-api` (read-only — port proven code, never modify it).

| Project | Path | Stack | Tags | Status |
| --- | --- | --- | --- | --- |
| `@tourism/api` | `apps/api` | NestJS 11 · Prisma · Supabase · Stripe + PayPal · Resend · pg-boss | `scope:api,type:app` | 🟢 **P1 complete + DEPLOYED** (P1.1–P1.8 + P1.x): schema+RLS, envelope, auth, CRUD, bookings, Stripe+PayPal, media, reviews/wishlist/enquiry/stats, seed+client+e2e, pg-boss jobs; **+ Posts CRUD + admin bookings list/detail + next-departure availability on tour summaries** + **blog-v2 BE** (post tags/related-tours/author on `PostDto` · body-image endpoint `MediaRole.body`, race-free upsert register + GC-on-delete · **newsletter**: `Subscriber` model + public throttled subscribe w/ silent dedupe + admin list) + **refund execution + cancellation-request queue** (admin refund accepts optional partial `amount` → `PARTIALLY_REFUNDED`/`refundedAmount`, idempotency-keyed provider call; new `CancellationRequest` model + `POST /bookings/:code/cancellation-request` + admin list/deny) (~99% of P4 admin scope) + **public `GET /reviews/summary`** (site-wide approved-review count + average rating, feeds the web home-trust-band — merged 2026-07-10) + **site-media / Appearance BE (2026-07-10)**: `SiteMediaSlot` model (9 seeded brand-chrome slots) + `MediaOwnerType.SITE` — slot images live in `media_assets` via the shared `MediaService` (Library-visible, GC-protected); public `GET /site-media` + admin `GET/PUT /admin/site-media/:key/media` (kind-validated: single=1 hero · gallery≤8 · images only · empty=reset) + `UploadPurpose.SITE_CHROME` + **reviews/enquiry CRM BE (wave B2, 2026-07-11)**: PATCH edit-curated (null clears) · reviews admin list source/rating/search + user/booking joins · `EnquiryNote` thread + repeat-lead counts (+email index) · shared `ToBoolean()` strict query-bool transform (coercion bugfix) · RLS backfill + **wave C BE (2026-07-11)**: bookings `statusCounts` · Post SEO columns + explicit/nullable `publishedAt` scheduling · subscriber/outbox DELETE (atomic, drain-tolerant) · `GET /admin/payment-events` (386 tests) + **media-library D1 BE (2026-07-11)**: ref-safe media GC (guarded enqueue + destroy backstop + re-attach defuse) · `MediaAsset.alt` + PATCH · bulk-delete · `MEDIA_ROLE_CONFLICT` 400 (402 tests) + **wave D2 BE (2026-07-12)**: dashboard stats `?from&to` (UTC day bounds, no-arg output unchanged) + **per-currency aggregation** (dominant = most PAID bookings; `revenueByCurrency` · top-tours grouped by tour+currency · trend revenue = dominant only, no FX/cross-sums) · **last-admin demote race FIXED** — single-statement locking-CTE claim (`FOR UPDATE` all admin rows + count in one autocommit statement, pooler-safe; adversarially verified) + role-conditional `deleteUser` closes the promote→demote→delete bypass (439 tests). Live on **Render** (`/health` + cron-job.org keep-alive). |
| `@tourism/web` | `apps/web` | Next.js 16 · React | `scope:web,type:app` | 🟢 **P3 + P6 DONE + DEPLOYED** — **brand "Nexora"** · redesigned navbar · home · destinations (overview + 3 region pages) · `/faq` `/privacy` `/terms` · about · **contact** (Contact-01 form → DB · interest dropdown from live categories · map) · **tours (listing + free-text search + pagination + availability badge + detail)** · **auth** (login/register/forgot/reset, Supabase) · **account** (dashboard · settings · bookings + **booking detail/cancel/refund-request** · saved) · **booking flow** (Stripe/PayPal + private-departure request + checkout pages + inline date-picker) · reviews (real DB) · **wishlist save-UI** (heart on detail · manage in account) · **component reform done** (forms → `@tourism/ui`). **Real data WIRED** (home · `/destinations` · region-detail · `/tours` · detail · enquiry · reviews · contact · wishlist · bookings · **blog**). **Polish pass DONE** (a11y WCAG 2.2 AA · SEO sitemap/robots/JSON-LD/OG · perf/motion). **P6 blog reader DONE** (2026-07-03): `/blog` magazine index + pagination · `/blog/[slug]` markdown article (reading time · outline rail · more-posts) · home teaser real data · Journal nav/footer/sitemap · **blog-v2 reader funnel** (`?tag=`/`?q=` filter chips · tag chips on cards + article header · related-by-tag "more posts") · **blog-v2 wave-4 reader polish** (prev/next nav · share row · outline scrollspy + scroll-progress · "Updated on" stamp · outline-anchor fix) · **blog-v2 wave-5** (live footer newsletter signup · `/blog/rss.xml`) · **real booking-tied cancellation request** (replaces the Enquiry hack; status-aware `BookingActions` — requested/denied/refunded/partially-refunded copy) · **web feedback layer** (toast + flash infra ported from admin — `<Toaster>`/`<FlashToaster>`/`lib/flash.ts` — success/error toasts on account settings, booking cancel/cancellation-request, contact/enquiry/newsletter, wishlist toggle; the two destructive confirms — cancel PENDING booking, delete account — standardized on `AlertDialog`; auth flows excluded; 185 tests) · **real content authoring** (region-page hero/gallery/signature + `/destinations` overview editorial gallery now derive from `Destination.media[]` via `lib/region-imagery.ts` — all-real-or-fixture, `lib/regions.ts` fixtures = fallback; `selectRegionBookables` threads `gallery` through; 48 destination + 23 tour + 10 post real Unsplash images authored in `prisma/fixtures/gen.cjs` (the single source → `sample-data.ts` + `json/`, which the seed loader reads) + synced to live `media_assets`) · **home trust band — MERGED + redesigned as an editorial inline strip (2026-07-10)**: on home + About, replaces the coloured "Built with" tech-stack marquee (retired `tech-cloud.tsx` + `built-with.tsx`, no more `cdn.simpleicons.org`); after user feedback the first floating-card design was reworked the same day (`feat/trust-band-editorial`) — content between two hairlines, eyebrow + serif heading (`messages.trustBand.heading`) left, real live stats (curated tours · destinations · average rating from `GET /reviews/summary`) with vertical dividers + scroll count-up (reused `MetricValue`/`NumberTicker`) right, and the 5 **self-hosted** payment marks (`apps/web/public/logos/pay/`) as a static centered row + security caption (`payment-row.tsx` replaced `payment-marquee.tsx`, killing the broken edge-fade white boxes). Contact's old "Built with" `TechMarquee` was swapped for the same `PaymentRow` (`align="start"`, "Secure payments" label) the same day — `tech-marquee.tsx` + `marquee.tsx` deleted, no external logo CDN left anywhere. · **form-validation sweep (2026-07-10, user rule: NO native HTML validation)** — every user-input form is `noValidate` + `aria-required` (no bare `required` left); per-field error codes from shared TDD'd validators (`lib/forms/validate.ts` generic base, re-exported by `lib/auth/validate.ts`) render via `FieldErrorText`/`AuthFieldError` (over `@tourism/ui` `FieldError`) with `aria-invalid`/`-describedby`, copy in `messages.fieldErrors` + `messages.auth.fieldErrors`; register (`signUp`) + booking (`createAndCheckout`) validate **server-side** and return `fieldErrors` (money-path `buildCreateBookingPayload` untouched as backstop; adversarial review clean); real BE errors (Supabase/API/429) keep their toasts/alerts; auth shell also swapped its placeholder "NEX" spans for the shared brand `Logo` (white `--nx-tone` pin); dead `isValidEnquiry` / `EnquiryStatus`-'invalid' / `auth.passwordErrors` removed. · **brand-chrome now admin-managed (site-media, 2026-07-10)** — the 9 chrome slots (home hero/experiences/why-choose/trust · CTA band · content hero · destinations hero · auth panel · About-story gallery) resolve via `getSiteMedia()` (ISR 300s, `{}` on error) + TDD'd `siteImage`/`siteGallery` (`lib/site-media.ts`), previous hardcoded images kept as per-slot `DEFAULT_*` fallbacks — empty slot/failed fetch = exactly the old visuals. 231 tests) · **media alt preferred at render (wave D1, 2026-07-11)** — 8 render sites prefer `media.alt ?? <synthesized alt>` (232 tests) → **P3+P6 web complete, blog-v2 COMPLETE** |
| `@tourism/admin` | `apps/admin` | Next.js 16 | `scope:admin,type:app` | 🟢 **P4 CRUD done + DEPLOYED** — auth + shell + dashboard + **CRUD: Destinations · Categories · Tours · Departures · Posts** (Server Components + Server Actions) · **blog-v2 admin: post tag combobox (create inline) + related-tours picker + inline body-image editor** (insert-image button → Cloudinary → `body` asset · Write\|Preview toggle · `/media` `body` facet) · **Subscribers list + CSV export under Operations** (146 tests). · **UI parity pass done** (outbox + dashboard table on the shared table stack; 149 tests) · **refund execution + cancellation-request queue**: refund dialog supports a **partial amount** + a proactive-refund safeguard (warning + required confirm checkbox), deny action + "Cancellation requested" panel on booking detail, new `/cancellation-requests` queue page under Operations, `bookingStatusMeta` handles `PARTIALLY_REFUNDED` · **form-validation sweep (2026-07-10, user rule: NO native HTML validation)** — all 6 CRUD forms + login are `noValidate` + `aria-required` (the zod-per-field server validation they always had now actually surfaces, incl. the required tour selects); sign-in validates per-field server-side via TDD'd `lib/auth/validate.ts` · **motion layer (2026-07-10, spec+plan in docs)** — subtle enterprise motion on `motion` v12: `components/motion/` primitives (`Reveal`/`Stagger` on `whileInView`, reduced-motion safe) · **13 `loading.tsx` skeletons** (`TableSkeleton`/`DashboardSkeleton`; dashboard moved into its own `(dashboard)` route group so its skeleton doesn't leak to detail routes) · KPI count-up via `NumberTicker` (TDD'd `currencyAffixes` keeps the final frame byte-equal to SSR) · 150ms route-fade `template.tsx` · sliding `layoutId` sidebar pill · reveals on the shared list header/table shell (forms stay static) · new `jest.setup.ts` enables RTL component tests · **Appearance page (2026-07-10)** — brand-chrome slot manager under Catalog (`/appearance`): per-slot preview + Managed/Default badge, Replace/Add via direct Cloudinary upload (`SITE_CHROME`), confirm-gated Reset; gallery uploads client-capped at 8 + keep partial successes (adversarial-review fix — a rejected PUT can never strand untracked Cloudinary assets) · **list-table upgrade (2026-07-11, debt wave B1)** — column sorting on the 5 client-mode tables + dashboard (shared sortable headers in `AdminTableShell`, opt-in via `accessorFn`, `aria-sort`) · column visibility persisted per table (TDD `lib/table-prefs.ts` + `usePersistentColumnVisibility`, 11 tables) · Tours destination/featured filters (TDD `lib/tours/filter.ts`) · Bookings tour/departure URL filters + removable chips (`parseUuidParam`) · Departures **Upcoming·Past·All** time facet (TDD `matchesTimeTab`, default Upcoming, status counts within the window) · shared `FacetFilter` (review fix: dashboard had inert sort buttons — now sorts for real) (192 tests) · **reviews + enquiry CRM (wave B2, 2026-07-11)** — reviews server-paginated w/ facets + edit-curated page + customer/booking drawer links; enquiries notes thread + repeat-lead badges · **wave C (2026-07-11)** — booking price-breakdown card + tab count badges · post SEO + schedule UI (browser-TZ ISO) · self-profile card · subscriber remove + outbox delete · `/payment-events` viewer (213 tests) · **media library upgrade (wave D1, 2026-07-11)** — "Choose from library" reuse picker in MediaField · alt editor in the drawer · tile selection + bulk delete · SITE facet (224 tests) · **wave D2 (2026-07-12, `f131b30`)** — shared **`TabPills`** (`components/crud/tab-pills.tsx`, button + RSC-safe `<Link>` variants; all 13 copy-pasted tablists across 11 files migrated byte-identically, −275 dup lines; post-form Write\|Preview stays hand-rolled) · **dashboard date-range** (preset pills + custom `Calendar` range popover → URL `?from&to`; TDD `lib/dashboard/date-range.ts`; hydration-safe mounted-gate `today`) · per-currency render (extra-currency KPI footnote · per-row top-tours currency · AOV = dominant-currency revenue ÷ dominant-currency paid count) (260 tests) — **P4 complete**. Live on **Vercel**. |
| `@tourism/mobile` | `apps/mobile` | Expo SDK 54 / RN | `scope:mobile,type:app` | 🟢 **P5 COMPLETE — W1→W4 all merged (W4 booking 2026-07-08)** — expo-router 4-tab shell · env-switchable `@tourism/core` client + TanStack Query · **W2 browse & detail**: real Explore tab (instant client-side search/filter/sort via core helpers · destination + facet chips · 4 data states) · tour-detail at web parity (gallery pager · seats-left · accordions · reviews · sticky Inquire CTA) · enquiry bottom-modal (validated, 429-aware) · **three-layer background theming** (Stack `contentStyle` + Tabs `sceneStyle` + nav `ThemeProvider` + `expo-system-ui` — kills the transition white-flash) · **W2.5 design language**: **Fraunces + Geist** splash-gated fonts · **Home rebuilt** (full-bleed hero + scrim + search pill → Explore autofocus · featured · destinations rail → pre-filtered Explore · why-strip · CTA band) · web-parity TourCard (badge overlay · icon meta · ★ rating · compare-at · **locked equal-height rows**) · tab bar filled active icons · **W3 auth & account**: **guest-first Supabase auth** (official Expo pattern: AsyncStorage session + AppState auto-refresh; typed client gets `getToken`; `/auth/sync` after sign-in) · 3 auth modals (sign-in/up/forgot) · **wishlist** (`useWishlist` optimistic toggle + `HeartButton` on cards/detail; guest tap → sign-in w/ reason) · **Saved tab** (AuthGate + saved list w/ instant remove) · **Account tab** (profile · edit name `PATCH /users/me` · web legal links · sign out). **W4 booking (final wave)**: full money path, zero BE changes — web logic ported **verbatim** (`booking-form.ts` · `price.ts` · departure/VM mappers, TDD) · booking form `tours/[slug]/book` (departure picker w/ seats-left · steppers capped by seats · profile prefill · Stripe/PayPal cards · live total; Book now CTA gates known guests only) · hosted checkout via **`expo-web-browser`** + **self-verifying result screen** (refetch + idempotent PayPal capture-on-return; **Android's `openBrowserAsync` resolves immediately → verify on AppState return-to-foreground**) · bookings list + detail in Account (Pay now · cancel PENDING via `Alert.alert` · cancellation-request PAID · refund states) · Badge +`muted`/`destructive` tones. **Adversarial money-path review done, 13 findings fixed** (AppState verify · no duplicate PENDING on checkout failure · `['bookings']` cache cleared on sign-out · terminal statuses never payable · 401 sync retry · `formatMoney`/`FactRow` shared). `mobile:build` = **`expo export`** (overrides inferred `eas build`). **UI direction LOCKED: "Brand 100% + Structure native"** (no navbar/hamburger/footer; "Browse by experience" = backlog). W1–W3 verified on-device (Expo Go, Android); ⚠️ **W4 on-device payment pass deferred** (Stripe test card · PayPal sandbox · abandon→Pay now · cancel/cancellation-request · guest gating). **P5.5 app-native UX pass COMPLETE** (umbrella spec 2026-07-08; locked: 5 tabs w/ Trips · Home search-first · stepped booking · N1→N2→N3): **N1 "Feel" merged** — native stack headers (Fraunces) · Android ripple everywhere (opacity = iOS-only) · haptics (heart/success/destructive) · reanimated motion (accordion · skeleton crossfade · success zoom; jest = hand-rolled minimal mock, reanimated's own /mock pulls worklets) · image fade-in · autofill/return-key/KeyboardAvoidingView/selectable code. **N2 "Patterns" merged** — `AppSheet` bottom-sheet wrapper (`@gorhom/bottom-sheet` 5.2.14, scrollable + keyboard-safe) · Explore **filter sheet** (draft + live "Show N results") · **stepped booking Airbnb-style** (DepartureSheet → contact → payment; `BookingDraft` context resets on SIGNED_OUT, guards vs stale drafts; money pipeline byte-identical, adversarial re-review 5 findings fixed) · enquiry → sheet · show-all sub-screens (itinerary/FAQs/reviews). Gotcha: `require('@tourism/mobile-ui')` in a jest.mock factory = lazy-load → module-boundaries bans all static imports (mocks use plain RN Text). **N3 "IA & Home" merged (2026-07-09)** — **5 tabs** (bookings list → dedicated **Trips** tab, `briefcase`; booking detail stays a stack screen; Account keeps a Trips link) · **task-first Home** (greeting time-of-day+name · search pill → Explore autofocus · signed-in next-trip card + recently-saved rail · featured + destinations shelves; **dropped** hero/why-strip/CTA band) · pure helpers `selectUpcomingTrip`/`timeGreetingKey`/`firstName` + additive `BookingVm.departureDate` (TDD, adding a required VM field broke 3 fixtures at typecheck — jest didn't catch it) · reference step in-session (Airbnb/Booking.com/GetYourGuide; user-confirmed layout A + time-of-day greeting) · adversarial review clean. **P5.5 feature work COMPLETE.** ⚠️ Combined device pass still owed (N3 + N2 + N1 + W4 checklists). Dev loop: `pnpm exec expo start` from `apps/mobile` (via nx = non-interactive, no QR); react pinned **19.1.0** workspace-wide (SDK 54). **153 tests**. |
| `@tourism/core` | `libs/shared/core` | types · API client · zod · domain logic | `scope:shared,type:data-access` | 🟢 typed OpenAPI client (P1.8) + destination helpers (region grouping/slug) + **tours filter taxonomy/`filterTours`/`sortTours` (TDD)** |
| `@tourism/tokens` | `libs/shared/tokens` | design tokens → web CSS vars + RN theme | `scope:shared,type:ui` | 🟢 **P2 done** — Style Dictionary, brand "Emerald Heritage", no-hex enforced. **+ RN hex theme (P5 W1)**: `@tourism/tokens/theme` emits hex colors (oklch→hex via culori) + dp radius + `theme.d.ts` |
| `@tourism/i18n` | `libs/shared/i18n` | EN copy catalog (EN-only) | `scope:shared,type:util` | 🟢 populated (all web surfaces read from here) |
| `@tourism/ui` | `libs/web/ui` | web design system (React) | `scope:web,type:ui` | 🟢 **P2 done** — shadcn (Base UI `base-nova`), 54 components |
| `@tourism/mobile-ui` | `libs/mobile/ui` | mobile design system (RN) | `scope:mobile,type:ui` | 🟢 **founded (P5 W1) + W2/W2.5/W4 additions** — ThemeProvider/`useTheme` over `@tourism/tokens/theme` (RN hex, follows OS dark mode) + **brand typography** (Fraunces headings · Geist body via `fontFamily` per variant + `theme.fontFamilies`; no `fontWeight` with custom fonts on Android) + AppText · Screen (hides scroll indicators by default) · Spinner · Button · Card (resting shadow) · TextField (`leading` slot) · Chip · Accordion · **Badge (web tone map + W4 `muted`/`destructive` tones — destructive text = the primary pair, no `destructive-foreground` token exists) · Skeleton (pulse)**. **P5.5 N1**: `android_ripple` on Button/Chip/Accordion (pressed-opacity = iOS-only) · Accordion animates (reanimated layout transition; peer+dev dep `react-native-reanimated`) · Card `boxShadow` + `borderCurve` · TextField `forwardRef` (focus chaining). **P5.5 N2**: **`AppSheet`** (themed `@gorhom/bottom-sheet` modal wrapper — dynamic sizing, `scrollable` → BottomSheetScrollView, keyboard `extend`/`adjustResize`, backdrop tap-to-close; + `AppSheetScrollView`/`AppSheetTextInput` re-exports; peer+dev dep `@gorhom/bottom-sheet`). 34 tests. |

- Auth is **Supabase** (the API verifies the JWT and mirrors users locally) —
  do **not** rewrite to self-managed auth.
- **Module boundaries are enforced** in `eslint.config.mjs` via
  `@nx/enforce-module-boundaries` (BLUEPRINT §3). A bad cross-scope/cross-type
  import **fails lint**, not just review.

## How we work (standing conventions)

Non-negotiable unless the user says otherwise in the moment.

1. **One feature = one branch.** Never commit feature work directly to `main`.
   Branch → implement → **the user reviews** → merge → delete branch. Small
   docs/meta fixes may go straight to `main`. **Enforced on GitHub:** a ruleset
   on `main` requires a **PR + 1 approval** (+ blocks force-push/deletion);
   **repo admins (owner) bypass**, so non-owner contributors must branch + PR.
2. **Ask before starting a new feature/phase**, and **confirm before any
   merge/push/branch-delete**.
3. **Spec → plan → execute.** For multi-step features: write a design spec +
   implementation plan under `docs/` first, then execute task-by-task (TDD on
   pure logic), then review, then e2e.
4. **TDD on logic.** Test-first for pure functions / helpers / server actions;
   target ≥80% on new logic. Visual/layout is covered by e2e.
5. **Frontend = layout-first, theme tokens only.** No hex colors — use
   `@tourism/tokens`. **Reuse `@tourism/ui` first** before building new.
6. **English-only** (ADR-0005). User-facing copy is centralized in
   `@tourism/i18n` (EN-only scaffold); no VI / parity check. Schema is
   single-language (no `*_vi`).
7. **Run `/gate` before declaring green** (lint + typecheck + test + build).
8. **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`). No AI attribution (disabled globally).
9. **Docs sweep after EVERY feature merge** (user rule 2026-07-05 — never skip): the
   feature plan's STATUS · `docs/roadmap.md` phase row · this file's project table ·
   `HANDOFF.md` current-state/next-action, **plus** any reference doc the feature
   invalidated: `docs/03-reference/functions-*.md` when endpoints changed ·
   `docs/01-architecture/data-model.md` when the schema changed · `backend.md`/
   `frontend.md` when modules/routes changed. Test-count baselines everywhere they
   appear. (The 2026-07-05 audit found catalogs/architecture docs silently stale —
   that class of drift is what this rule prevents.)

## Commands (from repo root)

```bash
pnpm install
pnpm nx run-many -t lint typecheck test build   # whole workspace
pnpm nx affected -t lint typecheck test build   # only what changed
pnpm nx lint @tourism/api                        # one project
pnpm nx graph                                    # project graph
```

- Node ≥ 22, **pnpm 11** (`corepack enable`). Backend env: `apps/api/.env`.

## Layout

```text
apps/   api (NestJS) · web + admin (Next.js) · mobile (Expo)
libs/   shared/{core,tokens,i18n} · web/ui · mobile/ui
docs/   README.md (index + reading path) · BLUEPRINT.md · roadmap.md
        01-architecture/ · 02-decisions/ (ADRs) · 03-reference/ · 04-guides/ · 05-runbooks/ · 06-specs/ · 07-plans/
```

## Gotchas (load-bearing, non-obvious)

- **pnpm 11 reads `overrides` + `allowBuilds` from `pnpm-workspace.yaml`, NOT
  `package.json`** (`pnpm.overrides` there is ignored with a warning). Gotcha:
  editing `overrides` alone often does **not** re-resolve — also touch
  `package.json` or delete the lockfile to force it (verified 2026-06-15).
- **Nx generators run `pnpm install` internally** — an un-approved build script
  blocks them (governed by `allowBuilds` in `pnpm-workspace.yaml`).
- **Two libs can't share a leaf name** (e.g. `ui`) → mobile's lib is the Nx
  project `mobile-ui` (package `@tourism/mobile-ui`).
- **`tsc --noEmit` includes `*.spec.ts`; `nest build` excludes them** — run
  `typecheck`, not just `build` (donor CI lesson).
- **Prisma needs a driver adapter** (`PrismaPg`); the Supabase transaction
  pooler (`connection_limit=1`) can't start a batch `$transaction` under
  concurrency — use `Promise.all` for parallel reads. *(applies once P1 lands)*
- **Next.js 16 / Expo SDK 54 are not in training data** — read live docs before
  writing routing/RSC/native code.
- Windows: CRLF warnings on commit are harmless.

## AI infra in this repo

- `.claude/commands/` — project slash commands: `/gate` (quality gate),
  `/seed` (test data — P1), `/regen-types` (FE OpenAPI client after a BE DTO
  change — P1), `/new-feature <desc>` (kick off spec→plan→execute).
- Session handoff lives in the roadmap plans' **STATUS / RESUME STATE** blocks under
  `docs/07-plans/` (the old `.remember/` dir is gone).

### Skill conventions (standing, agreed with the user 2026-07-05)

Situation → skill to invoke BEFORE acting (plugin skills installed in Claude Code):

| Situation | Skill |
| --- | --- |
| New feature/phase with **no spec yet** | `superpowers:brainstorming` → then `/new-feature` (spec → plan) |
| A written plan exists in `docs/07-plans/` | `superpowers:executing-plans` (follow it task-by-task, raise concerns first) |
| Implementing any pure logic | `superpowers:test-driven-development` — failing spec first, red → green per task |
| A real bug / failing test / unexpected behavior | `superpowers:systematic-debugging` before proposing fixes |
| Touching post-training APIs (Next.js 16 · Expo SDK 54 · Prisma 7) or any unfamiliar library | `context7` live-docs lookup first — never write from memory |
| Declaring a slice green | `/gate` (lint + typecheck + test + build) |
| After any BE response-DTO change | `/regen-types` |
| Broad multi-file searching/auditing | fan out `Explore` subagents (don't grind through files inline) |
| Repo overview / onboarding a teammate (on request) | `understand-anything` (`/understand`, `/understand-onboard`) |

Merge flow stays as "How we work" #1–2: user reviews source → rebase + `--ff-only`.
These are defaults, not ceremony — skip only when the user explicitly says so.

### Model routing for subagents (standing, agreed 2026-07-05)

Match the subagent's model to the task — don't spend a frontier model on mechanical work:

| Task type | Model |
| --- | --- |
| Transcribing code from a plan's ready snippets · mechanical docs sweeps · bulk renames | `haiku` — ALWAYS instruct "do not reformat lines the task doesn't name" (known haiku gotcha; it also can't type `\uXXXX` escapes — script those) |
| Ordinary implementation tasks from a written plan · tests from a written spec · medium Explore sweeps | `sonnet` |
| Writing specs/plans · adversarial review (ALWAYS for money-path/payments/migrations) · hard debugging | `opus`/`fable` (strong tier) |
| Main-loop orchestration, decisions, merge gates | the session model |

Every dispatch carries the repo constraints (straight quotes · no unrelated-line
reformatting · Conventional Commits · TDD on pure logic).
