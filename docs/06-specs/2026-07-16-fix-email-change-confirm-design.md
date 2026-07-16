# Fix email-change confirmation (+ signup/recovery cross-browser) — design spec

**Date:** 2026-07-16 · **Scope:** `@tourism/web` (+ `docs/email-templates`, + Supabase dashboard config) · **Status:** DRAFT (awaiting user review)

## Goal

After a user confirms an email change (Supabase secure-email-change: links to
BOTH old + new inbox), the email must actually change **at Supabase** AND show in
the app **immediately** — no sign-out/in. Fix the same cross-browser fragility for
**signup** and **password recovery** confirmations, which share the identical
defect. Keep OAuth working.

## Root cause (confirmed — two stacked bugs)

### Bug 1 — confirmation can't complete (PKCE mismatch) — **ACTIVE**
Dashboard evidence (2026-07-16): clicking "Confirm new email" → bounces to
`/login?error=auth`, and **Supabase keeps the OLD email** (change never commits).
- The only auth route is `apps/web/src/app/auth/callback/route.ts`, which handles
  **only** `exchangeCodeForSession(code)` (PKCE). `verifyOtp` / `token_hash` /
  `type='email_change'` exist **nowhere** in the repo (grep-clean).
- All three Supabase templates (`docs/email-templates/{change-email,confirm-signup,reset-password}.html`,
  button href line 176) use `{{ .ConfirmationURL }}` → Supabase hosted
  `/auth/v1/verify` → redirect to `/auth/callback?code=…`.
