# Changelog

> The single home for project history. One entry per merge to `main`,
> newest first. Current state lives in [roadmap](roadmap.md) ·
> [HANDOFF](../HANDOFF.md) · [CLAUDE.md](../CLAUDE.md).

## 2026-07-16 — Email change: no autofill on the re-auth password field (`cc0435b`)

- Follow-up to the email-change UX: the current-password re-auth field switched
  from `autoComplete="current-password"` to `"off"` so the browser no longer
  pre-fills the saved password — confirming an email change is a deliberate typed
  action (best-effort; autofill suppression is browser-dependent, `new-password`
  is the fallback if a browser still fills it). Branch
  `fix/change-email-password-no-autofill`. Tests unchanged (web 336).

## 2026-07-16 — Email change: password re-auth + old-address notice + password-only gate (`83d76a0`)

- **Reshaped email change to the mainstream low-friction pattern** (confirm the
  NEW address only + notify the OLD address + re-auth), replacing Supabase's
  dual-inbox "Secure email change". Research-backed (OWASP + Google/GitHub/Amazon
  all use confirm-new + notify-old). Branch `feat/email-change-notify-reauth`
  (spec+plan `297cf71`).
- **Restrict to password-only accounts** — `canChangeEmail(providers)` (over
  `app_metadata.providers`) allows the change form only when the account has an
  `email` identity and **no** OAuth provider; Google-linked accounts (Google-only
  or password+Google auto-linked) get a managed-by-Google note. Avoids the
  primary-email vs Google-identity-email mismatch. (Identity analysis: the app
  never calls `linkIdentity`, so "password A + Google B" can't arise.)
- **Password re-auth** — the change form adds a current-password field;
  `signInWithPassword` verifies it before `updateUser` (Supabase has no
  verify-password API). Wrong password → field error, no change.
- **Notify the OLD address** — `AuthService.upsert` detects the mirror email flip
  (`bySub.email` ≠ JWT email) and enqueues an `EMAIL_CHANGED` outbox row
  (`$transaction` with the update; payload `{oldEmail,newEmail}`, fresh-uuid
  `dedupeKey` so a repeat change to a prior address is never suppressed) → Resend
  branded "your email was changed" notice. New `EmailType.EMAIL_CHANGED` (migration).
- Review findings: 1 (fixed) — an email-keyed `dedupeKey` would permanently drop
  the notice on a repeat A→B→A→B change (SENT outbox rows are kept forever);
  switched to a per-enqueue uuid.
- **Deploy to-do:** apply the migration + Supabase → Auth → Providers → Email →
  **Secure email change: OFF**.
- Tests after: **api 558 · web 336 · admin 266 · mobile 167 · mobile-ui 50 ·
  core 42.**

## 2026-07-16 — Fix email-change confirmation (cross-browser token_hash) (`406f02c`)

- **Changing email in Account Settings now takes effect.** Two stacked bugs:
  (1) the only auth route `/auth/callback` handled just PKCE
  `exchangeCodeForSession`, so an email-confirmation link opened in a different
  browser (no PKCE code verifier) bounced to `/login?error=auth` and the change
  never committed at Supabase; (2) the API mirrors `User.email` locally and only
  re-synced at sign-in, so even a committed change showed stale until re-login.
  Branch `feat/fix-email-change-confirm` (spec+plan `a29af64`).
- **New `apps/web/src/app/auth/confirm/route.ts`**: `verifyOtp({ type,
  token_hash })` verifies the self-contained hash **server-side (no PKCE)** →
  completes cross-browser. Handles `email_change | signup | recovery | invite`
  (`parseConfirmParams` allow-list, TDD); `safeRedirect` + token stripped from
  the redirect; failure → `/login?error=auth`. On success calls `syncUser()`
  (`POST /auth/sync`) → refreshes the API email mirror immediately (fixes bug 2;
  the session cookie `verifyOtp` sets is visible to `syncUser` in-request).
- **The 3 Supabase templates** (`docs/email-templates/{change-email,confirm-signup,reset-password}.html`)
  switch `{{ .ConfirmationURL }}` → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`
  (raw `&` so copy-paste works). `/auth/callback` kept for OAuth; `/reset-password`
  reads the session `/auth/confirm` sets (no rework).
- Review findings: none (clean). One typecheck fix mid-gate (`.includes` on the
  literal tuple → widen to `string[]`).
- **Deploy to-do (Supabase dashboard):** allow `…/auth/confirm` in Auth → URL
  Configuration → Redirect URLs; re-paste the 3 updated templates. Secure email
  change stays ON.
- Tests after: **api 551 · web 329 · admin 266 · mobile 167 · mobile-ui 50 ·
  core 42.**

## 2026-07-16 — Review moderation → on-demand web revalidation (`a226da9`)

- **Approved/un-approved reviews now show on the public tour page within
  seconds**, not on the 300s ISR timer — without making the page dynamic.
  Branch `feat/review-ondemand-revalidation` (spec+plan `b5c51d3`).
- **Web:** the tour reviews + detail fetches are tagged `tour:<slug>`
  (`fetchTourReviews` + `fetchTourDetail` in `lib/api/tour-detail.ts`; detail is
  tagged too because approval shifts `averageRating`/`reviewsCount`). New
  secret-guarded Route Handler `POST /api/revalidate` →
  `revalidateTag(tag, { expire: 0 })` (immediate expiry, not `'max'`
  stale-while-revalidate — the admin's very next reload must reflect the change).
  503 unset-secret · 401 bad secret · 400 missing slug · 200.
- **API:** new `WebRevalidationService` POSTs `${FRONTEND_URL}/api/revalidate`
  (shared `REVALIDATE_SECRET`, 3s timeout) fire-and-forget from
  `ReviewsService.moderateById` **after the `$transaction` commits**, on BOTH
  approve and un-approve; CURATED reviews (no tour slug) skipped; any failure is
  logged + swallowed so moderation never blocks. Chosen over hooking the outbox
  drain (1-min cron · disabled without `RESEND_API_KEY` · never fires on
  un-approve).
- **Config:** new optional shared `REVALIDATE_SECRET` (Joi optional; unset ⇒ API
  no-ops, web route 503s, 300s ISR is the backstop). API reuses the required
  `FRONTEND_URL` as the web origin — no separate URL env. Documented in both
  `.env.example` files. **Deploy to-do:** set a matching value in Render (API) +
  Vercel (web).
- Review findings: 1 — original `revalidateTag(tag, 'max')` was
  stale-while-revalidate (next visit still stale); switched to `{ expire: 0 }`.
- Tests after: **api 551 · web 314 · admin 266 · mobile 167 · mobile-ui 50 ·
  core 42.**

## 2026-07-16 — P5.7 S4: Home as the Navel region browser (`e6a74ce`)

- **Home rebuilt to Navel Screen-17/18** (branch `feat/mobile-s4-home`,
  `a8d3757` + device-findings pass `e6a74ce`): fixed full-height composition
  (no vertical scroll — pull-to-refresh dropped, error state keeps retry).
  Header = avatar tile + "Welcome {firstName|Traveller}" (brand name never
  greets a guest); brass "Recommendations" headline with the bare search
  glyph on the same row (→ Explore w/ keyboard up) over an edge-running
  hairline; slim next-trip chip stays for signed-in users w/ an upcoming
  booking (locked decision, as is the 5-tab nav).
- **Region browser** (the user's own N/C/S idea grafted onto Navel's rail):
  `RegionTabs` — rotated North/Central/South labels spread over the full
  card height, brass active + horizontal dash UNDER the word (dash rendered
  as the first child of the rotated row: after -90° row-start points down);
  a11y reads full region names unrotated. `DestinationHeroCard` — 0.68-width
  fill-height card, pin+region top-right, "Recommended" eyebrow + Fraunces
  34pt name + tours row at the foot, translucent brass arrow panel (token
  hex + '4D' alpha — no-hex rule intact); card → Explore filtered by
  destination. `groupByRegion` from @tourism/core drives the rails
  (`DestinationChipVm` gains required `region`).
- **mobile-ui:** `ScrimImage` gains `fill` (flex:1 instead of aspectRatio);
  `FloatingTabBar` goes container-less per Navel — bare outline icons, active
  = 62px brass tile (exported `TAB_BAR_TILE`; tabs sceneStyle reserves from
  it), background-fade gradient behind so scrolling tabs stay legible. Dead
  `DestinationCard`/`SavedMiniCard` deleted.
- Tests after: **api 541 · web 300 · admin 266 · mobile 167 · mobile-ui 50 ·
  core 42.**

## 2026-07-16 — P5.7 S3: native legal screens + shared LegalDoc source (`9584c22`)

- **Legal content moves to `@tourism/i18n`** (`0ee4bd9`, git mv): the
  privacy/terms/cancellation `LegalDoc` modules leave `apps/web/src/content`
  so web AND mobile render ONE source. Web pages + `legal-article` swap only
  their import; content byte-identical; web 300 tests + production build
  verified green. DB/API/admin: zero touch (analyzed before approval).
- **Mobile `legal/[doc]` reader** (Navel Screen-13): 96px icon tile, Fraunces
  32pt title, "Last updated" line, numbered UPPERCASE section headings and
  line-height-24 body (rescaled once on device feedback — proportions/air,
  not components, were what was "missing"). Unknown doc → redirect home.
- **Account tab**: privacy/terms rows stop opening the web browser → native
  pushes; NEW "Cancellation & refund policy" row (content mobile never had).
  **Sign-up** gains a non-blocking "agree to Terms and Privacy" line with
  tappable links (Navel keeps Terms in the register flow; guest-first kept —
  no forced checkbox).
- Also same-day (pre-merge, on main): **email fixes** (`0667c46` + `f1cc7b4`)
  — hidden preheaders w/ collapse-proof padding for the 3 Supabase auth
  templates AND the API layout (the "N Nexora N" Gmail-snippet leak), CTA
  buttons centered + wrappable across all templates. User re-pastes the
  Supabase three; API side lands on next deploy.
- Tests after: **api 541 · web 300 · admin 266 · mobile 164 · mobile-ui 48 ·
  core 42.**

## 2026-07-15 — P5.7 S2: auth screens on the Navel language (`926ac28`)

- **Sign-in / sign-up / forgot reskinned** (Navel Screen-4/10, modals kept):
  shared `AuthHero` — photo owns ~42% of the window and dissolves into the
  emerald background (gradient to the BACKGROUND color, no seam), Fraunces
  hero title in the blend; images reuse the bundled onboarding set.
- **`TextField` gains an `underline` variant** (mobile-ui): icon +
  placeholder + hairline, no box/label; `accessibilityLabel` falls back to
  the placeholder (tested) so screen readers and existing specs keep
  working. Auth fields switch to it with brass leading icons.
- Rhythm per device feedback (2 rounds): wide gaps, "Forgot password?"
  inline with the password row, switch-links pinned to the screen bottom
  via flexGrow, form gutters 28dp w/ hero title aligned. Deliberately NO
  social/Face ID rows (no real OAuth/biometric behind them). Auth logic
  byte-identical.
- Tests after: **mobile 161 · mobile-ui 48** (others unchanged).

## 2026-07-15 — P5.7 S1: first-launch onboarding + branded splash (`70f756e`)

- **Onboarding pager** (Navel Screens 1-3, guest-first adaptation): 3
  full-bleed pages (bundled 1440x2880 portraits from the project's own seed
  media) + dash indicator + brass arrow; last page = "Sign in / Explore as
  guest" (auth never blocks — locked decision). AsyncStorage-gated root
  takeover BEFORE the router Stack; splash held until the flag resolves (no
  flash); "Sign in" opens the auth modal after Stack mount. TDD on the flag
  helper (storage errors never block the app).
- **BrandSplash (S1b, Navel Screen-0 spirit, own mark):** Fraunces "N"
  monogram in a GlowBadge halo + `messages.brand` wordmark/tagline, ~1.1s
  minimum display, FadeOut into onboarding/Home. Native splash background
  `#ffffff` → `#14231c` (killed the day-one white flash).
- **Dev loop:** `apps/mobile/start-dev.ps1` auto-detects the Wi-Fi IPv4 for
  `REACT_NATIVE_PACKAGER_HOSTNAME` (survives home/school network hops).
- **Gotcha (new variant of a known one):** `expo install expo` (54.0.35 →
  54.0.36) left stale `expo@54.0.35` peer snapshots on the `expo-*` packages
  → duplicated `expo-image` in `.pnpm` → jest mock resolution missed the
  second copy ("getDevServer null.match"). Fix: `pnpm --filter
  @tourism/mobile update expo "expo-*"` + delete orphaned `.pnpm` dirs —
  same class as the 2026-07-15 worklets incident.
- Tests after: **api 541 · web 300 · admin 266 · mobile 160 · mobile-ui 47 ·
  core 42.**

## 2026-07-15 — P5.6 "Nexora Dark Heritage": full mobile dark redesign R1→R3 (`bd67d54`)

- **The whole app moved to the Navel-translated dark language in one program**
  (19 commits, user-approved wave-review at R1 then combined R2+R3 per the
  user's one-pass decision): dark token ramp (emerald `#14231c` canvas ·
  brass `#d2a657` dark CTA · cream text; light values untouched) + forced
  dark scheme (`ThemeProvider scheme` prop; OS setting ignored; light toggle
  backlog) + `hero` 40pt Fraunces type variant.
- **6 new/upgraded `@tourism/mobile-ui` primitives:** `ScrimImage` (uniform
  photo grade tint + legibility scrim — every image in the app renders
  through one recipe) · `FloatingTabBar` (floating pill, icon-only, brass
  active capsule; minimal structural props — @react-navigation/bottom-tabs
  is not resolvable and adding it risked react-navigation duplication) ·
  `StickyCTABar` · `GlowBadge` (one confirmation template, tone-swapped) ·
  `Card` `media` variant · `Button` two-tier `ready` state (visual-only,
  never blocks presses).
- **Screens:** image-forward Home (hero greeting · peeking snap rails ·
  media cards) · Explore (full-width media cards · count chip · filter-sheet
  `ready` apply) · tour detail (full-bleed 420px hero pager w/ scrim overlay
  - tappable vertical thumbnail rail + `StickyCTABar`) · booking sheets/steps
  (skin only — money-path logic byte-identical) · result screens on
  `GlowBadge` · shared `EmptyState` · auth display headings · trips/saved/
  booking-detail polish.
- **Adversarial review (money path): 6 findings, 5 fixed** (`d68c4a8`: iOS
  hero-swipe dead zone under the overlay · StickyCTABar under-clearance at
  large font scales · CTA slot clipping · red glow on REFUNDED · stale
  gallery rail index), 1 accepted (filter `ready` false-positive on bucket
  reorder). Verdict: result phase machine, AppState verify, guards,
  handlers, testIDs — identical to main.
- **P5.7 screen-by-screen program opened:** Navel 102-export index
  (51 dark/light twin pairs) at
  [06-specs/2026-07-15-navel-screen-index.md](06-specs/2026-07-15-navel-screen-index.md);
  locked: onboarding→Home w/ optional auth (guest-first preserved) · merge
  cadence = small branch per screen. First screen: onboarding (S1).
- Tests after: **api 541 · web 300 · admin 266 · mobile 153 · mobile-ui 47
  (34→47) · core 42.**

## 2026-07-15 — Mobile Expo Go revival · combined device pass ✅ · P5.6 spec (`13ad533`)

- **Fix (`13ad533`):** three latent env bugs had killed Expo Go boot since
  reanimated landed 2026-07-08 (masked until now because the device pass was
  deferred): (1) pnpm auto-resolved `react-native-worklets` **0.8.3** against
  Expo Go 54.0.8's **0.5.1** native → `installTurboModule` arity crash;
  (2) `babel-preset-expo`'s `hasModule('react-native-worklets')` resolves from
  the preset's own context — blind under pnpm's strict layout — so the
  worklets babel plugin was **never applied** → "[Worklets] Failed to create
  a worklet"; (3) the `expo-router` subtree kept a stale 0.8.3 peer
  resolution `pnpm dedupe` couldn't collapse. Fix: pin worklets 0.5.1 in
  `apps/mobile` + `libs/mobile/ui`, add an explicit `apps/mobile/babel.config.js`
  (preset + `react-native-worklets/plugin`), force-re-resolve expo-router.
- **Dev-loop gotcha (no code change):** Metro can advertise a dead adapter's
  `169.254.x.x` IP in the QR → Expo Go blue screen "Failed to download remote
  update". Fix: `$env:REACT_NATIVE_PACKAGER_HOSTNAME = '<Wi-Fi LAN IP>'`
  before `expo start` (re-set per terminal session / per network).
- **Combined on-device pass PASSED (user, Android Expo Go):** N3 five-tab
  IA + Home states · N2 sheets + stepped booking · N1 feel · W4 payment loop
  (Stripe test card · PayPal sandbox · abandon→Pay now · cancel ·
  cancellation-request · guest gating). **The standing device-pass debt is
  cleared** — mobile is verified end-to-end on a real device.
- **P5.6 "Nexora Dark Heritage" spec approved** (`53eac51`): Navel-inspired
  dark-first redesign, Fraunces kept w/ Navel scale, 3 waves R1→R3,
  presentation-layer only ([spec](06-specs/2026-07-15-p56-mobile-navel-redesign-design.md)).
  Reference kit exports gitignored (`.png/`).
- Tests after: **api 541 · web 300 · admin 266 · mobile 153 · mobile-ui 34 ·
  core 42** (all unchanged — the fix is dependency/config-only).

## 2026-07-14 — AI Concierge Chat: bot-first web chat over the API (`74ef17f`)

- **Phase 2 of the chat direction** (locked earlier the same day): visitors
  chat with an **AI concierge** — web Sheet panel (first real use of the
  `@tourism/ui` chat set: bubble · message · message-scroller · marker;
  markdown replies, suggestion chips, "Talk to a human" → WhatsApp) opened
  from a new "Chat with us" channel at the top of the contact launcher.
- **API `ChatModule`** — the repo's **first SSE surface**: `POST
  /api/v1/chat/messages` streams an AI SDK UIMessage response over raw
  Express `@Res()` (bypasses the Transform envelope); `GET
  /chat/conversations/:id/messages` replays. **AI SDK v7** (`ai@7.0.22`,
  ESM-only — loaded via Node ≥22.12 `require(esm)`; jest mocks the module) +
  `@ai-sdk/anthropic`, model env-swappable (`CHAT_MODEL`, default
  `claude-haiku-4-5`). Tools call services in-process: `searchTours`,
  `getTourDetails` (itinerary/FAQs/policies), `submitEnquiry` (consent-gated
  → existing CRM + outbox email). History is server-authoritative
  (client sends only its newest message; client-minted conversation uuid,
  create-on-first-use); persisted in `chat_conversations`/`chat_messages`
  (UIMessage stored verbatim, `seq`-ordered, RLS invariant).
- **Optional identity on `@Public()` routes** (guard change): a present,
  valid JWT attaches `currentUser` for personalization; invalid tokens stay
  anonymous — never a 401 on a public route.
- **Spend/abuse caps, all server-side**: 10 msg/min/IP (+30/min GET) ·
  `maxOutputTokens` 800 · 4 tool-steps · 20-message window · 200-message
  conversation cap · text-only parts, ≤2000 chars, ≤8KB payload · **1 enquiry
  per turn**. No key configured ⇒ 503 `CHAT_UNAVAILABLE` and the panel shows
  its unavailable state (site unaffected — key can land after deploy).
- **Adversarial review (money-path rule): 12 findings, 7 fixed** (`704a318`:
  enquiry cap/turn · windowed history fetch · payload-smuggling guard ·
  create-race fallback · persist seq-retry · GET throttle · **`trust proxy`**
  — without it every client shared ONE throttle bucket behind Render), 5
  accepted + pinned in the plan STATUS.
- Deploy to-dos (HANDOFF): `ANTHROPIC_API_KEY` on Render (owner adds later) ·
  `NODE_VERSION` ≥ 22.12 · `prisma migrate deploy` for the new migration ·
  Anthropic spend alert.
- Tests after: **api 541 (+42)** · **web 300 (+9)** · admin 266 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-14 — Web "Contact Launcher": WhatsApp deep-link + enquiry popover (`73b35a9`)

- The floating "Plan your trip" bubble becomes a channel **popover**:
  **WhatsApp click-to-chat** (`wa.me` + URL-encoded prefill; on tour detail
  pages the message carries `"tour title" — URL`, title taken from
  `document.title` at open time — no server→client plumbing) and **Send an
  enquiry** (→ `/contact`, the CRM path, always present).
- **Env-driven channels**: `NEXT_PUBLIC_CHAT_WHATSAPP` (international digits;
  documented in `.env.example` + env runbook) — unset ⇒ WhatsApp hides itself,
  so deploying before the number exists is safe. Future channels
  (Messenger/Telegram/LINE/Kakao) are config entries, not component changes.
- Hidden on the money-path (`/checkout*`, `/tours/[slug]/book`); auth routes
  already bare via AppShell. Popover = `@tourism/ui` Base UI (focus/Esc/aria
  wired by the primitive); copy via new `messages.contactLauncher`.
- Direction pivot recorded in the spec: external deep-link chat shipped INSTEAD
  of in-web realtime chat; the spec's appendix preserves the phase-2 research
  (in-web Supabase Realtime design — Broadcast not postgres_changes, writes via
  API, anon auth + quotas · Business-API prereqs (Meta verification / Zalo OA
  needs GPKD) · messaging-app × VN-inbound market map).
- Review: 1 build break self-caught (`as const` literal `useState` inference,
  fixed `88f84c2`); reviewer pass clean (Base UI API, env inlining, pathname
  edges, tokens/a11y verified). Spec: `docs/06-specs/2026-07-14-contact-launcher-design.md`.
- Tests after: api 499 · **web 291 (+30)** · admin 266 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-13 — API-W3 "CRM/analytics": moderation audit · hasReview + /reviews/mine · costPrice margin (`0547270`)

- **Closes the API debt program** (W1 email `7c64852` → W2 ops `7e51a24` →
  W3) — all three waves shipped the same day.
- **Moderation audit**: every review approve/reject writes
  `moderatedById/moderatedAt` in the same tx (migration adds the columns +
  FK SetNull); admin reviews drawer shows "Moderated by … · time"; moderate
  now requires a synced admin (400 `USER_NOT_SYNCED`).
- **hasReview** on customer bookings (`/bookings/me` + detail; optional in
  Swagger — write-path responses omit it) — the web review prompt hides
  itself without probing for a 409 (409 stays as the race backstop; prompt
  keyed per booking against App-Router state reuse). New **`GET
  /reviews/mine`** (own reviews incl. pending, cap 50).
- **Margin analytics**: `Tour.costPrice` (per traveller, admin-only input on
  the tour form) + per-currency `cost`/`margin` on the dashboard revenue
  card (3rd raw aggregate over the same PAID set; upper-bound footnote).
  **`costPrice` is stripped from every public tour surface** (self-caught;
  review verified all vectors closed) and only `AdminTourDetailDto` declares
  it.
- Review should-fix (fixed + pinned): tour `currency` becomes immutable once
  PAID bookings exist — 409 `TOUR_CURRENCY_LOCKED` (a later currency edit
  would mis-bucket per-currency margin).
- Typed client regenerated (additive); FE touches by a sonnet subagent
  (tour form · dashboard margin lines · reviews audit line · review prompt).
- Tests after: **api 499** (+10) · **admin 266** (+2) · web 261 · mobile 153
  · mobile-ui 34 · core 42.

## 2026-07-13 — API-W2 "Ops hardening": cancel-departure auto-refund · unpublish guard · orphaned-capture refund (`7e51a24`)

- **Cancel-departure flow (A-DEP-3)**: `PATCH … status: CANCELLED` stops
  being a silent flag — kills PENDING bookings, then sequentially
  auto-refunds every PAID booking through `refundByAdmin` (provider-first,
  idempotent, refund email now carries a **Reason** row), returning a
  `cancellation` summary `{paidTotal, refunded, skipped, failed}`; admin
  shows a clean/attention toast. Requires a synced admin (400
  `USER_NOT_SYNCED`). `DeparturesModule` imports `BookingsModule` (acyclic).
- **Review MUST-FIX (found by the strong-tier adversarial pass, fixed +
  pinned)**: a payment completing AFTER the booking was cancelled underneath
  the buyer used to be silently kept (`already_processed`). New
  `claimSeatsForPaid` outcome `'cancelled'` → both the Stripe webhook
  (generalized `refundOrphanedCapture`) and the PayPal capture webhook now
  refund the orphaned capture and flip the booking REFUNDED.
- **Unpublish guard (A-TUR-4)**: unpublishing a tour with
  PAID/PARTIALLY_REFUNDED bookings on upcoming departures → 409
  `TOUR_HAS_ACTIVE_BOOKINGS`; boundary is start-of-today UTC so a departure
  leaving today still counts (review should-fix).
- **PayPal fail-fast**: client id/secret required non-empty at boot;
  `PAYPAL_WEBHOOK_ID` may stay empty in dev (no inbound webhooks locally).
- **Dead config wired**: `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT` now drive
  the enquiry + newsletter throttlers (`forRootAsync`); enquiry's 5/min
  per-route override stays.
- Typed client regenerated (additive: `DepartureCancellationSummaryDto` +
  `NEWSLETTER_WELCOME`); admin flash keys `departure-cancelled[-issues]`.
  Self-caught fix: the admin action double-unwrapped the API envelope.
- Tests after: **api 489** (+16) · web 261 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-13 — API-W1 "Email revival": cancellation dispatch · branded templates · replyTo · newsletter welcome (`7c64852`)

- **Closes the email code debt** flagged in the 2026-07-13 API analysis, on
  the domain unlocked the same day.
- `CANCELLATION_REQUESTED`/`CANCELLATION_DENIED` get real templates +
  dispatch cases (previously fell into the `default`: warn + marked SENT
  without sending). Refund email now shows **`refundedAmount`** (partial: "of
  $total paid" + booking-stays-active) — hydrate-side fix only; the refund
  CTEs gate on `status='PAID'` so per-booking dedupe was already correct.
- New `RESEND_REPLY_TO_EMAIL` (optional, Joi format-validated like
  `RESEND_FROM_EMAIL` now is) → every send carries Reply-To; replies no
  longer bounce against the MX-less root domain.
- New `NEWSLETTER_WELCOME` EmailType (+ `ALTER TYPE` migration, deployed to
  live) — subscribe enqueues in a short tx with dedupe
  `newsletter-welcome:{email}`: one lifetime welcome per address (documented
  decision: no re-welcome after admin removal; oracle-free endpoint
  preserved).
- **All 7 Resend renderers re-skinned** to the user-approved v2 design (port
  of react.email "Barebone", MIT): 640px frame → centered gray card → white
  data card → emerald button; booking confirmation embeds the tour hero
  image (IMAGE-only after review) + `/account/bookings` CTA; all
  user-controlled content HTML-escaped (hostile-payload tests). The 3
  Supabase auth templates in `docs/email-templates/` rewritten on the same
  shell (paste pending, with the user).
- Review (strong tier): 0 must-fix · 1 should-fix fixed + pinned (VIDEO hero
  → broken `<img>`) · verified correct: refund amounts, XSS/escaping, outbox
  consume-vs-retry semantics, DI, config end-to-end.
- Tests after: **api 473** (+34) · web 261 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-13 — Custom domain + outbound email live (dashboards only, docs-only commit)

- **`nexora-travel.agency`** bought via Vercel Domains ($5.99 first year,
  auto-renew OFF — project-year domain) and wired end-to-end, no code change:
  Vercel (web `www.` canonical + apex 308, admin `admin.`, `NEXT_PUBLIC_SITE_URL`) ·
  Render (`FRONTEND_URL`, `CORS_ORIGINS` — old `*.vercel.app` kept as fallbacks) ·
  Supabase auth URLs · **Resend domain Verified** (Tokyo; DKIM/MX/SPF via the
  Vercel Auto-configure integration; click tracking off) · real
  `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (`Nexora <noreply@nexora-travel.agency>`).
- **Unblocks the oldest deferred debt**: the 4 wired EmailTypes (booking
  confirmation · refund · review approved · enquiry ack) now deliver — first
  live enquiry-ack landed in a Gmail **inbox** (not spam) same day.
- Remaining email debt is code-side only (API-W1, analyzed 2026-07-13, not
  started): cancellation templates + dispatch cases · partial-refund amount
  wording. Optional: Supabase auth SMTP via Resend.
- Docs swept: [deploy §5b](05-runbooks/deploy.md) (new) ·
  [env-and-secrets](05-runbooks/env-and-secrets.md) · HANDOFF · roadmap ·
  functions-system S-JOB-1. Tests: n/a (no code).

## 2026-07-13 — Journal seed content enriched to long-form + SEO meta (`a304109`)

- Diagnosis (user report: Journal reads short/shallow): the 10 seeded posts
  averaged **27 words** — the reader UI (outline rail · scroll progress ·
  reading time · typeset · related tours) was starved, not under-designed.
- New `fixtures/post-content.cjs`: 10 EN long-form articles (700–1,022
  words) with the mandated structure — intro · 4–7 `##` sections (+`###`) ·
  ≥1 list · a "Local tip" blockquote · 1–3 inline images (URLs reused from
  fixture media, topically matched) · tour-handoff close; 2 markdown tables
  exercise `.typeset-scroll`. `metaTitle` ≤70 + `metaDescription` ≤160 filled
  for all 10 (the wave-C SEO columns were empty).
- `gen.cjs` sources content/meta from the module (throws on a missing slug);
  varchar caps +70/160; fixtures regenerated + self-validated (429 records).
- New `prisma/refresh-post-content.ts` + nx target `refresh-posts` —
  executed against live Supabase post-merge: **10 updated, 0 skipped**.
- 3 DRAFT posts stay DRAFT (admin-authoring fixtures). No schema change.
- Tests after: unchanged — api 439 · web 261 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-12 — Web wave W4: shared AuthFormField · noValidate completion · auth titles (`ff058e9`)

- **Closes the web debt program W1 → W2 → W3 → W4** (opened 2026-07-12 from
  the 3-agent web audit).
- New `AuthFormField` centralizes the field group repeated 17× across 7
  auth/account forms (wrapper · Label · Input · AuthFieldError · aria
  wiring): 16 sites migrated DOM-equivalent (`after` slot carries login's
  forgot-password link, `hint` carries profile's email caption,
  display-only fields omit error wiring); the new-password composite
  (visibility toggle + strength meter) stays bespoke by design. Aria props
  are locked against rest-spread clobber (type `Omit` + computed-props-last
  spread) with a native-`required` regression guard in the 10-test RTL spec
  (barrel-mock pattern from trust-band).
- Sanctioned DOM delta: valid state omits `aria-invalid` instead of
  rendering `"false"` — ARIA default, AT-neutral, styling only matches
  `"true"`.
- `noValidate` completion: profile-form (the only auth/account straggler) ·
  booking-actions cancel-reason · hero + blog search — **all 17 web forms
  now comply with the standing rule.**
- login/register tab titles read `messages.auth.*.title` (login copy
  unified: "Sign in" → "Welcome back", matching the on-page heading).
- Adversarial review: 0 block-merge · 2 should-fix hardenings folded in ·
  3 nits (2 recorded in the spec, 1 fixed).
- Tests after: web 261 (+9). api 439 · admin 264 · mobile 153 · mobile-ui
  34 · core 42 unchanged.

## 2026-07-12 — Web wave W3: cleanups (dead code · i18n sweep · SectionHeading) (`0b8dc66…a127979`)

- Final wave of the web debt program. No new runtime logic — deletion,
  copy-relocation, and one presentational component.
- **Dead code:** `apps/web/src/lib/tours.ts` reduced 335 → 64 lines (types only;
  `TourDetailVM`/`TourReview`/`ItineraryDay`/`Departure`/`TourBadge` kept, all 6
  importers are `import type`). Dropped the pre-API fixture generator + its
  `getBySlug`/`destinations.fixtures` imports; `destinations.fixtures` stays
  (still live).
- **i18n sweep:** 8 pages' `Metadata` moved into a new `messages.pageMeta` group;
  titles are stored PLAIN so the root `title.template` (`%s — Nexora`) appends the
  brand once — **fixing the "— Tourism Platform" branding bug** (verified in built
  HTML: `About us — Nexora`). Shared duplicated aria copy consolidated:
  `common.breadcrumbLabel` (4 sites) · a `pagination.*` group (10 sites across
  tours-listing / region-tours / blog) · `common.emailPlaceholder` (3 auth forms)
  · `auth.register.namePlaceholder` · `booking.datePicker.*`. Deleted the now-dead
  `messages.blog.loadError` (W2 orphaned it).
- **Discovered + fixed in-wave:** `login`/`register`/`forgot`/`reset`/`account*`/
  `checkout/*`/`tours/[slug]/book` (12 pages) were **double-branding**
  ("… — Nexora — Nexora") by manually appending `${brand.name}` on top of the
  template — a pre-existing bug; now they set a plain title and brand once.
- **SectionHeading:** new `apps/web/src/components/section-heading.tsx` (mirrors
  the mobile prop shape: `{eyebrow?,title,subtitle?,as?,align?,tone?,className?}`).
  Migrated **15** hand-rolled section headers to it (marketing · destinations ·
  contact · blog "Tours in this story"), preserving align/tone/heading-level/
  spacing. Left bespoke on principled type-scale grounds: `trust.tsx`,
  `related-tours.tsx`, the 4 `region-signature*` bands, and the accent-bar
  `TourSection` family — no god-component.
- **FormField deferred to W4** (its own wave; picks up the `account/profile-form.tsx`
  missing-`noValidate` bug then). No BE changes.
- Adversarial review (opus): clean on all 6 dimensions (branding, key mapping,
  no dropped subtitles, correct onMedia tone, no dangling refs, no unused imports).
- Tests after: web 252 (unchanged — no new logic). api 439 · admin 264 · mobile
  153 · mobile-ui 34 · core 42 unchanged.

## 2026-07-12 — Web wave W2: resilience layer (loading · error · 404 · empty-vs-failed) (`afbc163…1d7fc24`)

- Second wave of the web debt program. apps/web had ZERO `loading.tsx` /
  `error.tsx` / `not-found.tsx` / `global-error.tsx`; an API outage rendered a
  silent blank or a *lying* "no results" empty state (the swallow
  `.catch(() => [])` is deliberate for Render cold-starts and stays — W2 just
  makes failure distinguishable from a real empty result).
- Pure logic (TDD): `lib/resilience.ts` — `settle()` (wraps a fetch, never
  throws → `{ ok, data }`) + `contentState()` (`failed` wins over `isEmpty`, so
  an outage never masquerades as empty). Red→green, 5 assertions.
- Two isolated components: `LoadErrorState` (inline section-level "couldn't
  load", retry = `router.refresh()`) + `ErrorState` (full-page branded panel,
  presentational so it works in server `not-found` and client `error` alike).
- 7 shape-matched skeletons (`components/skeletons/*`) behind 7 `loading.tsx`
  (tours + tours/[slug] · destinations · blog + blog/[slug] · account ·
  checkout) — split by depth so a detail nav never flashes the list skeleton;
  pulse inherits the `global.css` reduced-motion baseline. Highest value on the
  `force-dynamic` account + checkout routes.
- 4 boundaries reusing `ErrorState`: `app/error.tsx` (reset + home) ·
  `app/not-found.tsx` (brand 404 → home/tours/blog, upgrades every `notFound()`
  in tour/blog/region detail) · `app/global-error.tsx` (self-contained
  html/body + `global.css`) · **`checkout/error.tsx`** (money-path reassurance —
  "your payment is safe, we're confirming").
- Empty-vs-failed wiring: tours + destinations no longer show a lying empty
  state on outage (hero stays, honest "couldn't load + retry" replaces it);
  blog moves onto the shared helper and *gains* the retry it lacked. Home left
  untouched by design (its hero + static sections already prevent a blank page).
- New i18n `resilience` group + `toursPage.loadError`. Home swallow untouched;
  no `destinations/[region]/loading`; no BE changes, no migration.
- Adversarial review (opus): 0 issues — App Router special-file signatures,
  server/client boundaries, empty-vs-failed precedence, hex/quote/reduced-motion
  all verified clean. 2 non-blocking cosmetic notes (global-error font fallback
  by design; destinations failure composition — eyeball on deploy).
- Tests after: web 252 (+5). api 439 · admin 264 · mobile 153 · mobile-ui 34 ·
  core 42 unchanged.

## 2026-07-12 — Web wave W1: review form · suitableFor chips · contact lead fields (`ce8da9e`)

- Opens the user-approved web debt program W1 → W2 → W3 (from a 3-agent
  audit: BE-coverage gaps · in-code debt · docs-recorded debt). Cut for good:
  destination/category landing pages (region-first IA stays); auth flows stay
  inline-only by design.
- "Rate this trip" on PAID booking detail — the API's PAID-gated
  1-per-booking `POST /reviews` finally has a UI: star radiogroup (real
  WAI-ARIA semantics: roving tabindex + arrow keys), title/body validated to
  the exact BE limits (TDD boundary specs), server action re-validates and is
  total vs crafted non-string payloads; 409 `REVIEW_ALREADY_EXISTS` → calm
  "already reviewed" panel (no hasReview flag exists — optimistic offer);
  success → awaiting-moderation panel; action-transport failure can't brick
  the form.
- suitableFor merchandising rendered end-to-end: mappers add the field
  (unknown future enum values filtered via `knownTravellerTypes`, TDD) →
  "Ideal for" chips on tour detail hero, TourCard row and the /tours
  TourListCard tag pills (which finally have real data — themes/styles were
  dead facets). New `messages.travellerTypes` map.
- Contact form sends the full CRM lead set (nationality · travelDate ·
  groupSize · budgetTier) — `ChoiceChips` lifted out of plan-trip-form into a
  shared component; `buildContactPayload` normalizers TDD'd; CTA form stays
  minimal by design.
- Adversarial review: 0 block-merge · 4 should-fix + 2 nits fixed pre-merge
  (stuck-submitting catch · radiogroup keyboard contract · /tours surface gap
  · crafted-input totality · unknown-enum filter · double-submit guard);
  1 nit accepted (PlanTrip-consistent groupSize edge normalization).
- No BE changes, no migration.
- Tests after: web 247 (+15). api 439 · admin 264 · mobile 153 · mobile-ui
  34 · core 42 unchanged.

## 2026-07-12 — Blog article body styled by shadcn/typeset (`c939773`)

- Vendored `typeset.css` (ui.shadcn.com/typeset.css, 490 lines) into
  `apps/web/src/app/` + an owned `.typeset-article` preset preserving the
  pre-Typeset voice on tokens (muted body / foreground headings · primary
  links/markers/blockquote · 7rem heading `scroll-margin` for the outline
  rail · rounded imagery); imported after tokens in `global.css`.
- `post-content.tsx` drops its ~15-rule per-element className map — only
  behavior renderers remain (heading anchor ids · lazy `img` ·
  `.typeset-scroll` wide-table wrapper). `rehype-raw` stays disabled.
- Groundwork for the upcoming blog-display adjustments: article typography
  is now 3 CSS variables + presets in one owned file.
- Admin Write|Preview keeps its own older render map — will be aligned in
  the blog-display pass.
- Tests after: unchanged — api 439 · web 232 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-12 — @tourism/ui gains shadcn's new chat/AI components (`aa69190`)

- Installed the 5 newest registry components via the base-nova (Base UI)
  registry: `attachment` · `bubble` · `message` · `message-scroller` ·
  `marker` — 54 → 59 shadcn components. New dep `@shadcn/react@^0.2.1`.
- Deliberately skipped: `native-select` (user prefers the existing Select
  design) and `toast` (still deprecated upstream in favor of sonner).
- Install notes: the CLI's `button.tsx` overwrite was reverted (diff was
  import-alias/quote style only); new files normalized to the lib's relative
  import convention; `marker`'s `MarkerContent` barrel-aliased to
  `AnnotationMarkerContent` (name collides with mapcn `map.tsx`'s, already
  consumed by the web contact map).
