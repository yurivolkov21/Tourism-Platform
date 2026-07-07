# P5 mobile — Wave 3: Auth & Account (Supabase sign-in, profile, wishlist)

- **Date:** 2026-07-07
- **Phase:** P5 (mobile), Wave 3 of 4 — follows W2.5 Design Language (merged
  2026-07-07). **UI direction is locked: "Brand 100% + Structure native".**
- **Scope:** `apps/mobile` (auth modals · Account tab · Saved tab · wishlist
  hearts · authed API client) · `@tourism/i18n` (a `mobile.account`/`saved`
  section; web `auth.*` copy reused). **No backend changes** — `POST
  /auth/sync`, `GET/PATCH /users/me`, `GET /wishlist/me`,
  `POST|DELETE /wishlist/:tourId` all exist and are typed.
- **Process:** branch `feat/mobile-w3-auth-account`, main checkout, executed
  **inline**. TDD on pure logic; device-polish checklist applies to every new
  screen.

## Locked decisions (brainstorming 2026-07-07)

1. **Guest-first.** Browse/detail/enquiry stay open; auth is asked for only at
   personal features (wishlist heart, Saved tab, Account tab).
2. **Auth screens = Login + Register + Forgot** (3 modal screens). Password
   reset completes on the existing web reset page (the email link) — the app
   shows guidance after sending; no deep-link handling this wave.
3. **Account tab (W3 cut) = lean profile**: avatar initial + name + email ·
   edit display name (`PATCH /users/me`) · shortcut to Saved · Privacy/Terms
   links (open the deployed web) · Sign out. Security/delete-account/avatar
   upload deferred.
4. **Wishlist hearts on cards AND detail** (mobile goes one step beyond web's
   detail-only heart — locked direction allows task-serving additions). Guest
   tapping a heart → sign-in modal ("Sign in to save tours" copy); after
   signing in the user returns to where they were and taps again (no pending-
   action replay — keep it simple). Saved tab: guest sees a styled sign-in
   invitation; signed-in sees the saved list with remove.

## Verified facts (2026-07-07)

- **Supabase on Expo (official quickstart, live docs):**
  `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage`
  and `react-native-url-polyfill`; `createClient(url, key, { auth: { storage:
  AsyncStorage, autoRefreshToken: true, persistSession: true,
  detectSessionInUrl: false, lock: processLock } })` + an `AppState` listener
  toggling `startAutoRefresh()/stopAutoRefresh()` (registered once). All Expo
  Go-compatible. *(Deviation from the W1 note "secure-store token":
  SecureStore has a 2KB/value limit that Supabase session JSON can exceed —
  AsyncStorage is the official pattern; the encrypted "LargeSecureStore"
  variant is a hardening follow-up, not W3.)*
