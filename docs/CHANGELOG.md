# Changelog

> The single home for project history. One entry per merge to `main`,
> newest first. Current state lives in [roadmap](roadmap.md) ·
> [HANDOFF](../HANDOFF.md) · [CLAUDE.md](../CLAUDE.md).

## 2026-07-12 — Docs restructure: changelog-first history, slim status docs, 4 new ADRs (`c236daf`)

- This file created — the single home for history + test-count progression;
  `roadmap.md`/`HANDOFF.md`/`CLAUDE.md` rewritten as short current-state docs
  (40/36/29 KB → 3.4/5.7/14 KB); CLAUDE.md rule 9 is now changelog-first.
- ADRs 0009–0012 record already-shipped idioms: single-statement atomic
  claims · per-currency no-FX stats · ref-safe media GC · read-time
  scheduled publishing. ADRs 0001–0008 untouched.
- Accuracy sweep from a 3-agent audit: catalogs +12 missing endpoints
  (users list/me/detail · outbox list/retry · reviews feature/delete/curated ·
  avatar-sign · delete-me · reviews featured/summary) · frontend.md Mobile
  section rewritten from "scaffold" to the real P5 app · live-data era
  Data-strategy · 25 models count · backend.md +`cancellations`/`site-media`
  modules · all broken links fixed (postman ×6, BLUEPRINT research path) ·
  Defender-exclusion path corrected.
- Independent reviewer pass (0 block-merge): recovered near-lost facts
  (P1.7a/b/c · web component-reform Tiers 1–3a · motion increments ·
  tours-listing detail) and promoted two standing rules into CLAUDE.md
  gotchas (never delete `origin/nghia` · kill orphaned node before nx runs);
  the "104 endpoints" claim re-verified correct (reviewer had missed 2
  `@HttpPost(` aliases).
- Code side-fix: `prisma/reset.ts` now truncates all 25 tables (7 newer
  tables were missing — `subscribers`/`site_media_slots`/`post_tags`
  previously survived a "reset to empty"). `playground.md` scaffold artifact
  removed.
- Tests after: unchanged — api 439 · web 232 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-12 — Media library hides customer avatars by default (`f6450ea`)

- User feedback after the admin visual pass: avatars don't scale well in a
  media grid.
- `/media` now hides customer avatars by default; new "User avatars" facet
  and "Avatar" role become an explicit moderation opt-in.
- Tests after: admin 264.

## 2026-07-12 — Admin wave D2: TabPills · dashboard range + multi-currency · last-admin race (`f131b30`)

- Closes the user-approved debt program **B1 → B2 → C → D1 → D2**.
- Shared `TabPills` component in `components/crud/` — all 13 copy-pasted
  tablists across 11 files migrated byte-identically, −275 duplicated lines
  (the post-form Write\|Preview toggle stays separate).
- Dashboard date-range: preset pills 7/30/90d · This month · All time +
  custom `Calendar` range popover, URL `?from&to`, hydration-safe
  mounted-gate.
- Per-currency stats render: dominant-currency KPIs + extra-currency
  footnote · per-row Top-Tours currency · AOV divides only by the dominant
  currency's paid count (no cross-currency sums anywhere).
- Last-admin demote race fixed via a single-statement locking-CTE claim
  (adversarially verified) + role-conditional `deleteUser`, closing the
  promote→demote→delete bypass.
- Adversarial review: 0 block-merge findings, 5 should-fix + 1 nit fixed
  pre-merge. No migration.
- Tests after: api 439 · admin 260.

## 2026-07-11 — Media library upgrade, wave D1: reuse picker · ref-safe GC · alt text · bulk delete (`1d76c96`)

- "Choose from library" reuse picker wired into every owner form
  (Destinations/Tours/Posts/site-media) — one Cloudinary asset can now
  legally serve several owners.
