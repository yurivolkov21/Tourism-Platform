# Design spec — Web auth foundation (Booking + Account, increment-1)

> Status: draft for review · Branch: `feat/web-auth-foundation` · Date: 2026-06-23
> First slice of the **Booking + Account** phase. Backend auth is done (Supabase JWTs verified +
> users mirrored); this wires the **web** to consume it.

## Goal & scope

Give `@tourism/web` real authentication: **email + password** login/register with the **email
confirmation** flow, session management + sign-out, **route protection** for a future account area,
and a **navbar login state** (replacing the `#login` placeholder). Plus a minimal protected
`/account` stub that proves the mechanism. No real account content yet (profile / bookings /
wishlist = the next increment).

### How auth works here (the contract)

The API does **not** issue tokens — it **verifies** Supabase JWTs (`SupabaseJwtGuard`) and mirrors
users via `POST /auth/sync` (idempotent, CUSTOMER). So the web flow is:

1. User signs in / up **directly with Supabase Auth** (client SDK) → gets a session (JWT in cookies).
2. After sign-in (and after email-confirm callback), the web calls **`POST /auth/sync`** with the
   access token → mirrors the user into the local DB. Idempotent, safe to call each sign-in.
3. Later authenticated API calls carry the JWT (out of scope this increment beyond `/auth/sync`).

### Locked decisions

- **`@supabase/ssr`** (the standard Next 16 App Router pattern): a browser client, a server client
  (cookies via `next/headers`), and **middleware** that refreshes the session on every request.
- **Email + password only.** No OAuth / magic link this increment.
- **Full email-confirmation flow:** register → "check your inbox" → email link → `/auth/callback`
  route handler exchanges the code for a session → signed in. (Requires email confirmation **ON**
  in the Supabase project.)
- **Foundation + minimal `/account` stub** (shows the signed-in email + a sign-out button), proving
  route protection. Real account pages deferred.
- **Auth UI via server actions** (`signIn`/`signUp`/`signOut`) + client form components for state;
  reuse `@tourism/ui` (Input, Button, Field, Label) — no new form lib.
- **Supabase clients live in `apps/web`** (they're Next-cookie-specific) — NOT in `@tourism/core`.
  The `/auth/sync` call reuses the existing `@tourism/core` API client's Bearer-token support.
- **Env (web):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key is
  client-safe), `NEXT_PUBLIC_API_BASE_URL` (→ `http://localhost:3000/api/v1`). Add `apps/web/.env.example`.
- EN-only copy in `@tourism/i18n` (`messages.auth`).

## Per-area design

### 1. Supabase clients + middleware
- `lib/supabase/client.ts` — `createBrowserClient` (browser).
- `lib/supabase/server.ts` — `createServerClient` reading/writing cookies via `next/headers`.
- `middleware.ts` — `@supabase/ssr` session refresh on each request; also redirects unauthenticated
  requests for protected paths (`/account*`) to `/login?redirect=<path>`. Matcher excludes static assets.

### 2. Server actions (`lib/auth/actions.ts`)
- `signIn(formData)` — `signInWithPassword`; on success call `syncUser()` then redirect to the
  `redirect` param (validated) or `/account`; on error return a friendly message.
- `signUp(formData)` — `signUp` with `emailRedirectTo` → `/auth/callback`; returns "check your email".
- `signOut()` — `supabase.auth.signOut()` → redirect `/`.

### 3. Email-confirm callback (`app/auth/callback/route.ts`)
- Route handler: `exchangeCodeForSession(code)`; then `syncUser()`; redirect to `/account` (or the
  `redirect` param). On error → `/login?error=...`.

### 4. Pages
- `/login` (`app/login/page.tsx`) + `LoginForm` — email + password, error display, link to `/register`.
- `/register` (`app/register/page.tsx`) + `RegisterForm` — email + password (+ confirm), submits
  `signUp`, shows the "check your inbox" state.
- `/account` (`app/account/page.tsx`) — **protected** server component: reads the user via the server
  client; if none, `redirect('/login?redirect=/account')`. Renders the email + a sign-out button (stub).

