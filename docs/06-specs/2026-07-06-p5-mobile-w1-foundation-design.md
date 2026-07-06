# P5 mobile — Wave 1: Foundation (Expo Router + tokens theme + real-data Home)

- **Date:** 2026-07-06
- **Phase:** P5 (mobile) kick-off — roadmap row was ⬜; this spec covers **Wave 1
  of 4** and locks the P5-wide decisions.
- **Scope:** `apps/mobile` (Expo SDK 54 scaffold → routed, themed app with a
  real-data Home) · `libs/mobile/ui` (`@tourism/mobile-ui` — first real
  primitives + theme provider) · `libs/shared/tokens` (additive RN theme output:
  oklch → hex) · `@tourism/i18n` (new `mobile.*` copy section). **No backend
  changes.**
- **Process note:** mobile work runs in a dedicated git worktree
  (`.claude/worktrees/mobile-w1-foundation`, branch `feat/mobile-w1-foundation`)
  because a parallel session owns the main checkout (real-content-authoring
  lane). Nothing in this wave touches that lane's files (seed, media, web
  imagery).

## Locked decisions (brainstorming 2026-07-06)

1. **Customer-only app.** No admin surface on mobile — admin stays
   `@tourism/admin` on web. P5 = browse → tour detail → booking → account.
2. **Dev loop = Expo Go on a physical Android phone** (user choice; Windows
   host). Hard constraint for W1–W3: **Expo Go-compatible dependencies only**
   (no custom native modules, no dev-client builds, no `eas init`). Checkout in
   W4 therefore goes through the **hosted** Stripe/PayPal pages (browser +
   deep-link back), not native payment SDKs.
3. **Scope of P5 = core booking journey**: Home · explore tours/destinations ·
   tour detail (with "Inquire now" enquiry) · auth · booking · account
   (bookings + wishlist + basic settings). **Cut:** blog reader, contact page,
   legal long-form, newsletter.
4. **Routing = Expo Router** (file-based, mirrors Next.js App Router mental
   model; already the documented intent in `docs/01-architecture/frontend.md`).
   Not bare React Navigation.
5. **Styling = RN `StyleSheet` + a theme object derived from
   `@tourism/tokens`.** No NativeWind/Tailwind layer. No-hex rule holds: screens
   and `mobile-ui` consume only the generated theme (the single conversion step
   inside the tokens build is where raw color math lives).
6. **Server state = TanStack Query** (`@tanstack/react-query`) from day one —
   every wave fetches; hand-rolled loading/error state doesn't scale.
7. **API base URL = `EXPO_PUBLIC_API_BASE_URL`**, default the deployed Render
   API, switchable to a LAN address for local-API debugging (user picked
   "both, env-switched"). Origin only — paths already carry `/api/v1`.
8. **Copy lives in `@tourism/i18n`** under a new `mobile.*` section (EN-only,
   ADR-0005). No hardcoded user-facing strings in screens.
9. **Wave roadmap** (each wave = own branch + spec + plan, difficulty ramps up):
   - **W1 Foundation** (this spec): router + tab shell + theme + first
     primitives + env config + real-data Home.
   - **W2 Browse & detail**: tours listing (reuse `filterTours`/`searchTours`
     from `@tourism/core`) · destinations · tour detail (gallery, itinerary,
     seats-left) · enquiry form.
   - **W3 Auth & account**: Supabase auth (secure-store token), login/register,
     account/profile, wishlist (heart + Saved tab).
   - **W4 Booking**: booking form · departure picker · hosted checkout
     (Stripe/PayPal via browser + deep link) · bookings list/detail/cancel.
10. **W1 explicitly excludes:** auth, tour detail, EAS builds/`eas init`, push
    notifications, offline caching, Android-emulator/iOS setup.

## Verified facts (from code, 2026-07-06)

- `apps/mobile` is the **untouched Nx Expo scaffold**: Expo `~54.0.0`, RN
  `0.81.5`, React 19, New Architecture on; entry `index.js` →
  `registerRootComponent(App)` with the generator's boilerplate
  `src/app/App.tsx`; **no router installed**. `metro.config.js` already wraps
  `withNxMetro` + SVG transformer, so workspace libs resolve once added as deps.