- GC made ref-safe at both ends: guarded `recordGarbage` skips a publicId
  still referenced by another owner · `reconcileMedia` cron gets a
  check-before-destroy backstop · `syncAssets` defuses re-attach (removes a
  publicId from `media_garbage` if it's re-attached in the same request).
- New `MediaAsset.alt` column (migration `media_asset_alt`, live) — editable
  alt text end-to-end: admin PATCH → web render prefers `media.alt`.
- Bulk delete (USER-owned assets skipped, not errored) with tile selection;
  new SITE facet on the picker; 400 `MEDIA_ROLE_CONFLICT` when a `body`
  asset is picked as a cover.
- Adversarial review (2 rounds, GC-focused): fixed P2002-500 on
  body-image-as-cover (now a clean 400) · admin FE no longer swallows
  media-PUT errors · form no longer overwrites a library-edited alt with a
  stale value · `updateAlt` 404s correctly · `bulkDelete` returns the real
  transaction count · picker excludes avatar/USER-owned assets.
- Accepted residual risk: a rare write-skew (READ COMMITTED, two concurrent
  transactions) can leave one orphan Cloudinary asset — storage cost only,
  no data leak, left undocumented in code but recorded here.
- Tests after: api 402 · admin 224 · web 232.

## 2026-07-11 — Admin wave C: booking breakdown/counts · post SEO+scheduling · profile · ops (`a123d48`)

- Booking detail price-breakdown card + bookings list tab count badges
  (`meta.statusCounts`, `groupBy` on status).
- Post SEO fields (`metaTitle`/`metaDescription`) + explicit/nullable
  `publishedAt` scheduling — a future date schedules the post; no cron, a
  read-time filter (`publishedAt <= now()`) hides it until then. Browser-side
  TZ conversion after a review caught a server-TZ corruption bug (+7h).
- Admin self-profile card.
- Subscriber remove (admin) + outbox delete: atomic `deleteMany` avoids a
  TOCTOU race with the drain cron; `SENT` rows are protected (409
  `OUTBOX_ROW_SENT`).
- New `GET /admin/payment-events` webhook-log viewer (raw payload,
  best-effort booking link inferred from the payload — no FK).
- Migration: `post_seo_fields` (live), no new models.
- Adversarial review (2 rounds): outbox-delete TOCTOU fixed via atomic
  `deleteMany` · schedule-timezone corruption fixed (browser-side ISO field)
  · blank publish-date on edit now means "publish immediately" ·
  overshot-page dead-end on Subscribers/Outbox fixed · empty SEO field
  string now folds to `null`.
- Tests after: api 386 · admin 213 · web 231.

## 2026-07-11 — Admin reviews upgrade + Enquiry CRM, wave B2 (`a591cd5`)

- Reviews: edit curated testimonials (PATCH, explicit `null` clears a
  nullable field; 409 `REVIEW_NOT_CURATED` if the target is VERIFIED not
  CURATED); reviews list server-paginated with source/rating/search facets +
  user/booking join feeding customer/booking drawer links.
- Enquiries: `EnquiryNote` append-only internal-notes thread (author
  snapshot) + repeat-lead detection (per-page `groupBy` on email →
  `repeatCount` + `notesCount`); new `Enquiry.email` index.
- Shared `ToBoolean()` strict query-bool transform — adversarial review (3
  rounds) caught a coercion bug where `?isApproved=false` was read as
  `true`; fixed across 5 boolean query params.
- Migration: new `EnquiryNote` model + an RLS backfill on 4 older tables
  (`cancellation_requests`/`post_tags`/`post_tag_links`/`post_tours`) applied
  in the same batch.
- Tests after: api 369 · admin 194.

## 2026-07-11 — Admin list-table upgrade, wave B1 (`8fb01b9`)

- Column sorting on the 5 client-mode tables + dashboard (shared sortable
  headers in `AdminTableShell`, opt-in via `accessorFn`, `aria-sort`).
- Column visibility persisted per table (TDD `lib/table-prefs.ts` +
  `usePersistentColumnVisibility`, 11 tables).
- Tours gains destination/featured filters (TDD `lib/tours/filter.ts`).
- Bookings gains tour/departure URL filters with removable chips
  (`parseUuidParam`).
- Departures gains an Upcoming · Past · All time facet (TDD
  `matchesTimeTab`, default Upcoming, status counts computed within the
  active window).
- Shared `FacetFilter` component replaces 4 copy-pasted facet dropdowns.
- 8-angle review, 3 findings fixed — the dashboard had inert sort buttons
  that now actually sort.
- Row-selection deliberately cut (no bulk action existed yet — it shipped
  later with media-library bulk delete in wave D1).
- Tests after: admin 192.

## 2026-07-10 — Admin-managed brand-chrome imagery: site-media / Appearance (`2154f0f`)

- New `SiteMediaSlot` model (9 seeded brand-chrome slots: home
  hero/experiences/why-choose/trust · CTA band · content hero · destinations
  hero · auth panel · About-story gallery) + `MediaOwnerType.SITE` — slot
  images live in `media_assets` via the shared `MediaService`
  (Library-visible, GC-protected).
- Public `GET /site-media` (web ISR 300s, `{}` on error/empty) + admin
  `GET`/`PUT /admin/site-media/:key/media` (kind-validated: single = 1 hero
  · gallery ≤ 8 · images only · empty = reset) + `UploadPurpose.SITE_CHROME`.
- Admin Appearance page under Catalog (`/appearance`): per-slot preview +
  Managed/Default badge, Replace/Add via direct Cloudinary upload,
  confirm-gated Reset; gallery uploads client-capped at 8 and keep partial
  successes on a rejected PUT (adversarial-review fix — a rejected PUT can
  never strand untracked Cloudinary assets).
- Web: `getSiteMedia()` + TDD'd `siteImage`/`siteGallery`
  (`lib/site-media.ts`) — previous hardcoded images kept as per-slot
  `DEFAULT_*` fallbacks, so an empty slot or failed fetch renders exactly
  the old visuals.
- Adversarial review: 1 Cloudinary-leak finding fixed. Migration applied to
  live Supabase.
- Tests after: api 349 · web 230 · admin 164.

## 2026-07-10 — Admin motion layer + route loading skeletons (`6836500`)

- `motion` v12 primitives in `components/motion/` (`Reveal`/`Stagger` on
  `whileInView`, reduced-motion safe).
- 13 route `loading.tsx` skeletons (`TableSkeleton`/`DashboardSkeleton`);
  dashboard moved into its own `(dashboard)` route group so its skeleton
  doesn't leak to detail routes.
- KPI count-up via `NumberTicker` — TDD'd `currencyAffixes` keeps the final
  animated frame byte-equal to the SSR-rendered value.
- 150ms route-fade `template.tsx`; sliding `layoutId` sidebar pill.
- Reveals added to the shared list header/table shell (forms stay static,
  no motion on inputs).
- New `jest.setup.ts` enables RTL component tests.

## 2026-07-10 — Web form-validation sweep: no native HTML validation (`e030f6d`, `b58f7cf`)

- Standing user rule: every user-input form is `noValidate` +
  `aria-required` (no bare `required` attribute left anywhere).
- Per-field error codes from shared TDD'd validators (`lib/forms/validate.ts`
  generic base, re-exported by `lib/auth/validate.ts`) render via
  `FieldErrorText`/`AuthFieldError` (built on `@tourism/ui` `FieldError`)
  with `aria-invalid`/`aria-describedby`; copy centralized in
  `messages.fieldErrors` + `messages.auth.fieldErrors`.
- Register (`signUp`) and booking (`createAndCheckout`) now validate
  server-side and return `fieldErrors`; the money-path
  `buildCreateBookingPayload` stayed untouched as a backstop (adversarial
  review clean).
- Real backend errors (Supabase/API/429) keep their existing
  toasts/alerts.
- Auth shell also swapped its placeholder "NEX" spans for the shared brand
  `Logo` (white `--nx-tone` pin).
- Dead code removed: `isValidEnquiry`, `EnquiryStatus`-'invalid',
  `auth.passwordErrors`.

## 2026-07-10 — Admin form-validation sweep: no native HTML validation (`1c21c9c`)

- All 6 CRUD forms (Destinations/Categories/Tours/Departures/Posts) + login
  are `noValidate` + `aria-required` — their existing zod per-field server
  validation now actually surfaces (including the required tour selects,
  previously silently blocked by native browser validation).
- Sign-in validates per-field server-side via a new TDD'd
  `lib/auth/validate.ts`.

## 2026-07-10 — Contact page: secure-payments row replaces "Built with" strip (`0090c1a`)

- Contact's old "Built with" `TechMarquee` (dev-stack logos via
  `cdn.simpleicons.org`) swapped for the same `PaymentRow` component used on
  home (new `align="start"` variant), under a "Secure payments" label —
  layout otherwise untouched.
- `tech-marquee.tsx` + `marquee.tsx` deleted (last marquee consumers) — the
  web app no longer hits any external logo CDN.
- Tests after: api 340 · web 197.

## 2026-07-10 — Home trust band: merged, then redesigned as an editorial inline strip (`2fc3e7e` → `6d48af4`)

