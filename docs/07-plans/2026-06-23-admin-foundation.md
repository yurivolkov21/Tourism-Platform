# Implementation plan — Admin foundation (P4 increment-1)

> Spec: [`2026-06-23-admin-foundation-design.md`](../06-specs/2026-06-23-admin-foundation-design.md)
> Branch: `feat/admin-foundation` · TDD on the pure helpers · one commit per task group.
> Order: **auth → shell/dashboard → Destinations CRUD** (per the agreed sequence).

## Reused seams (touch, don't rebuild)

- `@tourism/ui` — `Sidebar*`, `Table`, `AlertDialog`/`Dialog`, `Input`, `Button`, `Field`/`Label`,
  `Switch`, `DropdownMenu*`, `Badge`, `Pagination`, plus `ThemeProvider` + `ThemeToggle` (already built).
- `@tourism/core` — `createApiClient({ baseUrl, getToken })` (per-request Bearer; throws `ApiRequestError`).
- `@tourism/i18n` — add `messages.admin` (EN-only). `@tourism/tokens` — admin `global.css` imports it.
- `/regen-types` — refresh the OpenAPI client so `/admin/destinations` + `/admin/stats` are typed.

## Tasks (dependency-ordered)

### T0 — Deps, env, types, CORS  ·  commit "admin deps + env + types"

- Add `@supabase/ssr`, `@supabase/supabase-js`, `zod` to `apps/admin`. Create `apps/admin/.env.example`
  (`NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`).
  Admin `global.css` imports `@tourism/tokens`; `layout.tsx` adds `ThemeProvider` + tokens. Run `/regen-types`;
  verify `paths` includes `/admin/destinations*` + `/admin/stats`.
- **Accept:** `pnpm install` ok; `nx build @tourism/admin` green; client schema has the admin paths;
  `.env.example` has only public names.

### T1 — Pure helpers (TDD)  ·  commit "admin auth/api helpers"

- **RED:** specs for `safe-redirect`, `auth-error`, `api/error` (`apiErrorMessage` — 403/409/404 →
  EN), `destinations/schema` (zod: name 1–120 required; slug/country/region/description bounds; isActive).
- **GREEN:** implement each (pure, no SDK/network).
- **Accept:** `nx test @tourism/admin` passes; ≥80% on the helpers.

### T2 — Supabase clients + middleware  ·  commit "supabase clients + middleware"

- `lib/supabase/{client,server}.ts`; `src/middleware.ts` — session refresh + redirect any request
  **except `/login`, `/auth/*`, and assets** → `/login?redirect=<path>` when unauthenticated.
- **Accept:** typecheck/build green; matcher excludes `_next`/static; signed-out request to `/` would 302 `/login`.

### T3 — Admin auth (login + actions)  ·  commit "admin auth + admin-sync"

- `lib/auth/{actions,require-admin}.ts` + `lib/api/client.ts` (server-side `createApiClient` with token
  from the server session). `signIn` → `signInWithPassword` → `POST /auth/admin/sync`; **403 → signOut +
  error**; success → `safeRedirect`. `signOut` → `/login`. `app/login/page.tsx` + `LoginForm`.
- **Accept:** build green; actions `'use server'`; a non-allowlisted sign-in is rejected + signed out
  (logic verified by `apiErrorMessage` mapping + flow), errors surfaced in the form.

### T4 — App shell + dashboard  ·  commit "admin shell + dashboard"

- `app/(admin)/layout.tsx` (protected via `requireAdmin`) — `Sidebar` nav (Dashboard, Destinations;
  others "soon") + topbar (`ThemeToggle`, `UserMenu` email + sign-out). `AuthProvider`. `app/(admin)/page.tsx`
  — stat cards from `GET /admin/stats` (real). `messages.admin.nav/dashboard`.
- **Accept:** build green; shell renders; dashboard reads `/admin/stats` server-side (typed); signed-out → `/login`.

### T5 — Destinations list  ·  commit "admin destinations list"

- `app/(admin)/destinations/page.tsx` — Server Component: `GET /admin/destinations` → `Table`
  (name·region·country·Active badge·actions) + `Pagination` + empty state + "New destination" CTA.
  `messages.admin.destinations`.
- **Accept:** build green; list renders rows from the API (typed); pagination + empty state work.

### T6 — Destinations create/edit  ·  commit "admin destinations form"

- `…/new/page.tsx` + `…/[slug]/edit/page.tsx` + `DestinationForm` + actions `createDestination` /
  `updateDestination` (`POST`/`PATCH`, `destinationSchema`, `revalidatePath`, friendly **409 slug**).
- **Accept:** build green; create + edit submit to the API; validation blocks bad input; slug-conflict
  shows a clear message; list refreshes after save.

### T7 — Destinations delete  ·  commit "admin destinations delete"

- `DeleteDestination` (`AlertDialog` confirm) → `deleteDestination` (`DELETE`); handle **409**
  ("still active / has tours") with guidance.
- **Accept:** build green; confirm → deletes + refreshes; 409 surfaces the reason (deactivate/detach first).

### T8 — Gate + e2e + review  ·  commit "admin gate + e2e"

- `/gate` (lint/typecheck/test/build); `check:no-hex`; no secrets. Playwright: `/login` renders;
  protected route → `/login` when signed out. **Note in the spec that full sign-in + CRUD needs real
  creds + an allowlisted email** → manual/deferred.
- **Accept:** gate green; e2e (render + redirect) pass; then **STOP for review** before merge.

## Sequencing

T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8. T1 can interleave with T0; T5–T7 build on T4.

## Out of scope (this increment)

Other models' CRUD; destination media upload; web user-auth; OAuth / password reset; mobile.
Future increments reuse T3 (auth), T4 (shell), and the Destinations CRUD as the template.