- `libs/mobile/ui` = generator stub (`MobileUi` component only). Package
  `@tourism/mobile-ui`, source-exports (`./src/index.ts`), peerDeps
  react/react-native. Already whitelisted in `pnpm-workspace.yaml` (explicit
  single entry — **new** mobile libs would need a manual line; W1 adds none).
- `@tourism/core` is platform-agnostic (deps: `openapi-fetch` + `tslib`; no
  DOM). `createApiClient({ baseUrl, getToken? })` attaches auth per-request via
  the injected callback (unused in W1), parses non-2xx into `ApiRequestError`
  (`.code`/`.status`); `unwrap()` unpacks the `{ data, error, meta }` envelope.
  Generated `paths` types cover the full customer API.
- Web home's featured shelf calls `GET /tours?featured=true&pageSize=N` via the
  typed client (`apps/web/src/lib/api/tours.ts:38-42`) — mobile Home reuses the
  same call shape.
- `@tourism/tokens` build (`libs/shared/tokens/style-dictionary/build.mjs`)
  already emits `generated/theme.js` (`tourism/rn-theme` format) with shape
  `{ colors: { light, dark }, radius }` — but values are **`oklch(...)` strings
  RN cannot parse**; the file's own comment defers conversion to mobile
  kick-off. `package.json` already exports `"./theme"`.
- `@tourism/i18n` `messages` is a plain `as const` TS object — drop-in on RN.
- Module boundaries (ESLint): `scope:mobile` → may import only `scope:mobile` +
  `scope:shared`. `@tourism/mobile-ui` (scope:mobile, type:ui) may be imported
  by the app; `@tourism/ui` (scope:web) is off-limits — correct.
- Mobile `build` target = EAS cloud build → **excluded from the local `/gate`**
  (standing note in CLAUDE.md); gate for mobile = lint + typecheck + test.