- BE: new public `GET /reviews/summary` (site-wide approved-review count +
  average rating) feeds the web home-trust-band.
- First landing (`feat/home-trust-band`, `2fc3e7e`): real live stats + a
  self-hosted monochrome payment marquee, replacing the coloured "Built
  with" tech-stack marquee — retired `tech-cloud.tsx`/`built-with.tsx` and
  the `cdn.simpleicons.org` dependency.
- Same-day redesign (`feat/trust-band-editorial`, `6d48af4`) after user
  feedback: the floating emerald card read as an unfinished placeholder and
  the marquee's edge-fades painted opaque white boxes over the logos (a real
  rendering bug). Replaced with an editorial inline strip on home + About —
  content between two hairlines, eyebrow + one-line serif heading left
  (`messages.trustBand.heading`), real live stats (curated tours ·
  destinations · average rating) with vertical dividers + scroll-triggered
  count-up (reused `MetricValue`/`NumberTicker`) right, and the 5
  self-hosted payment marks (`apps/web/public/logos/pay/`) as a static
  centered row (`payment-row.tsx` replaced `payment-marquee.tsx`) + a
  security caption.
- Tests after: api 340 · web 197.

## 2026-07-09 — P5.5 N3 "IA & Home" merged (mobile) (`c94cde5`)

- 5 tabs: bookings list moved out of Account into a dedicated **Trips** tab
  (`briefcase` icon); booking detail stays a stack screen; Account keeps a
  Trips link.
- Task-first Home rebuild: greeting (time-of-day + first name) + prominent
  search pill → Explore autofocus · signed-in context rows (next-trip card
  via `selectUpcomingTrip` → booking detail · recently-saved rail → Saved) ·
  featured + destinations shelves. Dropped: full-bleed hero, why-strip, CTA
  band.
- Pure helpers `selectUpcomingTrip`/`timeGreetingKey`/`firstName` +
  additive `BookingVm.departureDate` (TDD) — gotcha: adding a required VM
  field broke 3 existing `BookingVm` fixtures at `tsc` (jest/ts-jest didn't
  catch it) → run `nx typecheck` before committing a VM change.
- Reference step done in-session (Airbnb/Booking.com/GetYourGuide
  task-first pattern; user-confirmed layout A + time-of-day greeting).
- Adversarial review (money-path-adjacent): 0 findings.
- Tests after: api 338 · web 191 · admin 152 · mobile 153 · mobile-ui 34.

## 2026-07-08 — P5.5 N2 "Patterns" merged (mobile) (`97b5f08`)

- `AppSheet` themed bottom-sheet wrapper in `@tourism/mobile-ui`
  (`@gorhom/bottom-sheet` 5.2.14, verified bundling with reanimated 4;
  `scrollable` via `BottomSheetScrollView`, keyboard `extend`/`adjustResize`,
  backdrop tap-to-close; jest mock renders children in plain Views) + root
  `GestureHandlerRootView`/`BottomSheetModalProvider`.
- Explore filter sheet: 3 chip rails collapsed into a Filters button with an
  active-count badge; draft state + live "Show N results"
  (`countActiveFilters`, TDD).
- Stepped booking, Airbnb-style: Book now → DepartureSheet (departure +
  steppers + live total) → contact step (trip summary + Edit-trip
  reseeding) → payment step (per-line order summary); new `BookingDraft`
  context — fresh per trip, resets on `SIGNED_OUT`, guards redirect
  stale/foreign drafts; the create→checkout→result pipeline stayed
  byte-identical.
- Enquiry moved from a route-modal to a sheet; new show-all sub-screens
  (itinerary/FAQs/reviews tease 3 then push a full screen with native
  headers).
- Adversarial re-review: 5 findings fixed (sheet clipping/keyboard, draft
  PII surviving sign-out, seats re-clamp on Continue, Edit-trip reseed).
- Gotcha: `require('@tourism/mobile-ui')` inside a jest.mock factory is a
  lazy-load, so `@nx/enforce-module-boundaries` bans it — mocks render plain
  RN Text instead.
- Tests after: api 338 · web 191 · admin 152 · mobile 139 · mobile-ui 34.

## 2026-07-08 — P5.5 N1 "Feel" merged (mobile) (`491c314`)

- Umbrella spec for N1+N2+N3 locks 5 user decisions: 5 tabs with Trips ·
  Home search-first (hero dropped) · stepped booking (Airbnb-style) ·
  execution order N1→N2→N3 · new deps `@gorhom/bottom-sheet` +
  `react-native-reanimated` (+gesture-handler).
- Native stack headers (Fraunces `headerTitleStyle`; 3 hand-rolled headers
  removed).
- Android ripple (`android_ripple`) on every pressable surface
  (pressed-opacity gated to iOS-only).
- Haptics on heart toggle, booking success, destructive confirm.
- Reanimated motion: accordion layout transition, skeleton→content
  crossfade on 5 screens, success ZoomIn.
- Image `transition` fade-in + tinted placeholders; Card `boxShadow` +
  `borderCurve`.
- Forms: autofill hints, return-key chaining via `TextField` `forwardRef`,
  `KeyboardAvoidingView` on the booking form, selectable booking code.
- Jest gotchas: reanimated 4's own `/mock` pulls in
  `react-native-worklets` → hand-rolled minimal mock in both test-setups +
  transform allowlist + mobile-ui peer dep; `expo install` re-resolution
  duped react 19.2.7 in `.pnpm` → `pnpm dedupe` (lockfile stayed clean).
- Tests unchanged: mobile 126 · mobile-ui 33.

## 2026-07-08 — P5 mobile W4 booking, final wave (`88756bb`)

- Full money path, zero BE changes — pure logic ported verbatim from web
  (TDD): `booking-form.ts` payload builder · `price.ts` total estimate ·
  departure/status-meta/VM mappers.
- Booking form `tours/[slug]/book`: departure picker cards with seats-left +
  sold-out state · adults/children steppers capped by seats · contact
  prefilled from profile · Stripe/PayPal radio cards · live total; Book now
  CTA on tour detail gates known guests only.
- Hosted checkout via `expo-web-browser` + a self-verifying result screen
  (refetch + idempotent PayPal capture-on-return). Key finding: **Android's
  `openBrowserAsync` resolves immediately** (`{type:'opened'}`), so
  verification runs on AppState return-to-foreground; iOS verifies on
  promise resolve.