- Tests after: unchanged — api 439 · web 232 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

## 2026-07-12 — From-scratch setup guide: own Supabase + Google OAuth, env acquisition, seeding (`a4e6817`)

- New `docs/04-guides/from-scratch-setup.md` (user request after the
  restructure): two onboarding paths (FE against the live API vs a fully
  self-provisioned stack) · Supabase project + Google OAuth provider
  step-by-step (Google Cloud Console redirect URI gotcha) · per-service key
  acquisition (Stripe test / PayPal sandbox / Cloudinary / Resend / Sentry)
  with required-at-boot flags · migrate → seed flow incl. `BK-SEEDPAID`
  mechanics and the seeded-accounts-are-local-rows semantics · verify loop +
  troubleshooting table.
- Facts audit-sourced from code, surfacing three onboarding traps now
  documented: `RESEND_API_KEY` is required at boot (not optional) · mobile
  had NO `.env.example` despite 4 required no-default `EXPO_PUBLIC_*` vars
  (file added) · fixture media publicIds 404 on a fresh Cloudinary account.
- `apps/web/.env.example` gains `NEXT_PUBLIC_SITE_URL`; getting-started /
  env-and-secrets / docs index cross-linked; stale "Mobile — scaffold only"
  row in getting-started fixed.
- Tests after: unchanged — api 439 · web 232 · admin 264 · mobile 153 ·
  mobile-ui 34 · core 42.

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
