# Fix email-change confirmation — implementation plan

**Spec:** [`docs/06-specs/2026-07-16-fix-email-change-confirm-design.md`](../06-specs/2026-07-16-fix-email-change-confirm-design.md)
**Branch:** `feat/fix-email-change-confirm` · **Date:** 2026-07-16

## STATUS

- [x] T0 context7 confirm (`verifyOtp` token_hash · Route Handler · template link)
- [ ] T1 pure logic — `parseConfirmParams` (TDD)
- [ ] T2 `/auth/confirm` route handler + tests
- [ ] T3 email templates ×3 → token_hash + README
- [ ] T4 comment refresh (reset-password page · change-email-form)
- [ ] T5 gate + review

**RESUME STATE:** _(update as tasks complete)_. T0 confirmed:
`supabase.auth.verifyOtp({ type, token_hash })` (EmailOtpType =
signup|recovery|invite|email|email_change); SSR client sets session cookie on
success (recovery→PASSWORD_RECOVERY else SIGNED_IN); template link
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`; strip
token_hash/type from the redirect; verifyOtp failure leaves the session intact.

## Sequencing

T0 → T1 → T2 (T2 consumes T1). T3 + T4 independent (docs/comments). T5 last.

## Reused seams

- `/auth/callback/route.ts` — the pattern to mirror (SSR `createClient`,
  `safeRedirect`, `syncUser`, `/login?error=auth` on failure). **Do not modify it**
  (OAuth depends on it).
- `lib/auth/safe-redirect.ts` (already unit-tested) · `lib/auth/sync-user.ts`
  (`syncUser()` best-effort) · `lib/supabase/server.ts` (`createClient`).
- Route-test conventions: mock `next/server`, `next/navigation`, the SSR client,
  and `syncUser`; the web jsdom env has no global `Request`/`Response` (see
  `app/api/revalidate/route.spec.ts` from the prior feature).
- Templates share one v2 shell — edit the link lines only, keep layout in sync.

## Tasks

### T0 — context7 confirm ✅ (done — see RESUME STATE)

### T1 — `parseConfirmParams` (test-first)

`apps/web/src/lib/auth/confirm-params.spec.ts` FIRST (red), then
`confirm-params.ts`:
- valid: `type` ∈ {email_change, signup, recovery, invite} + non-empty
  `token_hash` → `{ tokenHash, type }`.
- null: unknown type (`type=foo`), missing type, missing/empty token_hash.

**Accept:** `pnpm nx test @tourism/web` green; referenced nowhere yet.

### T2 — `/auth/confirm` route

`apps/web/src/app/auth/confirm/route.ts` (`runtime='nodejs'`): read
`token_hash`/`type`/`redirect`; `parseConfirmParams` guard → `/login?error=auth`;
`verifyOtp({ type, token_hash })`; on error → `/login?error=auth`; on success →
`await syncUser()` then `NextResponse.redirect(origin + safeRedirect(redirect,
'/account'))` (token_hash/type not carried through). `route.spec.ts` drives: bad
params, unknown type, verifyOtp error, verifyOtp success (asserts `syncUser`
called + redirect target). Mock SSR client `verifyOtp` + `syncUser` + `next/*`.

**Accept:** `pnpm nx test @tourism/web` green; no lint/module-boundary violations.

### T3 — templates → token_hash

Edit the button href (L176) + copy-paste fallback (L219/220) in all three
templates per the spec table. Update `docs/email-templates/README.md` (remove the
"don't remove ConfirmationURL" note; add token_hash + re-paste step). No app code.

**Accept:** grep shows `{{ .TokenHash }}` + `/auth/confirm` in all three; no
`{{ .ConfirmationURL }}` left in them.

### T4 — comment refresh

`reset-password/page.tsx` (L14 comment) + `components/account/change-email-form.tsx`
(L16-18 doc comment) → describe the `/auth/confirm` token_hash path. Comments only.

**Accept:** typecheck green; no behavioural diff.

### T5 — gate + review

Kill orphan node first, then `pnpm nx affected -t lint typecheck test build`.
`superpowers:requesting-code-review` (auth path — careful pass on the type
guard + redirect-safety + that `/auth/callback`/OAuth is untouched). Report the
web test-count delta (baseline 300 pre-branch; note this branch is off `main`
after the revalidation merge, so re-baseline at run time). **STOP before merge.**

**Accept:** gate green; review clean; report delivered.

## Post-merge (rule 9)

CHANGELOG entry · CLAUDE.md web row (auth-confirm note) · HANDOFF · `frontend.md`
(`/auth/confirm` route + token_hash auth flow) · roadmap if needed. **Deploy
to-do (dashboard):** paste the 3 updated templates + allow `/auth/confirm` in
Supabase Redirect URLs. Verify on the deployed env: change email → both links
(try a different browser) → new email shows immediately in Account Settings +
`/users/me` + Supabase Users.