- Bookings management in Account: list + detail — Pay now · cancel PENDING
  via native `Alert.alert` · cancellation-request PAID with a reason ·
  refund states incl. `PARTIALLY_REFUNDED`.
- `@tourism/mobile-ui` Badge gains `muted`/`destructive` tones (destructive
  text uses the primary pair — no `destructive-foreground` token exists).
- Adversarial money-path review: 13 findings fixed — highlights: AppState
  verify (Android) · checkout-failure lands on the result screen (no
  duplicate PENDING on retap) · `['bookings']` cache cleared on sign-out
  (cross-account PII) · terminal statuses never offer Pay now · plain-401
  sync retry (web parity).
- Gate fixes: `mobile:build` overridden to `expo export` (was the inferred
  `eas build`, unusable without eas-cli/account) · api jest
  `testTimeout: 20000` (parallel-run flake headroom).
- On-device payment pass deferred (user environment issues, not the app) —
  Stripe test card, PayPal sandbox, abandon→Pay now, cancel/
  cancellation-request, guest gating still owed.
- Tests after: api 338 · web 191 · admin 152 · mobile 126 · mobile-ui 33.

## 2026-07-07 — P5 mobile W3 auth & account (`17b589c`)

- Guest-first Supabase auth: `@supabase/supabase-js` on the official Expo
  pattern (AsyncStorage session + AppState auto-refresh — SecureStore's 2KB
  limit ruled out the W1 note; encrypted LargeSecureStore deferred as
  hardening); the typed client gets `getToken`; `POST /auth/sync` mirrors
  users after sign-in.
- 3 auth modal screens: sign-in (`?reason=wishlist` context line) · sign-up
  (check-your-inbox branch) · forgot-password (completes on the web).
- Wishlist: `useWishlist` optimistic toggle + `HeartButton` on cards/detail
  (guest tap → sign-in with a reason).
- Saved tab: AuthGate for guests + saved list with instant remove.
- Account tab: profile · edit display name via `PATCH /users/me` ·
  Privacy/Terms open the deployed web · sign out.
- New env: `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` + `EXPO_PUBLIC_WEB_URL`.
- Execution findings: `react-native-url-polyfill` needs the jest transform
  allowlist · web account copy nests under `messages.auth.account` · nested
  Pressables need testID presses (RNTL).
- On-device verified (real sign-up, hearts visible in the web account —
  same DB); dark-mode visual pass deferred.
- Tests after: api 338 · web 191 · admin 152 · mobile 67 · mobile-ui 31.

## 2026-07-07 — P5 mobile W2.5 design language (`84c9309`)

- Fraunces + Geist brand fonts wired through the theme (`fontFamily` per
  variant, splash-gated `useFonts`; every `fontWeight` swept — custom fonts
  on Android need family switches, not weights).
- `@tourism/mobile-ui` gains Badge (web tone map) and Skeleton (pulse), plus
  Card shadow and `TextField.leading`.
- Web-parity TourCard with locked equal-height rows (meta 1 line · title 2
  lines reserved · summary 2 lines on list · rating always shown · price 1
  line — user feedback: no more short/tall card mix).
- Home rebuilt: full-bleed hero + scrim + centred Fraunces headline + search
  pill → Explore autofocus · featured shelf · destinations rail →
  pre-filtered Explore · why-strip · CTA band.
- Icon facts + gallery badges on detail; tab bar filled active icons; styled
  placeholders.
- **UI direction LOCKED with the user: "Brand 100% + Structure native"** —
  web-identical identity, app-native structure (no navbar/hamburger/footer/
  TechCloud); "Browse by experience" categories = backlog.
- New deps: expo-font · expo-splash-screen ·
  `@expo-google-fonts/{fraunces,geist}`.
- Tests after: api 338 · web 191 · admin 152 · mobile 41 · mobile-ui 31.

## 2026-07-07 — P5 mobile W2 browse & detail (`337d785`)

- Real Explore tab: instant client-side search/filter/sort via
  `@tourism/core` (`searchTours`/`filterTours`/`sortTours`) · destination
  chips rail · duration/price/sort facet chips · full-width tour list, 4
  data states.
- Tour detail at web parity: gallery pager + dots · seats-left ·
  itinerary/FAQ accordions · reviews · sticky price + Inquire CTA.
- Enquiry bottom-modal: validated form, 429-aware, thank-you auto-close,
  `POST /enquiries` with tourId.
- `@tourism/mobile-ui` gains 3 primitives: TextField · Chip · Accordion.
- On-device hardening: three-layer background theming (Stack
  `contentStyle` + Tabs `sceneStyle` + react-navigation `ThemeProvider` +
  `expo-system-ui` root view) kills the white transition flash · `ios_
  from_right` push + `slide_from_bottom` modal · device-polish audit
  (default-hidden scroll indicators, pressed states + hitSlop,
  keyboard-friendly taps, themed RefreshControl) · mobile jest
  `testTimeout: 20000` (CI runner headroom, RN suites blew the 5s default).
- New deps: `@react-navigation/native` · `expo-system-ui`.
- Tests after: api 338 · web 191 · admin 152 · mobile 33 · mobile-ui 26.

## 2026-07-06 — Web feedback layer: toast + AlertDialog (`00acb5f`)

- Ported admin's toast + flash pattern (`<Toaster>`/`<FlashToaster>`/
  `lib/flash.ts`) into the web root layout.
- Outcome toasts wired on: account settings (profile/email/password/
  avatar/delete) · booking cancel + cancellation-request ·
  contact/enquiry-family/newsletter · wishlist save/remove toggles
  (field-level validation stays inline; lead-capture forms keep their
  success panel and toast only failures).
- Standardized the two destructive confirms — cancel PENDING booking,
  delete account — on `AlertDialog`.
- Auth flows intentionally excluded.
- Tests after: web 185.

## 2026-07-06 — Real content authoring: region/overview imagery from Destination.media (`1e10f98`)

- Region-page hero/gallery/signature + `/destinations` overview editorial
  gallery now derive from `Destination.media[]` via `lib/region-imagery.ts`
  — all-real-or-fixture (a region with real uploaded media renders it, else
  falls back entirely to the `lib/regions.ts` fixture); `selectRegionBookables`
  threads `gallery` through.
- 48 destination + 23 tour + 10 post real Unsplash images authored in
  `prisma/fixtures/gen.cjs` (the single source → `sample-data.ts` + `json/`,
  which the seed loader reads) and synced to the live `media_assets` table.