### 5. Navbar state
- `AuthProvider` (client context) seeded with the server-read user, subscribed to
  `supabase.auth.onAuthStateChange` for live updates (login/logout reflect immediately).
- `UserMenu` (client) in `SiteHeader`: logged out → "Log in" link (`/login`); logged in → a dropdown
  (email, "My account" → `/account`, "Sign out"). Replaces the `#login` placeholders (desktop + mobile).
- `layout.tsx` wraps content in `AuthProvider` (initial user from the server client).

## In scope / out of scope

**In:** Supabase clients + middleware; login/register/callback/sign-out; protected `/account` stub;
navbar auth state; `/auth/sync` mirroring; `messages.auth`; `apps/web/.env.example`; the two pure
helpers below (TDD).

**Out:** OAuth / magic link; password reset / change; real account content (profile, my bookings,
my wishlist); authenticated data fetching beyond `/auth/sync`; admin auth; booking flow.

## i18n (EN-only, ADR-0005)

Add `messages.auth`: `login.*`, `register.*`, `account.*`, `menu.*` (labels, placeholders, CTAs,
"check your inbox", generic error). No VI parity (ADR-0005).

## Testing

- **Unit (TDD) — two pure, security-relevant helpers:**
  - `safeRedirect(path)` → returns the path only if it's a **local** path (`/...`, not `//host`,
    not `http://...`, no backslashes) else `/account`. **Prevents open-redirect** via `?redirect=`.
  - `authErrorMessage(error)` → maps a Supabase `AuthError`/unknown to a friendly EN string
    (invalid credentials, email taken, unconfirmed, fallback). Pure, no SDK calls.
- **e2e (Playwright):** login page renders + form validation; protected `/account` redirects to
  `/login` when signed out. **Full sign-up→confirm→sign-in needs real Supabase creds + an inbox**
  → covered manually / deferred (note in plan). Don't fake it.
- **Gate:** `lint typecheck test build` green; `check:no-hex` clean; no secrets committed (only
  `NEXT_PUBLIC_*` names in `.env.example`, values blank).

## Planned files

- `apps/web/package.json` (+ `@supabase/ssr`, `@supabase/supabase-js`), `apps/web/.env.example` (new).
- `apps/web/src/lib/supabase/{client,server}.ts`, `apps/web/src/middleware.ts`.
- `apps/web/src/lib/auth/{actions.ts, safe-redirect.ts (+spec), auth-error.ts (+spec), sync-user.ts}`.
- `apps/web/src/app/{login,register,account}/page.tsx`, `apps/web/src/app/auth/callback/route.ts`.
- `apps/web/src/components/auth/{auth-provider,login-form,register-form,user-menu}.tsx`.
- Edit: `apps/web/src/app/layout.tsx` (AuthProvider), `apps/web/src/components/layout/site-header.tsx`
  (UserMenu), `libs/shared/i18n/src/lib/messages.ts` (`auth`).

## Risks / mitigations

- **No real Supabase creds in this env** → spec/plan/code are written without them; running the flow
  needs `apps/web/.env` filled + email-confirm ON in the project. Build/typecheck/lint don't need creds.
- **Open-redirect via `?redirect=`** → `safeRedirect` allowlists local paths only (TDD'd).
- **Auth state flash in navbar** (logged-in user briefly shows "Log in") → seed `AuthProvider` with
  the server-read user so first paint is correct.
- **Cookie/session on Next 16** → follow the official `@supabase/ssr` middleware pattern exactly
  (read live docs); getting cookie handling wrong silently drops sessions.
- **Port split** (API 3000, web 3001 per `CORS_ORIGINS`/`FRONTEND_URL`) → document running web on
  3001 against the API on 3000; `NEXT_PUBLIC_API_BASE_URL` points at the API.
- **Module boundaries** → Supabase clients stay in `apps/web`; `/auth/sync` uses the `@tourism/core`
  client (allowed: app → data-access).
