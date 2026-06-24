# Design spec — Admin foundation: auth + shell + Destinations CRUD (P4 increment-1)

> Status: draft for review · Branch: `feat/admin-foundation` · Date: 2026-06-23
> **Pivot:** first real backend-connected UI (chosen over web user-auth — admin auth has an
> immediate consumer: the CRUD, which also doubles as a live API test harness + a way to create
> real catalog data the web will later wire to). Web user-auth spec is parked on
> `feat/web-auth-foundation` for later.

## Goal & scope

Stand up the **`@tourism/admin`** app foundation, wired to the **live API**:

1. **Admin auth** — Supabase email+password sign-in, **ADMIN-only** (`POST /auth/admin/sync`,
   allowlist-gated), whole-app route protection, sign-out.
2. **App shell** — sidebar + topbar layout (nav, user menu, sign-out, theme toggle) + a **dashboard**
   landing showing **real** stats (`GET /admin/stats`).
3. **Destinations CRUD** — list / create / edit / delete against `/admin/destinations`, fully typed
   via `@tourism/core`. Proves the end-to-end loop and becomes the template for the other models.

This is the first surface that talks to the **real backend** (no fixtures). Admin is inherently
data-driven, so there is no "static design" phase here.

### How admin auth works (the contract)

Same Supabase model as the web, ADMIN flavour: the user signs in with Supabase → web gets a JWT →
calls **`POST /auth/admin/sync`** (the API checks the email against `ADMIN_EMAILS`; **403** if not
listed) → mirrors/elevates the user to ADMIN. Every `/admin/*` API route is `@Roles(ADMIN)`-gated,
so admin calls carry the ADMIN JWT.

### Locked decisions

- **`@supabase/ssr`** (browser + server clients + middleware), same pattern as the parked web-auth
  spec — but admin **protects every route except `/login` + `/auth/*` + assets**.
- **ADMIN gate:** after sign-in, `POST /auth/admin/sync`; on **403** → sign out + show "not an admin".
  Only allowlisted emails get in.
- **Data pattern:** **Server Components fetch** via the `@tourism/core` typed client (token from the
  server Supabase session, passed to `createApiClient({ getToken })`); **mutations via Server
  Actions** + `revalidatePath`. No client-side data fetching libs this increment.
- **Reuse first:** `@tourism/ui` (`Sidebar*`, `Table`, `Dialog`/`AlertDialog`, `Input`, `Button`,
  `Field`/`Label`, `Switch`, `DropdownMenu`, `Badge`, `Pagination`) + the `ThemeToggle` already built;
  `@tourism/tokens`; copy in `@tourism/i18n` (`messages.admin`). No new UI/form libs.
- **Typed API:** `@tourism/core` OpenAPI client; run `/regen-types` first so the `/admin/destinations`
  + `/admin/stats` paths are in the generated schema.
- **Destinations scope = core fields** (`name`, `slug?`, `country?`, `region?`, `description?`,
  `isActive`). **Media management (Cloudinary upload) is DEFERRED** to a later increment.
- **Env (admin):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_API_BASE_URL` (→ `http://localhost:3000/api/v1`). Admin dev on **port 3002** (API 3000,
  web 3001). **API `CORS_ORIGINS` must include the admin origin** (`http://localhost:3002`) — user
  updates `apps/api/.env`.
- EN-only (ADR-0005).

### Shadcn Space block decisions (verified free/Pro + cost)

- **Login page → adopt `@shadcn-space/login-01`** (FREE, token-clean: semantic tokens, 0 hex, 0 motion).
  Strip the social (Google/GitHub) + "sign up" bits — admins are allowlisted, email+password only.
  Normalize cost ~0.
- **App shell → DON'T adopt `dashboard-shell-01`** (FREE but heavy: pulls `motion` + `simplebar-react`
  + `@iconify`, 7 hardcoded palette colours, 11 files, SaaS KPIs/charts/upsell we don't need). Instead
  **compose the shell from `@tourism/ui`'s `Sidebar` set** (`SidebarProvider`/`Sidebar`/`SidebarInset`/
  `SidebarTrigger` — the canonical shadcn dashboard-shell primitive, already in the lib, token-native).
  Borrow only layout *ideas* (topbar structure, KPI-card grid).