- Same-day follow-up polish (`fix/home-imagery-and-gallery-gap`): fixed a
  Gallery grid-variant bug (single tiles collapsing to 0×0) + replaced
  wrong-location brand-chrome stock photos (Maldives/Korea/Thailand) with
  curated, user-approved real Vietnam photos — brand-chrome was still
  hardcoded in components at this point (site-media Appearance landed
  later, 2026-07-10).
- Tests after: api 338 · web 191 · admin 152.

## 2026-07-06 — P5 mobile W1 foundation (`644ad8f`)

- expo-router 4-tab shell (Nexora-themed).
- `@tourism/tokens` gains an RN hex theme (`@tourism/tokens/theme`,
  oklch→hex + rem→dp at build).
- `@tourism/mobile-ui` founded: `ThemeProvider`/`useTheme` +
  AppText/Screen/Spinner/Button/Card primitives.
- Env-validated `@tourism/core` client (`EXPO_PUBLIC_API_BASE_URL`, Render
  default) + TanStack Query.
- Home with real featured tours (loading/skeleton + cold-start hint ·
  error/retry · empty · pull-to-refresh) — verified on the user's Android
  phone via Expo Go.
- Monorepo fixes en route: react pinned 19.1.0 workspace-wide (Expo SDK 54,
  pnpm override; web/admin re-verified green) · Metro Windows drive-casing
  normalize · expo-router route discovery fix (projectRoot→app dir; specs
  must stay OUT of `src/app`) · Metro `.js`→`.ts` source resolver.
- Dev loop: `pnpm exec expo start` from `apps/mobile` (running via nx is
  non-interactive — no QR).
- Tests after: api 338 · web 191 · admin 152 · mobile 9 · mobile-ui 19.

## 2026-07-05 — Refund execution + cancellation-request queue (`b327dde`..`65acf64`)

- Admin refund accepts an optional partial `amount`: omitted/= total → full
  `REFUNDED`; `0 < amount < total` → `PARTIALLY_REFUNDED` (seats kept,
  `refundedAmount` set); 400 `INVALID_REFUND_AMOUNT` on bad input;
  idempotency key `booking-refund:<id>`; resolves an open cancellation
  request to `REFUNDED`.
- New `CancellationRequest` model replaces the old "Request cancellation"
  hack that abused Enquiry: customer `POST /bookings/:code/
  cancellation-request` (owner-only, upsert 1 request/booking, resets a
  previous `DENIED` request on resubmit) + admin `GET /admin/
  cancellation-requests` list (default `REQUESTED`) + `POST .../:id/deny`
  (atomic transition, booking stays `PAID`).
- Admin FE: refund dialog gains a partial-amount field + a proactive-refund
  safeguard (warning + required confirm checkbox for a refund with no open
  request) · deny action + a "Cancellation requested" panel on booking
  detail · new `/cancellation-requests` queue page under Operations ·
  `bookingStatusMeta` handles `PARTIALLY_REFUNDED`.