- Web env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (browser client) → mobile mirrors the same values as
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` in
  `apps/mobile/.env` (public by definition, like the API base URL).
- `createApiClient({ baseUrl, getToken? })` (`@tourism/core`) already attaches
  `Authorization: Bearer <token>` per request via the injected callback —
  mobile's `lib/api.ts` just hasn't passed `getToken` yet.
- Web signs in with email/password, then mirrors the user via **`POST
  /auth/sync`** (idempotent; body `SyncUserDto { fullName?, phone? }`);
  authed reads hit `/users/me`. **`PATCH /users/me`** takes
  `UpdateMeDto { fullName?, phone? }` → `UserDto { id, supabaseId, email,
  fullName, phone, … }`; 401 when the JWT is missing/not synced.
- Wishlist API: `GET /wishlist/me` → `WishlistItemDto[]` (`tourId` +
  embedded `tour { slug, title, media[], basePrice, currency }`);
  `POST /wishlist/:tourId` (idempotent) / `DELETE /wishlist/:tourId`.
  Web maps to `SavedTour { tourId, slug, title, image, basePrice, currency }`.
- Shared i18n already has the full web auth copy: `auth.login.*` (title,
  labels, submit, forgot/register CTAs), `auth.register.*` (incl. fullName +
  confirm), plus `account.*` sections — mobile reuses; only a small
  `mobile.account`/`mobile.saved`/`mobile.authPrompts` layer is new.
- Existing mobile pieces W3 builds on: `TextField` (label/error/leading),
  `Badge/Skeleton/Button/Card`, modal route pattern (`presentation: 'modal'` +
  `slide_from_bottom`), `TourCard` with locked rows (heart slots into the
  image's top-right — badges sit top-left), TanStack Query + the
  `['wishlist', …]` key space is free. Tests baseline: mobile 41 · mobile-ui
  31.

## Design

### 1. Auth infrastructure (`apps/mobile/src/lib/`)

- **`supabase.ts`** — the official-pattern client (facts above); reads
  `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` via a small `env.ts` extension
  (validated like the API base URL, fail-early message).
- **`auth.ts`** — pure helpers (TDD): `validateSignIn({email,password})`,
  `validateSignUp({fullName,email,password,confirm})` (email regex reused
  from enquiry · password ≥ 8 · confirm matches · name required),
  `validateForgot({email})`, all returning i18n error KEYS; plus
  `mapAuthError(error): key` — Supabase error messages → friendly copy keys
  (`invalid_credentials`, `email_taken`, `weak_password`, fallback generic).
- **`auth-context.tsx`** (`src/lib/`): `AuthProvider` mounted in the root
  layout (inside QueryClientProvider). Holds `{ user, session, status:
  'loading' | 'signedIn' | 'signedOut' }` from `supabase.auth.getSession()` +
  `onAuthStateChange`. Exposes `signIn(email,pw)`, `signUp(fullName,email,pw)`
  (passes `data: { full_name }`), `sendReset(email)`, `signOut()`. After a
  successful sign-in/sign-up it fires **`POST /auth/sync`** (body
  `{ fullName }` on sign-up) and invalidates the `['wishlist']` +
  `['profile']` query keys; `signOut()` clears them.
- **`api.ts`** — the singleton client gains
  `getToken: async () => (await supabase.auth.getSession()).data.session?.access_token`.
  Guest requests keep working (token undefined → no header).

### 2. Auth screens (modal stack `apps/mobile/src/app/auth/`)

Routes `auth/sign-in.tsx` · `auth/sign-up.tsx` · `auth/forgot.tsx`, registered
in the root Stack with `presentation: 'modal'` + `animation:
'slide_from_bottom'` (existing pattern). Shared look: Fraunces title +
subtitle (web `auth.*` copy), `TextField` forms, primary submit Button with
loading state, inline field errors, a destructive-colored banner for
submit-level errors, cross-links (login ↔ register ↔ forgot). Behavior:

- **Sign-in**: validate → `signIn` → success `router.back()`; failure banner
  (`mapAuthError`). Keyboard-safe (Screen scroll + persistTaps, as enquiry).
- **Sign-up**: validate (incl. confirm) → `signUp` → `/auth/sync` w/ fullName
  → back. If Supabase email-confirmation is ON the session may be null →
  show the "check your email" state instead of popping (handled via a
  `confirmationSent` state; copy in `mobile.authPrompts`).
- **Forgot**: validate → `sendReset` → success state: "email sent — finish
  resetting on the web page the link opens" + back-to-sign-in.

An optional `?reason=wishlist` param renders a context line on sign-in
("Sign in to save tours") — hearts and the Saved/Account gates pass it.

### 3. Account tab (`(tabs)/account.tsx` — replaces the placeholder)

- `status === 'signedOut'` → **AuthGate** (shared app component: outline icon
  · Fraunces title · body copy · primary "Sign in" → `/auth/sign-in` · caption
  link "Create account" → `/auth/sign-up`). Reused by Saved.
- `status === 'signedIn'` → profile query `['profile']` → `GET /users/me`
  (mapper → `ProfileVm { fullName, email, initial }`, TDD):
  header (56dp circle w/ initial on `secondary` bg + name + email) · **Edit
  name** row (TextField prefilled + Save button → `PATCH /users/me`,
  disabled-while-saving, inline success/error feedback, updates the query
  cache) · menu rows (Ionicons chevron rows): "Saved tours" → Saved tab ·
  "Privacy policy" / "Terms of service" → `Linking.openURL` to the deployed
  web pages · **Sign out** (destructive-tinted row; confirmation not needed —
  signing back in is cheap).

### 4. Wishlist — hearts + Saved tab

- **`lib/wishlist.ts`**: `SavedTourVm { tourId, slug, title, image?, basePrice,
  currency }` + `toSavedTourVm(dto)` (hero-image pick, TDD) ·
  `fetchSavedTours()` · `fetchSavedTourIds()` · `addToWishlist(tourId)` /
  `removeFromWishlist(tourId)`.
- **`useWishlist()` hook** (app-level): `ids` query (`['wishlist','ids']`,
  `enabled: signedIn`) + toggle mutation with **optimistic update** (mutate
  the ids set immediately, rollback on error, invalidate on settle). Exposes
  `isSaved(tourId)`, `toggle(tourId)`, `isGuest`.
- **`HeartButton`** (app component): 32dp circular overlay (background token,
  pressed state, `hitSlop`), `heart`/`heart-outline` Ionicons in `destructive`
  color when saved. Guest tap → `router.push('/auth/sign-in?reason=wishlist')`.
  Placement: TourCard image **top-right** (badges own top-left) — both
  variants; tour detail: next to the back overlay's row, top-right over the
  gallery, *below* the badges row (badges shift down only if both render —
  detail badges stay top-right, heart sits left of them in the same row).
  TourCard gains an optional `heartSlot?: ReactNode` prop so the card stays
  presentation-only (screens inject the heart; specs don't need auth mocks).
- **Saved tab** (`(tabs)/saved.tsx`): guest → AuthGate ("Save tours you love")
  · signed-in → `['wishlist','list']` query → rows (thumb 96×72 · title 2L
  reserved · from-price · trash/heart-slash remove button w/ optimistic
  removal), pull-to-refresh, skeleton loading, empty state ("Browse tours" →
  Explore), error+retry. Row tap → `/tours/[slug]`.

### 5. i18n

New `mobile.authPrompts` (gate titles/copy per surface, wishlist reason line,
email-confirmation + reset-sent states), `mobile.account` (menu labels, edit
name labels/feedback, sign out), `mobile.saved` (title, empty, remove) —
replacing `mobile.placeholders.saved/account` (both die this wave). Web
`auth.login/register/*` reused verbatim for the form copy; error keys map into
a new `mobile.authErrors` (invalid credentials / email taken / weak password /
generic).

### 6. Testing & gate

- **TDD (pure):** the three validators + `mapAuthError` · `toSavedTourVm` ·
  `toProfileVm`.
- **Component tests (mock `lib/supabase` + fetchers):** sign-in (validation
  errors · submit success routes back · banner on failure) · sign-up (confirm
  mismatch · confirmation-sent state) · forgot (sent state) · Account (gate
  when signed out · profile render · edit-name save) · Saved (gate · list ·
  remove · empty) · HeartButton (guest → router.push with reason · saved
  toggle). The `AuthProvider` is mocked at the context level for screen tests
  (a test helper renders children with a stubbed context value).
- **Gate:** lint + typecheck + test for `@tourism/mobile`, `mobile-ui`,
  `@tourism/i18n` + `nx affected --base=main`. All 72 existing tests stay
  green. On-device (Expo Go, light + dark): real sign-up → row appears in
  Supabase + `users` table (via `/auth/sync`) · heart a tour → appears in
  web's account/saved too (same DB) · edit name · sign out/in · guest gates.

### 7. Out of scope (explicit)

Password change / delete account / avatar upload (later account wave) ·
social login · deep-link password reset in-app · pending-action replay after
sign-in · bookings list/detail (W4) · push notifications · biometrics ·
encrypted LargeSecureStore session hardening (follow-up).

### 8. Risks / notes

- **Supabase email confirmation setting** decides the sign-up UX branch — the
  confirmationSent state covers both configurations; verify the project's
  actual setting during on-device testing.
- **`/auth/sync` must succeed before authed API reads** — the API 401s
  unsynced users (`USER_NOT_SYNCED` class of errors). Sync fires on every
  sign-in (idempotent), matching web's retry-once pattern.
- AsyncStorage session = plaintext on device (Expo Go constraint accepted;
  hardening deferred — documented above).
- Heart on the detail gallery must not collide with the back overlay
  (top-left) or badges (top-right) — heart joins the badges row on the right,
  before them.
- New deps are all Expo Go-safe: `@supabase/supabase-js`,
  `@react-native-async-storage/async-storage`, `react-native-url-polyfill`.
