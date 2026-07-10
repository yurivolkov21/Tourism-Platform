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

## Current state — P1 + P2 DONE · P3 web DONE · P4 admin CRUD DONE · P6 + blog-v2 COMPLETE (all 5 waves, 2026-07-05) · **refund execution + cancellation-request queue COMPLETE + DEPLOYED (2026-07-05)** · **web feedback layer (toast + AlertDialog) COMPLETE + DEPLOYED (2026-07-06)** · **real content authoring (region/overview imagery from `Destination.media[]` + real seeded images, live media synced) COMPLETE (2026-07-06)** · **P5 mobile COMPLETE — W1→W4 all merged (W4 Booking 2026-07-08)** · **P5.5 app-native UX pass COMPLETE — N1 Feel + N2 Patterns (2026-07-08) + N3 IA & Home (2026-07-09) all merged; combined on-device pass still owed** · **home trust band — MERGED + redesigned as an editorial inline strip (2026-07-10)** · **DEPLOYED** (`main` — web/admin/api; mobile = Expo Go dev loop, no store build yet)

> **Next action: the combined on-device pass** (Expo Go, Android) — P5.5
> feature work is done; the one owed item is a single device session covering
> **N3** (5 tabs render · Trips tab list + auth gate · Home guest vs
> signed-in: greeting by time of day · next-trip card → detail · saved rail ·
> See all → Saved · search pill → Explore autofocus · Account "My bookings" →
> Trips) **+** the still-owed **N2** (filter sheet · stepped booking on Stripe
> + PayPal · enquiry sheet · show-all screens), **N1** (ripple · haptics ·
> Fraunces headers · image fade-in · autofill) and **W4 payment loop**
> checklists. Also pending: the user's visual review of the redesigned
> trust band on the deployed home. After that, pick the next phase with the user
> (mobile backlog: "Browse by experience" · dark-mode splash/adaptive-icon
> assets · in-app theme toggle · encrypted LargeSecureStore; web backlog:
> bring Contact's "trusted by" strip onto `TrustBand` for consistency — it
> still renders the old `TechMarquee`; or an admin-managed brand-chrome media
> model; or store builds via EAS).
>
> **Home trust band — MERGED + redesigned (2026-07-10):** the original
> `feat/home-trust-band` (real live stats from `GET /api/v1/reviews/summary` +
> self-hosted payment marks, retired `tech-cloud.tsx`/`built-with.tsx` and the
> `cdn.simpleicons.org` dependency) landed on `main`, then the card design was
> **replaced the same day** by `feat/trust-band-editorial` after user feedback
> (the floating emerald card read as an unfinished placeholder, and the
> marquee's edge fades painted opaque white boxes over the logos — a real
> rendering bug): now an **editorial inline strip** on home + About — content
> between two hairlines, eyebrow + one-line serif heading left, live stats
> with vertical dividers + scroll-triggered count-up (reused
> `MetricValue`/`NumberTicker`) right, and the 5 payment marks as a **static
> centered row** (`payment-row.tsx` replaces `payment-marquee.tsx`; no more
> marquee/fades). New i18n key `messages.trustBand.heading`. Spec:
> `docs/06-specs/2026-07-10-trust-band-editorial-redesign.md`.
> **Consistency follow-up (not done):** `apps/web/src/components/marketing/
> contact-inquiry.tsx` still renders the **old** `TechMarquee` "trusted by"
> strip on `/contact` — `tech-marquee.tsx` was intentionally kept because
> Contact still consumes it; home/About vs Contact is now visually
> inconsistent until that's addressed. Baselines: api 340 · web 197. Plans:
> `docs/07-plans/2026-07-10-home-trust-band.md` + the 06-specs doc above.
>
> **P5.5 N3 "IA & Home" COMPLETE (2026-07-09, branch
> `feat/mobile-n3-ia-home`, merged ff-only):** **5 tabs** — bookings list
> moved out of Account into a dedicated **Trips** tab (`briefcase`; booking
> detail `/bookings/[code]` stays a stack screen; Account keeps a Trips link)
> · **task-first Home rebuild** — greeting (time-of-day + first name) +
> prominent search pill → Explore autofocus · signed-in context rows
> (next-trip card `selectUpcomingTrip` → booking detail · recently-saved rail
> → Saved) · featured + destinations shelves; **dropped** the full-bleed
> hero, why-strip and CTA band · pure helpers
> `selectUpcomingTrip`/`timeGreetingKey`/`firstName` + additive
> `BookingVm.departureDate` (TDD). Reference step done in-session
> (Airbnb/Booking.com/GetYourGuide task-first pattern; user-confirmed layout A
> + time-of-day greeting). Gotcha: adding a **required** VM field
> (`departureDate`) broke three existing `BookingVm` literals at `tsc`
> (jest/ts-jest doesn't enforce missing props) → run `nx typecheck` before
> committing a VM change. Adversarial review (money-path-adjacent): 0
> findings. Baselines: api 338 · web 191 · admin 152 · **mobile 153 ·
> mobile-ui 34**. Umbrella spec:
> `docs/06-specs/2026-07-08-p55-mobile-native-ux-design.md`; plan:
> `docs/07-plans/2026-07-09-p55-mobile-n3-ia-home-plan.md`.
>
> **P5.5 N2 "Patterns" COMPLETE (2026-07-08, branch
> `feat/mobile-n2-patterns`, merged ff-only):** `AppSheet` themed
> bottom-sheet wrapper in `@tourism/mobile-ui` (`@gorhom/bottom-sheet`
> 5.2.14 — verified bundling with reanimated 4; `scrollable` +
> keyboard-safe; jest mock renders children in plain Views, dismiss fires
> onDismiss) + root GestureHandlerRootView/BottomSheetModalProvider ·
> **Explore filter sheet** (draft state + live "Show N results" +
> `countActiveFilters` TDD) · **stepped booking** (Book now →
> DepartureSheet → contact step → payment step; `BookingDraft` context —
> fresh per trip, resets on SIGNED_OUT, guards redirect stale/foreign
> drafts; money pipeline byte-identical) · **enquiry → sheet** ·
> **show-all sub-screens** (itinerary/FAQs/reviews). Adversarial re-review:
> 5 findings fixed (sheet clipping/keyboard · draft PII on sign-out · seats
> re-clamp · Edit-trip reseed). Gotchas: `require('@tourism/mobile-ui')`
> inside a jest.mock factory = lazy-load → module-boundaries bans all
> static imports (mocks use plain RN Text); orphaned nx processes deadlock
> `.nx/workspace-data` → kill before new runs; the user runs gate checks
> manually. Baselines: api 338 · web 191 · admin 152 · **mobile 139 ·
> mobile-ui 34**.
>
> **P5.5 N1 "Feel" COMPLETE (2026-07-08, branch `feat/mobile-n1-feel`,
> merged ff-only):** native stack headers (Fraunces `headerTitleStyle`; 3
> hand-rolled headers removed) · Android **ripple** on every pressable
> (pressed-opacity gated to iOS) · **haptics** (heart · booking success ·
> destructive confirm) · **reanimated motion** (accordion layout transition ·
> skeleton→content crossfade ×5 · success ZoomIn) · image `transition`
> fade-in + tinted placeholders · Card `boxShadow`+`borderCurve` · forms
> (autofill hints · return-key chaining via TextField forwardRef ·
> KeyboardAvoidingView on the booking form · selectable booking code).
> Jest gotchas: reanimated 4's own /mock pulls react-native-worklets →
> hand-rolled minimal mock in BOTH test-setups + transform allowlist +
> mobile-ui peer dep; `expo install` re-resolution duped react 19.2.7 in
> `.pnpm` → `pnpm dedupe` (lockfile stayed clean). Tests unchanged:
> mobile 126 · mobile-ui 33.
>
> ⚠️ **Device passes owed (combined, not yet reported by the user):**
> **N2** — filter sheet (draft/apply/clear · keyboard) · full stepped
> booking loop · Edit-trip reseed · enquiry sheet · show-all screens ·
> many-departure tour scrolls inside the sheet; **N1** — ripple · haptics ·
> Fraunces headers + back gesture · image fade-in · autofill; **W4 payment
> loop** — Stripe test-card · PayPal sandbox (capture-on-return; close the
> tab early on purpose) · abandon → "Pay now" rescue · cancel PENDING ·
> cancellation-request PAID (admin queue) · guest gating on Book now.
>
> **P5 mobile W4 Booking COMPLETE (2026-07-08, branch
> `feat/mobile-w4-booking`, merged ff-only):** full money path, zero BE
> changes — web pure logic ported **verbatim** (`booking-form.ts` payload
> builder · `price.ts` totals · departure/status/VM mappers, TDD) · booking
> form `tours/[slug]/book` (departure picker w/ seats-left + sold-out ·
> steppers capped by seats · profile prefill · Stripe/PayPal radio cards ·
> live total) · hosted checkout via **`expo-web-browser`** + self-verifying
> result screen (refetch + idempotent PayPal capture-on-return) · bookings
> list/detail in Account (Pay now · cancel PENDING via `Alert.alert` ·
> cancellation-request w/ reason · refund states). **Adversarial money-path
> review: 13 findings fixed** — the big one: **Android's `openBrowserAsync`
> resolves immediately (`{type:'opened'}`), so verify runs on AppState
> return-to-foreground** (iOS: on promise resolve); plus no-duplicate-PENDING
> on checkout failure (navigate to result → Pay now), `['bookings']` cache
> cleared on sign-out (cross-account PII), terminal statuses never payable,
> plain-401 sync retry (web parity), destructive Badge text via the primary
> pair (no `destructive-foreground` token exists). Gate fixes: `mobile:build`
> → **`expo export`** (overrides the inferred, unusable `eas build`) · api
> jest `testTimeout: 20000` (parallel-run flake). Baselines: api 338 ·
> web 191 · admin 152 · **mobile 126 · mobile-ui 33**.
>
> Previously: **P5 mobile W3 Auth & Account COMPLETE
> (2026-07-07, branch `feat/mobile-w3-auth-account`, merged ff-only):**
> **guest-first Supabase auth** — `@supabase/supabase-js` on the official Expo
> pattern (AsyncStorage session + AppState auto-refresh; SecureStore's 2KB
> limit rules out the W1 note, encrypted LargeSecureStore = deferred
> hardening); the typed client finally passes `getToken`; `POST /auth/sync`
> mirrors users after sign-in. 3 modal screens (sign-in w/ `?reason=wishlist`
> context · sign-up w/ check-your-inbox branch · forgot → reset completes on
> the web). **Wishlist**: `useWishlist` optimistic toggle + `HeartButton` on
> cards/detail (guest tap → sign-in), **Saved tab** w/ AuthGate + instant
> remove, **Account tab** (profile · edit display name `PATCH /users/me` ·
> Privacy/Terms open `EXPO_PUBLIC_WEB_URL` · sign out). New env:
> `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` + `EXPO_PUBLIC_WEB_URL` in the committed
> `apps/mobile/.env`. Execution findings: `react-native-url-polyfill` needs
> the jest transform allowlist · web account copy nests at
> `messages.auth.account` · nested Pressables → testID presses (RNTL).
> On-device verified (real sign-up, hearts visible in the web account — same
> DB); dark-mode visual pass deferred (token-driven, low-risk). Baselines:
> api 338 · web 191 · admin 152 · **mobile 67 · mobile-ui 31**.
> **Next: P5 W4 (booking — the final wave)** — departure picker · booking form
> · hosted Stripe/PayPal checkout via browser + return deep-link · bookings
> list/detail/cancel in Account.
>
> Previously: **P5 mobile W2.5 Design Language COMPLETE
> (2026-07-07, branch `feat/mobile-w25-design-language`, merged ff-only):**
> **Fraunces + Geist** brand fonts wired through the mobile theme (`fontFamily`
> per variant, splash-gated `useFonts`; every `fontWeight` swept — custom fonts
> on Android need family switches) · `@tourism/mobile-ui` gains Badge (web tone
> map) and Skeleton (pulse) plus Card shadow and `TextField.leading` · **web-parity
> TourCard** with **locked equal-height rows** (meta 1L · title 2L reserved ·
> summary 2L on list · rating always shown · price 1L — user feedback: no more
> short/tall card mix) · **Home rebuilt** (full-bleed hero + scrim + centred
> Fraunces headline + search pill → Explore autofocus · featured shelf ·
> destinations rail → pre-filtered Explore · why-strip · CTA band) · icon facts
> and gallery badges on detail · tab bar filled active icons · styled
> placeholders. **UI direction LOCKED with the user: "Brand 100% + Structure
> native"** — web-identical identity, app-native structure (no navbar/
> hamburger/footer/TechCloud); **backlog: "Browse by experience" categories
> section**. New deps: expo-font · expo-splash-screen ·
> @expo-google-fonts/{fraunces,geist}. Baselines: api 338 · web 191 · admin 152
> · **mobile 41 · mobile-ui 31**.
> **Next: P5 W3 (auth & account)** — Supabase auth (secure-store token),
> login/register, account/profile, wishlist (heart + Saved tab).
>
> Previously: **P5 mobile W2 Browse & Detail COMPLETE
> (2026-07-07, branch `feat/mobile-w2-browse-detail`, merged ff-only):** real
> Explore tab (instant client-side search via `@tourism/core` helpers ·
> destination chips rail · duration/price/sort facet chips · full-width tour
> list) · tour-detail stack screen at web parity (gallery pager + dots ·
> seats-left · itinerary/FAQ accordions · reviews · sticky price + "Inquire
> now" bar) · enquiry bottom-modal (validated form, 429-aware, thank-you
> auto-close) · 3 new `@tourism/mobile-ui` primitives (TextField · Chip ·
> Accordion). On-device feedback hardening: **three-layer background theming**
> kills the white transition flash (Stack `contentStyle` + Tabs `sceneStyle` ·
> react-navigation `ThemeProvider` · `expo-system-ui` root view — see
> `apps/mobile/src/app/_layout.tsx` doc comment) · `ios_from_right` push +
> `slide_from_bottom` modal · device-polish audit (Screen hides scroll
> indicators by default · pressed states + hitSlop · keyboard-friendly Explore
> taps · themed RefreshControl) · mobile jest `testTimeout: 20000` (RN suites
> blew Jest's 5s on the shared CI runner — CI run #371 was that, not a lint
> break). New SDK-pinned deps: `@react-navigation/native` · `expo-system-ui`.
> Baselines: api 338 · web 191 · admin 152 · **mobile 33 · mobile-ui 26**.
> **Next: P5 W3 (auth & account)** — Supabase auth (secure-store token),
> login/register, account/profile, wishlist (heart + Saved tab).
>
> Previously — real content authoring (region/overview
> imagery now derives from `Destination.media[]` with fixtures as fallback + 48
> destination / 23 tour / 10 post real Unsplash images seeded and synced to the live
> `media_assets` table) COMPLETE (2026-07-06, branch `feat/real-content-authoring`).
> **Follow-up polish (2026-07-06, branch `fix/home-imagery-and-gallery-gap`): fixed
> a Gallery grid-variant bug (single tiles collapsed to 0×0) + replaced all
> wrong-location brand-chrome images (Maldives/Korea/Thailand stock) with curated,
> user-approved real Vietnam photos — still hardcoded in components.**
> **P5 mobile W1 Foundation COMPLETE (2026-07-06, branch `feat/mobile-w1-foundation`,
> merged ff-only):** expo-router 4-tab shell · `@tourism/tokens` RN hex theme
> (oklch→hex at build) · `@tourism/mobile-ui` founded (ThemeProvider + 5 primitives)
> · env-validated `@tourism/core` client + TanStack Query · Home with real featured
> tours (all data states + pull-to-refresh) — **verified on the user's Android phone
> via Expo Go**. Monorepo fixes en route: **react pinned 19.1.0 workspace-wide**
> (Expo SDK 54; pnpm override — web/admin re-verified green on it) · Metro Windows
> drive-casing · expo-router route discovery (projectRoot→app dir; specs must stay
> OUT of `src/app`) · Metro `.js`→`.ts` source resolver. Dev loop: `pnpm exec expo
> start` from `apps/mobile` (running via nx = non-interactive → no QR). Baselines:
> api 338 · web 191 · admin 152 · mobile 9 · mobile-ui 19.
> The P5 lane note ("teammate's lane / `origin/nghia*`") is obsolete — the user
> now drives P5 in-session; `origin/nghia` still must not be deleted.
>
> Remaining candidates, user picks: **P5 mobile W3 (auth & account)** — Supabase
> auth (secure-store token) · login/register · account/profile · wishlist (heart +
> Saved tab) · **admin-managed brand-chrome** (an admin surface
> for the now-real home/experiences/heroes images — needs a "site/page media" model)
> · tour gallery/video + post body imagery beyond heroes · mobile design-polish
> pass (match web's responsive look; splash/adaptive-icon dark-mode assets).
>
> **Verification status (user, 2026-07-06, on deployed) — refund + queue fully
> e2e-verified on BOTH gateways:** ✅ **Stripe** partial refund + deny confirmed
> e2e (real test-mode booking → partial refund → `PARTIALLY_REFUNDED`, seats kept;
> deny OK — deny is DB-only). ✅ **PayPal refund verified e2e (2026-07-06):** real
> sandbox booking `BK-X4H36W2S` ($175, capture `4VE90804CM551970N`) → full refund
> → `REFUNDED`, and its open cancellation request auto-resolved to `REFUNDED`.
> Confirmed in Supabase: `refunded_amount=175.00`; `payment_events` has **0 rows
> for that booking** — PayPal confirms PAID via **capture-on-return** (synchronous),
> not webhook, and admin refund reads the stored capture id directly (independent
> of webhooks), so an empty `payment_events` panel is expected, not a bug (8 PayPal
> webhook events exist system-wide, so webhooks aren't broken). Note: seed
> `BK-SEEDPAID` cannot be refunded (fake `pi_seed_paid_1`, no real gateway payment
> — refund correctly returns `REFUND_FAILED` and keeps it PAID).

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
  enquiry · reviews · contact · **tour-card availability**. **Region-page hero/gallery/signature +
  overview editorial gallery now derive from `Destination.media[]`** (`lib/region-imagery.ts`,
  all-real-or-fixture: a region with real uploaded media renders it, else falls back entirely to the
  `lib/regions.ts` fixture) — real Unsplash images seeded for all 16 destinations + tour/post heroes
  and synced live. The **brand-chrome** imagery (home hero, experiences/why-choose/trust, about/
  FAQ/legal/CTA heroes) is now curated **real Vietnam** photos too, but stays **hardcoded** in the
  components — an admin-managed site/page-media model is still deferred.

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
- **Gate:** `nx run-many -t lint typecheck test build` fully green. Mobile's
  `build` target is overridden to **`expo export`** (production Metro bundle
  check) since W4 — the inferred `eas build` needed `eas-cli` + an EAS account
  the Expo Go workflow doesn't use.

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