- **Deferred (free, token-clean, but out of scope):** `register-01`, `verify-email-01`,
  `forgot-password-01` → reuse for the parked **web user-auth**; `two-factor-authentication-01` → a
  future admin-hardening increment.

## Per-area design

### 1. Auth
- `lib/supabase/{client,server}.ts` + `src/middleware.ts` — session refresh + **redirect any
  unauthenticated request (except `/login`, `/auth/*`, assets) → `/login?redirect=<path>`**.
- `app/login/page.tsx` + `LoginForm` (email + password). Server action `signIn` → Supabase
  `signInWithPassword` → `POST /auth/admin/sync`; **403 → signOut + "not authorized" message**;
  success → `safeRedirect`.
- `signOut` action → `/login`. `requireAdmin()` server helper (reads session + role) for pages.

### 2. Shell
- `app/(admin)/layout.tsx` — protected layout: **Sidebar** (`@tourism/ui`) nav (Dashboard,
  Destinations; future items disabled/"soon") + **topbar** (page title, `ThemeToggle`, `UserMenu`
  with email + sign-out). `AuthProvider` seeds client auth state.
- Admin `global.css` imports `@tourism/tokens` (mirror web) so brand tokens + dark mode work.

### 3. Dashboard
- `app/(admin)/page.tsx` (or `/dashboard`) — **stat cards from `GET /admin/stats`** (real numbers:
  tours, destinations, bookings, etc.) + a "recent activity" placeholder. Visual treatment left
  flexible so the user's chosen dashboard blocks can drop in (normalized to tokens later).

### 4. Destinations CRUD (`/admin/destinations`)
- **List** `app/(admin)/destinations/page.tsx` — Server Component: `GET /admin/destinations`
  (paginated, incl. drafts) → `Table` (name · region · country · Active badge · edit/delete). Pagination
  + empty state + "New destination" button.
- **Create / Edit** `…/new` + `…/[slug]/edit` — form (DTO fields) → Server Actions `createDestination`
  / `updateDestination` (`POST` / `PATCH`), **zod** validation, `revalidatePath`, friendly `409`
  (slug exists) handling.
- **Delete** — `AlertDialog` confirm → `deleteDestination` (`DELETE`); handle **409** ("still active,
  or has tours") with a clear message (must deactivate + detach tours first).

## In scope / out of scope

**In:** admin Supabase auth (ADMIN-gated) + middleware; app shell (sidebar/topbar/theme/user menu);
dashboard with real `/admin/stats`; full Destinations CRUD (core fields); typed `@tourism/core` calls;
`messages.admin`; `apps/admin/.env.example`; TDD helpers below.

**Out:** other models' CRUD (Tours, Categories, Departures, Posts, Reviews-moderation, Enquiries,
Bookings — next increments); **destination media upload**; web user-auth; OAuth; password reset;
mobile.

## i18n (EN-only)

`messages.admin`: `nav.*`, `auth.*`, `dashboard.*`, `destinations.*` (table headers, form labels,
empty/validation/409 messages), `common.*` (save/cancel/delete/confirm). No VI parity.

## Testing

- **Unit (TDD) — pure, reusable:**
  - `safeRedirect(path)` — local-path allowlist (open-redirect guard).
  - `authErrorMessage(error)` — Supabase `AuthError` → friendly EN.
  - `apiErrorMessage(error)` — `ApiRequestError` (code/status) → friendly EN (covers 403 not-admin,
    409 slug/active, 404).
  - `destinationSchema` (zod) — required name (1–120), optional slug/country/region/description bounds,
    `isActive` boolean; valid + invalid cases.