- Root pins `metro-config ~0.83` vs `apps/mobile` `~0.84` (known minor drift —
  watch for resolution weirdness, don't "fix" preemptively).

## Design

### 1. Routing shell (`apps/mobile`)

Switch to Expo Router: `package.json` `"main": "expo-router/entry"` (drop
`index.js`), add the `expo-router` plugin + a real `scheme` (`nexora`) to
`app.json`. New file layout:

```text
apps/mobile/src/app/
  _layout.tsx            ← root Stack: ThemeProvider + QueryClientProvider + StatusBar
  (tabs)/_layout.tsx     ← bottom tab bar: Home · Explore · Saved · Account
  (tabs)/index.tsx       ← Home (real data, see §4)
  (tabs)/explore.tsx     ← W1 placeholder ("browse tours" copy, W2 lands here)
  (tabs)/saved.tsx       ← W1 placeholder (wishlist comes in W3)
  (tabs)/account.tsx     ← W1 placeholder (auth comes in W3)
apps/mobile/src/lib/
  api.ts                 ← the app's ApiClient singleton (createApiClient from @tourism/core)
  env.ts                 ← reads EXPO_PUBLIC_API_BASE_URL (validated, single source)
apps/mobile/src/components/
  tour-card.tsx          ← product-specific card (app-level, NOT mobile-ui)
```

`expo-router` discovers routes from the app directory — the scaffold's
`src/app/App.tsx` + `App.spec.tsx` are deleted (boilerplate, no product value).
Tab icons: `@expo/vector-icons` (ships with Expo, Go-compatible).

New deps (`npx expo install` so versions match SDK 54): `expo-router`,
`react-native-screens`, `react-native-safe-area-context`, `expo-linking`,
`expo-constants`, `expo-image`, `@expo/vector-icons`. Workspace deps:
`@tourism/core`, `@tourism/i18n`, `@tourism/tokens` (`workspace:*`). Plus
`@tanstack/react-query`.

### 2. Tokens: RN-consumable theme (`libs/shared/tokens`)

Additive change to the Style Dictionary build: the `tourism/rn-theme` format
converts every oklch color to **hex** (`#rrggbb` / `#rrggbbaa`) at build time
via a small color lib (devDependency, e.g. `culori`), and `radius` values from
`rem` strings to **numbers** (dp, `0.375rem` → `6`). Output shape stays
`{ colors: { light, dark }, radius }`. Web CSS output is untouched; the
conversion helper is pure → **TDD** (known oklch in → exact hex out, rem → dp).
Regenerated `generated/theme.js` is committed like today's stub.

### 3. `@tourism/mobile-ui`: theme + primitives

Replace the stub with:

- `ThemeProvider` / `useTheme()` — wraps the generated theme, follows the OS
  light/dark via `useColorScheme()`, exposes `{ colors, radius, spacing,
  typography }` (spacing/type scales defined here, mirroring web's scale).
- `Screen` — SafeArea + themed background + standard padding; scroll variant.
- `AppText` — typography variants (`display` / `title` / `body` / `caption`),
  themed colors.
- `Button` — `primary` / `outline`, pressed states, disabled, loading spinner.
- `Card` — themed surface + radius + border.
- `Spinner` — themed ActivityIndicator wrapper.

One component per file, exported from `src/index.ts`; smoke tests per
component (`@testing-library/react-native`, jest-expo preset already wired).
No product components here — `TourCard` stays in the app.

### 4. Home screen (the vertical slice that proves the stack)

`(tabs)/index.tsx`: brand header (Nexora wordmark as text — the origami SVG can
come later) → welcome strip → **Featured tours** section: horizontal
`FlatList` of `TourCard` (cover image via `expo-image` · title · duration ·
price) fed by TanStack Query → `GET /tours?featured=true&pageSize=8` through
the typed client → `unwrap`.

States (all i18n copy):

- **Loading:** skeleton cards + a "waking the server…" hint after ~3s (Render
  free tier cold-start can take ~30s — set the query's retry/timeout
  accordingly).
- **Error:** friendly message + Retry button (`ApiRequestError` aware).
- **Empty:** soft "no tours yet" copy.
- Pull-to-refresh on the tab's scroll view.

### 5. Env & runbook

`apps/mobile/.env` holds `EXPO_PUBLIC_API_BASE_URL` with the Render URL as the
committed default (`EXPO_PUBLIC_*` values are public by definition — no secret
lives here). LAN override documented in `docs/05-runbooks/local-dev.md` § mobile:
`EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:3000` + "phone and PC on the same
Wi-Fi" + `pnpm nx start @tourism/mobile` + Expo Go QR flow. `src/lib/env.ts`
fails early with a clear message if the var is missing/malformed.

### 6. Testing & gate

- **TDD (pure logic):** tokens oklch→hex + rem→dp converter; `env.ts` parsing.
- **Component tests:** each `mobile-ui` primitive renders + respects theme;
  Home renders its loading / error / success states with a mocked query client.
- **Gate:** `pnpm nx run-many -t lint typecheck test` for `@tourism/mobile`,
  `@tourism/mobile-ui`, `@tourism/tokens` (`nx affected` confirms web/admin are
  untouched); mobile `build` stays excluded (EAS cloud). Manual verification:
  Expo Go on the user's phone against the Render API.

### 7. Risks / notes

- **Expo SDK 54 + expo-router are post-training** — per repo convention, read
  live docs (context7 / Expo MCP) before writing routing/config code; don't
  code from memory.
- **Render cold start** makes the first fetch slow — handled in §4's loading
  UX, and worth remembering during manual testing ("app is broken" vs "server
  is waking").
- **Shared-lib edits are additive only** (`tokens` new output values, `i18n`
  new section) so web/admin and the parallel session are unaffected; `nx
  affected` in the gate proves it.
- **Do not touch:** `feat/real-content-authoring` branch, its plan/spec docs,
  seed/media files; `origin/nghia` branch stays untouched (standing rule).