- Opened in a different browser/mail-client than the one that initiated the flow,
  the **PKCE code verifier** (in the origin browser's storage) is absent →
  `exchangeCodeForSession` fails → `/login?error=auth`; the change never lands.
- Same fragility hits **signup** (`lib/auth/actions.ts` `signUp` `emailRedirectTo:
  /auth/callback`) and **recovery** (`components/auth/forgot-password-form.tsx`
  `resetPasswordForEmail` `redirectTo: /auth/callback?redirect=/reset-password`).

### Bug 2 — API email mirror goes stale — **latent, surfaces once Bug 1 is fixed**
- `GET /users/me` returns the LOCAL mirrored `User.email`
  (`apps/api/src/modules/users/users.service.ts` `getMe → findOrThrow`), not the
  live JWT email.
- `syncUser()` (`apps/web/src/lib/auth/sync-user.ts`) runs **only** in
  `/auth/callback` (sign-in / OAuth). Nothing re-syncs mid-session after an email
  change → `users.email` stays old until the next sign-in.
- The mirror self-heals on any sync: `auth.service.ts` `upsert` (bySub branch)
  already writes `email: emailLower` from the JWT — so a single re-sync trigger
  fixes it.

## Locked decisions

1. **Scope = all three flows** (email_change + signup + recovery), migrated to the
   server-side **`token_hash` + `verifyOtp`** pattern. They share one defect;
   leaving signup/recovery on PKCE knowingly ships the same bug (cross-device
   signup-confirm is a common real failure).
2. **Add `/auth/confirm`, keep `/auth/callback`.** `/auth/callback` is still used
   by **OAuth** (`signInWithOAuth` → `/auth/callback?redirect=…`), which legitimately
   uses PKCE `code` in the same browser and works. Not touched.
3. **Bug 2 fixed inside `/auth/confirm`** via `syncUser()` after a successful
   `verifyOtp` — no token-refresh hook needed.
4. Confirmation completes **cross-browser** because `verifyOtp({type, token_hash})`
   verifies the self-contained hash server-side; no PKCE verifier required
   (context7-confirmed).

## Design

### A. `apps/web/src/app/auth/confirm/route.ts` (new, server)

```
GET ?token_hash&type&redirect
  parse+validate → verifyOtp({ type, token_hash })  (SSR client sets session cookie)
    success → syncUser(); redirect(safeRedirect(redirect, default), token stripped)
    failure/invalid → /login?error=auth
```
- `type` allow-list: `email_change | signup | recovery | invite` (`EmailOtpType`).
  Unknown/absent type or absent `token_hash` → `/login?error=auth` (no verifyOtp).
- Uses the same `createClient()` server client as `/auth/callback`; on success the
  session cookie is set (recovery → `PASSWORD_RECOVERY`, else `SIGNED_IN`).
- `syncUser()` after success mirrors what `/auth/callback` does today — refreshes
  `users.email` (Bug 2) for email_change and creates/refreshes the mirror for
  signup. Best-effort (its own try/catch); a sync hiccup must not fail the confirm.
- Redirect strips `token_hash`/`type` from the URL (don't leak the token). Reuses
  `safeRedirect` (`lib/auth/safe-redirect.ts`); default `/account`.

### B. Pure logic (TDD) — `apps/web/src/lib/auth/confirm-params.ts` (+ `.spec.ts`)

| Function | Contract |
| --- | --- |
| `parseConfirmParams(searchParams)` | → `{ tokenHash, type } \| null`. `null` when `token_hash` is empty/absent or `type` ∉ allow-list. Keeps the route thin + branch-tested without a live Supabase. |

`safeRedirect` is already unit-tested — reused, not reimplemented.

### C. Email templates → `token_hash` (`docs/email-templates/`)

Replace `{{ .ConfirmationURL }}` (button href L176 **and** copy-paste fallback
L219/220) with a self-built link:

| Template | Link |
| --- | --- |
| `change-email.html` | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&redirect=/account` |
| `confirm-signup.html` | `…&type=signup&redirect=/account` |
| `reset-password.html` | `…&type=recovery&redirect=/reset-password` |

Update `docs/email-templates/README.md`: drop the "Don't remove `{{ .ConfirmationURL }}`"
note; document the `token_hash` links + the **redeploy step** (re-paste into
Supabase dashboard). Secure-email-change still sends two links (unchanged) — each
carries its own `token_hash`; the change commits when both are verified.

### D. Recovery — no page rework

`/reset-password` already reads `getUser()` from the session. `/auth/confirm?type=recovery`
sets the recovery session, then redirects to `/reset-password` → the page shows the
form. Only the comment ("callback exchanges the code") is refreshed.

### E. Client triggers — left functional, no longer shape the link

`signUp` / `updateUser` / `resetPasswordForEmail` keep their
`emailRedirectTo`/`redirectTo` (harmless), but with `token_hash` templates the link
target is owned by the template (`redirect=` param), so these no longer control it.
The `change-email-form.tsx` doc comment is updated to say the link returns through
`/auth/confirm`. No functional change to the client calls (avoids churn/regression).

### F. `/auth/callback` — unchanged

Kept for OAuth (`signInWithOAuth`). Still `exchangeCodeForSession` + `syncUser`.

## Testing

- `apps/web/src/lib/auth/confirm-params.spec.ts` (test-first): valid
  email_change/signup/recovery/invite; reject unknown type; reject missing
  token_hash; reject empty values.
- `apps/web/src/app/auth/confirm/route.spec.ts`: missing params → `/login?error=auth`
  (verifyOtp NOT called); unknown type → `/login?error=auth`; verifyOtp success →
  `syncUser` called + redirect to the `redirect` target (token stripped); verifyOtp
  error → `/login?error=auth`. Mock the SSR `createClient` (`verifyOtp`) + `syncUser`
  + `next/navigation`/`next/server` per the web jsdom conventions (route tests mock
  `next/*`; the env has no global `Request`/`Response`).
- Existing `/auth/callback` + auth-form tests stay green.

## Planned files

| File | Change |
| --- | --- |
| `apps/web/src/app/auth/confirm/route.ts` (+ `.spec.ts`) | new — token_hash confirm |
| `apps/web/src/lib/auth/confirm-params.ts` (+ `.spec.ts`) | new — parse/validate (TDD) |
| `docs/email-templates/{change-email,confirm-signup,reset-password}.html` | `token_hash` links |
| `docs/email-templates/README.md` | document token_hash + re-paste step |
| `apps/web/src/app/reset-password/page.tsx` · `components/account/change-email-form.tsx` | comment refresh only |
| `docs/03-reference/*` · `docs/CHANGELOG.md` | docs sweep on merge (rule 9) |

## Dashboard prerequisites (outside the repo — deploy steps, not code)

1. **Auth → URL Configuration → Redirect URLs:** allow `.../auth/confirm` (and keep
   `/auth/callback` for OAuth). Without it Supabase rejects the redirect.
2. **Auth → Email Templates:** re-paste the three updated templates.
3. **Secure email change** stays **ON** (correct — two links; not a bug).

## Acceptance criteria

1. Change email → confirm both links → email changes at Supabase AND `/users/me` +
   Account Settings show the new email **immediately** (no sign-out/in).
2. Confirmation opened in a **different browser** completes (no `/login?error=auth`).
3. `users.email` in the local DB is updated after confirmation.
4. Signup + recovery confirmations also complete cross-browser (same `token_hash`
   path); OAuth still works via `/auth/callback`.
5. Tests cover the confirm route (type/token_hash guard) + parse logic; `/gate` green.

## Risks

- **Two-link secure change:** the email commits only after BOTH tokens verify. The
  final `verifyOtp` refreshes the session with the new email → `syncUser` mirrors it.
  Verified on the deployed env (acceptance #1).
- **Dashboard drift:** templates + Redirect URLs must be updated in Supabase or the
  new links 404/reject. Called out as explicit deploy steps.
- **verifyOtp session semantics** for email_change confirmed via context7 before
  coding the route (post-training API — no writing from memory).
