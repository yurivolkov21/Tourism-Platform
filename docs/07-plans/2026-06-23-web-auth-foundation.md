# Implementation plan — Web auth foundation (increment-1)

> Spec: [`2026-06-23-web-auth-foundation-design.md`](../06-specs/2026-06-23-web-auth-foundation-design.md)
> Branch: `feat/web-auth-foundation` · TDD on the two pure helpers · one commit per task group.

## Reused seams (touch, don't rebuild)

- `@tourism/ui` — `Input`, `Button`, `Field`/`Label`, `DropdownMenu*` for forms + the user menu.
- `@tourism/i18n` `messages.*` — all copy (EN-only); add `messages.auth`.
- `@tourism/core` API client — its Bearer-token support powers the `POST /auth/sync` call.
- `apps/web/src/components/layout/site-header.tsx` — swap `#login` for `<UserMenu/>`.
- `apps/web/src/app/layout.tsx` — wrap in `<AuthProvider/>` (seeded with the server-read user).
- Brand tokens / `pnpm check:no-hex`.

## Tasks (dependency-ordered)

### T0 — Deps + env scaffold  ·  commit "auth deps + env"
- Add `@supabase/ssr` + `@supabase/supabase-js` to `apps/web`. Create `apps/web/.env.example` with
  `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1` (values blank/local).
- **Accept:** `pnpm install` ok; `nx build @tourism/web` still green; `.env.example` has only public names, no secrets.

### T1 — Pure helpers (TDD)  ·  commit "auth helpers"
- **RED:** `lib/auth/safe-redirect.spec.ts` — `/account`→`/account`; `//evil.com`→`/account`;
  `http://x`→`/account`; `/a\b`→`/account`; `undefined`→`/account`; `/tours?x=1`→`/tours?x=1`.
  `lib/auth/auth-error.spec.ts` — invalid-credentials / email-taken / unconfirmed / unknown → EN strings.
- **GREEN:** implement `safe-redirect.ts` (local-path allowlist) + `auth-error.ts` (pure mapper).
- **Accept:** `nx test @tourism/web` passes; ≥80% on both helpers.

### T2 — Supabase clients + middleware  ·  commit "supabase clients + middleware"
- `lib/supabase/client.ts` (`createBrowserClient`), `lib/supabase/server.ts` (`createServerClient`,
  cookies via `next/headers`), `src/middleware.ts` (session refresh + redirect `/account*`→`/login`
  per the official `@supabase/ssr` pattern; matcher excludes `_next`/static/images).
- **Accept:** typecheck/build green; middleware compiles; no session-cookie mishandling vs the docs.

### T3 — Server actions + user mirroring  ·  commit "auth actions + sync"
- `lib/auth/actions.ts` — `signIn` (→ `syncUser` → `safeRedirect`), `signUp` (`emailRedirectTo`
  `/auth/callback`, return "check inbox"), `signOut` (→ `/`).
- `lib/auth/sync-user.ts` — `POST /auth/sync` with the access token via the `@tourism/core` client.
- **Accept:** typecheck/build green; actions are `'use server'`; errors mapped via `authErrorMessage`.

### T4 — Pages + callback + i18n  ·  commit "login/register pages + callback"
- `app/login/page.tsx` + `LoginForm`; `app/register/page.tsx` + `RegisterForm` ("check inbox" state);
  `app/auth/callback/route.ts` (`exchangeCodeForSession` → `syncUser` → redirect). Add `messages.auth`.
- **Accept:** `nx build` green; `/login` + `/register` render; forms post to the actions; no-hex clean.

### T5 — Protected `/account` stub  ·  commit "protected account stub"
- `app/account/page.tsx` — server component: read user (server client); none → `redirect('/login?redirect=/account')`;
  else render email + a sign-out button (calls `signOut`).
- **Accept:** build green; signed-out `/account` redirects to `/login` (middleware + page guard).

### T6 — Navbar auth state  ·  commit "navbar auth state"
- `components/auth/auth-provider.tsx` (client context, seeded user + `onAuthStateChange`);
  `components/auth/user-menu.tsx` (Login link vs account dropdown). Wire `layout.tsx` + `site-header.tsx`
  (desktop + mobile, replacing `#login`).
- **Accept:** build green; navbar shows "Log in" when signed out, account menu when signed in; updates
  live on sign-in/out; first paint correct (no flash) via the seeded user.

### T7 — Gate + e2e + review  ·  commit "auth gate + e2e"
- `/gate` (lint/typecheck/test/build); `check:no-hex`; confirm no secrets committed. Playwright:
  `/login` renders; signed-out `/account` → `/login`. **Note in the spec that the full
  sign-up→confirm→sign-in path needs real Supabase creds + an inbox → manual/deferred.**
- **Accept:** gate green; e2e (redirect + render) pass; then **STOP for review** before merge.

## Sequencing

T0 → T1 (independent, can interleave) → T2 → T3 → T4 → T5 → T6 → T7.
T2–T6 are sequential (each builds on the prior); T1 can land any time before T3.

## Out of scope (this increment)

OAuth / magic link; password reset; real account content; authenticated data fetching beyond
`/auth/sync`; admin auth; booking flow.