- **e2e (Playwright):** `/login` renders; a protected route (`/`, `/destinations`) **redirects to
  `/login`** when signed out. **Full admin sign-in + CRUD needs real Supabase creds + an
  allowlisted email** → manual / deferred (don't fake it).
- **Gate:** `lint typecheck test build` green; `check:no-hex` clean; no secrets committed.

## Planned files (admin app)

- `apps/admin/package.json` (+ `@supabase/ssr`, `@supabase/supabase-js`, `zod`), `apps/admin/.env.example`.
- `apps/admin/src/lib/supabase/{client,server}.ts`, `apps/admin/src/middleware.ts`.
- `apps/admin/src/lib/{auth/{actions,safe-redirect(+spec),auth-error(+spec),require-admin},api/{client,error(+spec)},destinations/{schema(+spec),actions}}.ts`.
- `apps/admin/src/app/login/page.tsx`, `app/(admin)/{layout,page}.tsx`,
  `app/(admin)/destinations/{page,new/page,[slug]/edit/page}.tsx`.
- `apps/admin/src/components/{auth/{auth-provider,login-form},shell/{sidebar-nav,topbar,user-menu},destinations/{destination-table,destination-form,delete-destination}}.tsx`.
- Edit: `apps/admin/src/app/layout.tsx` (tokens + ThemeProvider), `apps/admin/src/app/global.css`
  (import tokens), `libs/shared/i18n/src/lib/messages.ts` (`admin`).

## Execution notes (2026-06-24 — actual, branch `feat/admin-foundation`)

**Done: T0–T4** (auth + shell + dashboard). **Remaining: T5–T7** (Destinations CRUD) + **T8** (gate).
Each task built green + committed (commits `131c8d3` … `e0b0947`). Key actuals:

- **Stats endpoint is `GET /admin/stats/dashboard`** (not `/admin/stats`). Dashboard wired to it.
- **Dashboard adopted from `@shadcn-space/dashboard-shell-01`** but: colours → brand tokens
  (`chart-1..4`), `SimpleBar` → `ScrollArea`, and the SaaS-only bits dropped (SalesByCountry widget
  — which also avoided the `motion`/`@iconify` deps — plus the Pro-upsell card, the non-functional
  search box, and the fake notifications). It maps 1:1 to real data: KPIs ← `overview`, donut ←
  `bookingsByStatus`, bars ← `monthlyTrend`, table ← `topToursByRevenue`.
- **`recharts@3.8.0` added to admin** (charts import it directly, matching `@tourism/ui`).
- **`DashboardStats` typed locally + cast** — the generated `@tourism/core` response typing isn't
  uniform yet (documented in its `client.ts`); `/regen-types` against the running API will let us
  drop the cast.
- **Dev ports finalised:** API `:3000`, web `:3001` (web `nx dev` moved off `:3000`), admin `:3002`.
- **Env verified ready (2026-06-24):** admin `.env` has the 3 `NEXT_PUBLIC_*` (API base = origin);
  api `.env` has `ADMIN_EMAILS=admin@example.com`, `CORS_ORIGINS` includes `:3002`, same Supabase
  project as admin. Running needs the API up (`pnpm nx serve @tourism/api`).

## Risks / mitigations

- **No creds in this env** → code/build/unit-test without them; running needs `apps/admin/.env` filled
  + an **allowlisted ADMIN email** in the API's `ADMIN_EMAILS` + the **admin origin in `CORS_ORIGINS`**.
- **403 lock-out UX** (signed-in Supabase user who isn't an admin) → explicit "not authorized" + auto
  sign-out, not a blank screen.
- **Stale OpenAPI client** (admin paths missing) → run `/regen-types` in T0; fail loudly if absent.
- **Token on the server** → read the access token from the server Supabase session and feed
  `createApiClient({ getToken })`; never expose the service-role key (anon key only, client-safe).
- **Scope creep** (admin is large) → this increment is auth + shell + **one** model; media + other
  models are explicitly deferred. The Destinations CRUD is the reusable template.
- **`@supabase/ssr` cookie handling on Next 16** → follow the official middleware pattern exactly.