- Web FE: real booking-tied cancellation request replaces the Enquiry hack;
  `BookingActions` becomes status-aware (requested → pending banner, denied
  → resubmit, refunded/partially-refunded → "Refunded $X"/"Partially
  refunded $X").
- Migration: schema for partial refunds + `CancellationRequest`, applied.
- Later e2e-verified on both gateways (2026-07-06): Stripe partial refund +
  deny confirmed on a real test-mode booking (seats kept); PayPal full
  refund verified on a real sandbox booking (`BK-X4H36W2S`, capture
  `4VE90804CM551970N`) → `REFUNDED`, auto-resolved the open cancellation
  request. Note: PayPal confirms PAID via synchronous capture-on-return,
  not webhook, so an empty `payment_events` panel for a PayPal booking is
  expected, not a bug; seed booking `BK-SEEDPAID` correctly fails refund
  (`REFUND_FAILED`, fake payment intent).
- Tests after: api 338 · web 185 · admin 152.

## 2026-07-05 — blog-v2 wave 5: newsletter + RSS (`15c5cb4` BE · `a91909d` FE)

- New `Subscriber` model + a media-asset compound-unique constraint
  (migration applied, with a same-day fast-follow fixing a dup-race on the
  upsert key).
- Public throttled `POST /newsletter/subscribe` (5/min + honeypot) with
  silent dedupe (re-subscribing an existing email returns the same ack, no
  "already exists" leak).
- Admin subscribers list (search by email) + CSV export (page-through,
  formula-injection guarded) under Operations.
- Web: live footer newsletter signup + `/blog/rss.xml` feed.
- Blog-v2 roadmap (all 5 waves) marked COMPLETE this day.
- Tests after: api 314 · web 182 · admin 146.

## 2026-07-05 — blog-v2 wave 4: reader polish (`b9b5158`)

- Article share row, prev/next nav, outline scrollspy + scroll-progress,
  "Updated on" stamp (`updatedAt` on the detail VM + `isMeaningfullyUpdated` +
  `pickAdjacentPosts`).
- Fixed outline anchors to match rendered headings + a shared DRY
  markdown-strip helper (inline + document level).
- Tests after: web 175.

## 2026-07-05 — blog-v2 wave 3: inline body images (`96e9ff1`, `335a60f`)

- BE: `MediaRole.body` enum (migration, applied) · `syncAssets` gains a
  `preserveRoles` carve-out (setting a cover doesn't strip already
  registered body images) · `POST_BODY` upload purpose · idempotent
  `registerAsset` upsert for post body images, race-free on the compound
  unique (GC-on-post-delete).
- Admin: insert-image button in the post editor → Cloudinary → registers a
  `body` asset · Write\|Preview markdown toggle · `insertSnippet` helper ·
  `/media` gains a `body` facet.
- Tests after: api 309 · admin 142.

## 2026-07-05 — blog-v2 wave 2: reader funnel + taxonomy UX (`b263e32`)

- `?tag=`/`?q=` filter chips on `/blog`; tag chips on post cards + article
  header; related-by-tag "more posts" (`pickMorePosts` — same-topic first,
  recency top-up).
- Article funnel: real byline, topic links, tour cards, enquiry CTA,
  tag-aware related posts.
- Journal search stays visible even on a tag-less blog (final-review fix).

## 2026-07-05 — blog-v2 wave 1: post tags/related-tours/author (`83d0151`, `2f2193e`)

- BE: post tags + `post_tours` M:N schema (migration, applied) · public +
  admin post-tag endpoints (`GET /posts/tags`) · post detail returns
  `relatedTours[]` (admin-ordered, published-only) + public
  `author { fullName, avatarUrl }` (no email leak).
- Admin: tags editor (create-inline combobox) + related-tours picker on the
  post form; tags + related tours surfaced on the post detail rail and
  list.
- Tests after: api 301.

## 2026-07-05 — Admin UI-parity pass — P4 fully complete (`fea387c`)

- The last two off-pattern surfaces — the `/outbox` table and the
  dashboard recent-bookings widget — rebuilt on the shared table stack
  (`AdminTableShell`/`ColumnsMenu`/pagination) + a shared `formatShortDate`
  helper.
- Marks P4 (admin CRUD breadth) fully complete: 149 tests, nothing
  structurally remaining at that point.

## 2026-07-05 — Rule 9 adopted: mandatory docs sweep after every feature merge (`cc1e170`)

- Standing skill conventions + model-routing table (haiku/sonnet/opus per
  task type) added to `CLAUDE.md` the same day (`b8684f9`, `8feb640`).

## 2026-07-03 — P6 web blog reader (`2631471`, `295ecfa`)

- `/blog/[slug]` markdown article page: reading time, outline rail,
  more-posts, Article JSON-LD, anchored headings.
- `/blog` magazine index: hero, URL pagination, honest empty/error states.
- Home teaser wired to real posts; Journal nav/footer/sitemap.
- Tests after: web 129 pre-existing baseline → 139 with derive specs at
  landing.

## 2026-07-03 — Admin Users module + hardening (`ae02bed`)

- `syncAdmin` grants access via the env allowlist OR DB-promoted admins;
  fixed a DB-role revocation race where the sync path could re-grant a
  revoked role.
- Admin users list (role tabs, search, TanStack table) + user detail +
  danger zone (role change, delete) + `/users/me` + nav-user link.
- Fixed a `deleteMe` avatar leak found while building the admin delete
  path.

## 2026-07-03 — Admin Media library, wave 7 — enrichment roadmap complete (`27a2013`)

- Admin media library: grid, facets, search, detail drawer, delete + a
  media-garbage tab (queue table + run-cleanup-now).
- BE: admin media list (filters, owner-aware search, owner resolution) +
  delete + garbage queue + reconcile-now endpoints.
- Closes the 7-wave admin richness/enrichment roadmap opened 2026-07-02.

## 2026-07-02 — Admin Bookings polish, wave 6 (`072200f`)

- Booking detail enriched: customer account, other bookings, payment
  events, session ref, seats summary.
- Admin bookings list gains a `userId` deep-link + active-filter indicator.
- Perf: indexed `Booking.tourId` + `Enquiry.tourId`.

## 2026-07-02 — Admin Tours+Departures ops, wave 5 (`41f0db4`)

- Tour detail ops cards: performance, departures summary, reviews link.
- Departure detail page: bookings, utilization, facts (real tour currency,
  bookings load-error state).
- List columns sweep: covers, ratings, next departure, tours count across
  Destinations/Categories/Tours.
- BE: `toursCount` on destination + category lists/detail; tourId/
  departureId filters on admin bookings list; admin tour detail ops
  aggregates.

## 2026-07-02 — Admin Dashboard quick wins, wave 4 (`1c90423`)

- Dashboard chart metric toggle + pipeline, top-tours, and queue widgets.
- Bookings pipeline transform + full dashboard stats typing.
- BE: pending queue counts on the admin dashboard stats.

## 2026-07-02 — Admin Enquiries CRM upgrade, wave 3 (`5394a8f`)

- Enquiries gains server-side search + a trip-details drawer + lead age.
- BE: admin enquiries expose qualification fields + tour join + `search`.

## 2026-07-02 — Admin Reviews reskin + surfacing, wave 2 (`32c9ae9`)

- Reviews reskinned to the shared template + full-text drawer; curated
  testimonial form reskinned to Form Layout 2.
- BE: admin review `tripLabel`/`tourTitle` + curated-only delete.

## 2026-07-02 — Admin Posts enrichment, wave 1 (`208c132`)

- Post detail rail gains length, outline, author avatar; post cover on
  detail + list thumbnail + cover upload in the form.
- BE: post cover media + author avatar on admin detail; new `POST_COVER`
  upload purpose.
- Opens the 7-wave admin richness audit/enrichment roadmap (`de3b4ca`),
  closed by wave 7 (Media library) on 2026-07-03.

## 2026-07-01 to 2026-07-02 — Admin reskins, TanStack tables, tour content authoring

- Posts list + form reskinned to the shared table/Form-Layout-2 template
  (`eeb85d3`); Departures list + form reskinned the same way (`3690619`);
  tour form quick-wins (auto-slug, meeting-point hint, content textareas,
  `07766fd`).
- TanStack + Columns button rolled out across Destinations/Categories/
  Tours/Bookings/Posts/Enquiries (4-slice plan, `621bb29`); shared
  rows-per-page pagination on client and server tables.
- Departures past-date hardening: update guarded against moving `startDate`
  into the past; departed rows marked in the list (`4e0ab5c`).
- Markdown itinerary authoring — tour days render as Markdown, day-length
  cap raised to 8000 (`33a7b2a`).
- Seed-from-fixtures: seed now reads generated fixtures + a thin functional
  overlay (`992af11`).

## 2026-07-01 — Admin Tours module COMPLETE (4-slice)

- Slice 1: read-only tour detail page (`17fe6dc`).
- Slice 2: tours list reskinned to the shared template, category/status
  filters (`ac55e24`).
- Slice 3/4: shared `MediaField` (generalized from the destination media
  widget) wired into the tour form (`bdd3591`); tour form reskinned to Form
  Layout 2 + `@tourism/ui` Select (`67f13b4`); itinerary/FAQs/policies
  editors via a new generic `RepeatableCards<T>` (`df4dac8`).

## 2026-07-01 — Admin Destinations + Categories detail enriched; Bookings + Enquiries modules complete

- Destination/Category detail pages reworked to the card layout (matching
  the redesigned booking detail) and now show linked tours (`eee7845`).
- Bookings module: read-only list (status tabs, code/name/email search,
  pagination) + detail (order/trip/customer facts) + refund action
  (`ce7d5a9`); booking detail redesigned from a sparse vertical timeline to
  a summary-led Order rail (`8318f27`), then enriched with refund audit +
  payment reference (`4905b82`).
- Enquiries/CRM module: list (status-tab pipeline NEW→CONTACTED→QUOTED→
  WON/LOST) + drawer detail + status change (`62e96a1`).
- Admin feedback-layer standardization (spec-driven): global toast + flash
  on create/update (`17c9e22`), inline-mutation toasts on delete/refund/
  status change (`be30cfa`), shared `ErrorAlert`/`Spinner` replacing ad-hoc
  banners and raw `Loader2` spinners (`d3db22c`).

## 2026-06-30 — Admin UI redesign: login, shell, dashboard, Destinations + Categories modules

- Login redesigned with a React Bits Aurora WebGL backdrop + glass card +
  shared Nexora logo (`1d267ba`).
- App shell redesigned: inset sidebar, dashboard-01 pattern, footer account
  row (`cdd31ee`).
- Dashboard rebuilt to shadcn dashboard-01 parity: SectionCards + daily
  area chart + a TanStack/dnd DataTable (BE gains `dailyTrend`, `8360ba7`).
- Destinations module COMPLETE: list reskin with instant client-side
  filter+tabs · Form Layout 2 create/edit with auto-slug + locked country +
  region dropdown · hero+gallery image upload to Cloudinary (BE adds
  `DESTINATION_GALLERY` purpose + `publicId` on media read).
- Categories module COMPLETE: list+detail+form template, no images
  (`9eccea9`).

## 2026-06-28 to 2026-06-29 — Web: booking-flow redesign, unified reviews, final polish, legal pages complete

- Booking flow redesign in 3 increments: sectioned Form-Layout-2 form
  (`6420f85`) · booking-mode toggle + private-departure request (`c0c7034`)
  · two-ways-to-travel CTAs + a proper inline date picker (`a4baab1` and
  follow-ups).
- Unified reviews (verified customer reviews + curated/featured
  testimonials): additive back-compat schema (`7778b5b`) · public
  `GET /reviews/featured` · admin moderation + featured/curated UI
  (`c1f7abc`).
- Final polish pass MERGED (`ca1cfd0`): a11y WCAG 2.2 AA (skip-link, single
  `<main>`, full-opacity focus-visible, labelled filters/forms), SEO
  (`sitemap.ts`/`robots.ts`, Organization + Product + Breadcrumb JSON-LD,
  canonical/OG), perf (`fetchTourDetail` wrapped in React `cache()`,
  `next/image` on gallery/saved thumbnails, reduced-motion baseline), logo
  collapsed to a single Nexora wordmark.
- Legal pages (`/privacy` `/terms` `/cancellation-policy`) finalized as
  complete pages with real project facts; draft callout removed
  (`d9826cc`) — not lawyer-reviewed, acceptable for the demo.
- Booking detail + cancel/refund-request page (`1360761`); wishlist save-UI
  — heart on tour detail + manage in account (`cb9e12a`); dedicated
  `/account/saved` page (`05e7115`); region-detail wired to live data +
  tour-card availability badge + tours pagination (`d8afb7d`, `37fe44a`,
  `8ee25de`).
- Tours listing upgrades in the same span: free-text search (`searchTours`
  in `@tourism/core`, accent/đ-insensitive, fed by the hero `?q=`) ·
  client-side pagination 10/15/25 (`pageView`/`pageNumbers`, TDD) ·
  availability badge rules ("Only N seats left" at ≤5 · "Next: {date}" ·
  "On request", never "sold out") via pure `tourAvailability`/
  `nextDepartureInfo` over BE `nextDepartureDate`/`nextDepartureSeatsLeft`.
- Web component reform, Tiers 1/2/3a (`c946678`, `c75ac8d`): native forms
  (plan-trip · enquiry · hero · faq search) → `@tourism/ui`
  `Field`/`Input`/`Textarea`/`Button`/`ToggleGroup` · shared `LEAD_*`
  lead-form field baseline · clear-all links + password toggle → `Button` ·
  dead `tours-explorer` fixture + orphan i18n removed.
- Web motion pass: increment 1 merged (`6666acc`) + increment 2
  (NumberTicker · BlogTeaser · story spine-fill · staggers), all gated
  behind `useReducedMotion`/`motion-reduce:` + the global
  `prefers-reduced-motion` baseline.

## 2026-06-27 — Web: auth epics S1–S5, my-bookings, self-delete account

- Auth epics: password reset + resend confirmation (S1, `045760e`) ·
  account hub + profile edit (S2, `3cc778e`) · change password + change
  email (S3, `13f52dd`) · customer avatar upload (S4, `0dec999`) · Google
  OAuth sign-in (S5, `dbd59f9`).
- My bookings list at `/account/bookings` (`2b5b668`).
- `DELETE /users/me` self-delete account (`b33226b`).
- Branded Supabase auth email templates (confirm/reset/change, `7b3cbea`).

## 2026-06-25 — Web: auth foundation + booking flow increment 2

- Supabase browser/server clients + a proxy guarding `/account` (session
  refresh, `832e7c9`); login/register pages, email-confirm callback,
  `messages.auth` i18n (`c8e34e9`); auth server actions
  (signIn/signUp/signOut) with a best-effort `/auth/sync` mirror
  (`98deba8`); `safeRedirect` (open-redirect guard) + `authErrorMessage`
  helpers (TDD, `1853eb7`).
- Booking flow increment 2: tour `BookingBox` → real booking flow
  (`38c18a8`), checkout success + cancel pages (`cf345fc`), Stripe
  `success_url` carries the booking code (`95352bd`).
- CI: PR template + CODEOWNERS for team review routing; the `main` branch
  ruleset (PR + 1 approval, owner bypasses) noted as enforced.

## 2026-06-24 — Admin CRUD epic complete + deploy live

- Full admin CRUD landed in one push: auth (T0–T3) · app shell with real
  dashboard stats (T4a/b) · Destinations (T5–T7) · Categories (C1–C5) ·
  Tours (TR1–TR5) · Departures (D1–D5) · Posts (P1–P5).
- Admin bookings list + detail (`GET /admin/bookings` paginated,
  `GET /admin/bookings/:code`) closes the P4 backend gap (`0413893`).
- DEPLOY: `GET /health` readiness endpoint — Prisma `SELECT 1`, 503 if DB
  down (`0ac8e82`); `render.yaml` blueprint + a GitHub Actions keep-alive
  pinger + a free-tier deploy runbook (`05c508b`).
- Web wired to real API: tour detail (`d9997aa`), home featured/bento
  (`ab76324`), destinations overview (`47be7b7`), all ISR 300.
- Function-catalog convention reworked: codes changed to
  `<Actor>-<MODEL>-<n>` (embeds a 3-letter model code, numbers reset per
  model) — replaces the old sequential `A-xx`/`U-xx` scheme; full
  cross-reference updated in both catalogs.

## 2026-06-21 to 2026-06-23 — P2 design system + P3 web build-out

- P2 design system: Style Dictionary token pipeline, "Emerald Heritage"
  brand direction, no-hex enforcement (`19c6e96`, `5d70924`); shadcn (Base
  UI `base-nova`) foundation seeded into `@tourism/ui` (`10d6127`).
- P3 web: Lily-style homepage (`dded11b`) · `/destinations` overview +
  per-region pages (Northern/Central/Southern, each with a distinct L2
  signature section) · content pages `/faq` `/privacy` `/terms` · About +
  Contact pages · Tours listing (`/tours`, filterable, TDD filter logic in
  `@tourism/core`) + tour detail (SSG).
- Shadcn Space component adoption, tiers A–C: `NumberTicker`, featured-first
  `BlogTeaser`, scroll-driven story-timeline spine-fill, editorial
  `Gallery`, `BookingBox` shine border, React Bits motion primitives
  (`TextType`, `ShinyText`).
- Editorial blog `Post` module: schema + CRUD + RLS (`ccac4fb`); homepage
  blog teaser wired to real posts (`e125938`); documented as P-Content
  (`9c10eeb`).
- Navbar redesign (scroll pill, hover-pill links, arrow CTA) + Nexora "NEX"
  logo (`f1942be`).

## 2026-06-20 — P1 backend complete (P1.7d/e, P1.8, P1.x)

- P1.7a reviews (PR #15) · P1.7b wishlist + enquiry (PR #16 — throttle
  5/min + honeypot) · P1.7c admin-stats + user-avatar wiring (PR #17);
  187 api tests at that point.
- P1.7d enquiry lead fields (nationality/travelDate/groupSize/budgetTier/
  interests — Lily form parity, `5491232`); P1.7e tour merchandising
  (`suitableFor`/`TourBadge`, `46384a8`).
- P1.8: idempotent seed (catalog + test accounts + a self-signed PAID
  booking, `124299b`) · typed `@tourism/core` API client via
  openapi-typescript + openapi-fetch (`03e5a40`) · supertest e2e
  happy-path + unit coverage ≥80% (stmts 81.9%, `bc6b025`).
- P1.x jobs: pg-boss outbox + transactional emails via Resend
  (confirm/refund/review-approved/enquiry, `a5be62b`); cron — abandoned-
  booking cleanup + media reconcile incl. Cloudinary destroy (`80cbfa4`).
  ([ADR-0007](02-decisions/0007-pgboss-outbox-jobs.md).)
- Function catalogs (admin/customer/system) created, split by model,
  built from the real code (`f3ee4ec`).
- P1 backend declared complete this day: schema+RLS, envelope, auth, CRUD,
  bookings, Stripe+PayPal, media, reviews/wishlist/enquiry/stats,
  seed+client+e2e, pg-boss jobs.
- Tests after: api 223 (the start of the progression that later reads
  223 → 301 → 309 → 314 → 338 → 386 → 402 → 439).

## 2026-06-15 to 2026-06-17 — P1.1–P1.6: schema, auth, CRUD, payments, media

- P1.1: fresh Prisma schema (EN-only, M:N, multi-gateway, FK/CHECK
  constraints) + migration + RLS + `PrismaService` (PrismaPg adapter) +
  `prisma.config.ts` + Joi env validation; migrated to a new Supabase
  project (Singapore region).
- P1.2: response envelope (`ApiResponse` → `@tourism/core`) +
  `TransformInterceptor` + `HttpExceptionFilter`; helmet/CORS; Swagger;
  Sentry bootstrap.
- P1.3: auth — `SupabaseJwtGuard` (JWKS) + `RolesGuard` +
  `@Public`/`@Roles`/`@CurrentUser` decorators + `/auth/sync`,
  `/auth/admin/sync`, `/users/me` (global guards, `ADMIN_EMAILS`
  allowlist).
- P1.4: CRUD epic — destinations (P1.4a) · tours + tour-categories with
  M:N `destinationSlugs[]` + nested itinerary/FAQs/policies (P1.4b) ·
  departures nested under tour with seat/date guards (P1.4c).
- P1.5: bookings + multi-gateway payments — bookings core with a PENDING
  lifecycle and soft seat-check (P1.5a) · Stripe checkout + raw-body HMAC
  webhook + admin refund + an atomic seat-claim CTE
  (`PaymentsService.claimSeatsForPaid`, P1.5b) · PayPal Orders v2 with
  capture-on-return + a webhook backstop (P1.5c). MoMo→PayPal pivot
  recorded in [ADR-0006](02-decisions/0006-multi-gateway-momo.md)
  (inbound-foreign-tourist audience). Confirmation/refund emails deferred
  to P1.x.
- P1.6: media — Cloudinary signed direct upload
  (`POST /admin/uploads/signed-url`), `PUT /admin/{tours,destinations}/
  :slug/media` (replace-all), read-attach `media[]` on tour/destination
  reads. Reconcile/destroy job deferred to P1.x.
- ADRs recorded: 0005 (EN-only) · 0006 (MoMo→PayPal) · 0007 (pg-boss
  outbox jobs) · 0008 (security/integrity hardening) — all applied
  throughout P1.
- 119 api tests passing at this stage; CI green (lint, typecheck, test, build,
  CodeQL, GitGuardian); Dependabot 0 open (js-yaml DoS resolved via a
  `^4.2.0` override).

## 2026-06-14 — P0 / P0.6 / P0.8: Nx scaffold, module boundaries, donor conventions

- P0: Nx 22 + pnpm monorepo scaffold — 4 apps (api/web/admin/mobile) + 5
  libs (`shared/{core,tokens,i18n}` · `web/ui` · `mobile/ui`) (`d720036`).
- P0.6: module boundaries enforced via ESLint flat-config +
  `@nx/enforce-module-boundaries`, scope+type tags (`4a295af`).
- P0.8: workspace scope renamed `@org/*` → `@tourism/*` (`975fc37`); donor
  working conventions (`CLAUDE.md`, commands, CI) ported from the frozen
  donor repo `tourism-be-api` (`07f8642`); AI-assistant cruft removed
  (`27994d3`).
- HANDOFF + `BLUEPRINT.md` + reference-sites analysis written as the
  self-contained planning baseline (`6c24b61`).
