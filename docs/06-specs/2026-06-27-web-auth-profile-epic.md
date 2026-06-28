# Design + plan — Web auth & profile (epic)

> Status: executing · Date: 2026-06-27 · Web-only (admin auth reactivity is the optional last slice).
> Make customer auth + profile **complete**. Built slice-by-slice (one branch/PR each); user reviews
> between merges. Sequence is simple → hard (the account hub lands early so later slices attach to it).

## Current state

Have: login · register · email-confirm `/auth/callback` (PKCE `exchangeCodeForSession` + mirror +
redirect by `redirect` param) · client-side sign-in/out (reactive navbar) · `mirrorUser` · proxy gates
`/account/*` + `/tours/:slug/book`. `/account` is a stub. No password reset, no profile edit, no avatar
upload, no OAuth.

Backend (customer-usable): `GET /users/me` · `PATCH /users/me` (`fullName?`,`phone?`) ·
`PUT/DELETE /users/me/avatar`. **Gap:** Cloudinary signing is `POST /admin/uploads` (admin-only) → a
customer can't sign a `USER_AVATAR` upload → **S4 needs a BE change**.

## Slices

### S1 — Password reset + resend confirm  ·  FE+Supabase  ·  branch `feat/web-password-reset`

- `/forgot-password`: email → `resetPasswordForEmail(email, { redirectTo: <origin>/auth/callback?redirect=/reset-password })` → "check inbox".
- `/reset-password`: reached via the recovery session the callback established → new password + confirm → `updateUser({ password })` → `/account`. No session → "link expired".
- "Forgot password?" link on login.
- Register "check inbox": **Resend** → `supabase.auth.resend({ type: 'signup', email })`.
- Pure helper (TDD): `validatePasswordPair(password, confirm)` (min 6, match) — reused by register + reset.
- i18n `messages.auth.forgot/reset` + resend copy.

### S2 — Account hub + profile edit + real name in navbar  ·  FE

- `/account` → settings hub. `/account/profile`: `GET /users/me` → show email (read-only) + edit `fullName`/`phone` via `PATCH /users/me`.
- Pure helper (TDD): `buildUpdateProfilePayload(form)` (trim, drop empty).
- Navbar/UserMenu shows `fullName` (fallback email). Needs the profile fetched client-side (extend AuthProvider or a small `useProfile`).

### S3 — Change password + change email  ·  FE+Supabase

- In account: change password (`updateUser({ password })`, logged-in) + change email (`updateUser({ email })` → confirmation → `/auth/callback` handles the code → re-mirror). Surface "confirm sent" + handle the email-change return.

### S4 — Avatar  ·  **BE + FE**  ·  hardest

- **BE:** a customer-scoped signed upload for `USER_AVATAR` (e.g. `POST /users/me/avatar/sign` reusing `UploadsService.createSignedUploadParams`, JWT-guarded, purpose pinned to `USER_AVATAR`) + unit test.
- **FE:** avatar picker → direct Cloudinary upload (signed) → `PUT /users/me/avatar` (publicId) · remove via `DELETE` · show avatar in navbar + profile.

### S5 — Google OAuth  ·  FE + external config

- "Continue with Google" on login/register → `signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/auth/callback } })`. Callback already exchanges the code + mirrors.
- **Manual config:** Google Cloud OAuth client + enable Google provider in Supabase (Client ID/Secret) + add redirect URLs.

### S6 *(optional, last)* — Admin auth reactivity (B1 admin)

- Mirror the web client-side sign-in/out into admin (sign-in keeps `/auth/admin/sync` + 403 → sign-out).

## Manual prerequisites (guided at the right time)

- S1/S3: Supabase → email templates (reset / change-email) on + **Redirect URLs** include `<web>/auth/callback` and `<web>/reset-password`.
- S5: Google Cloud OAuth credentials + Supabase Google provider.

## Testing

TDD the pure helpers (password validation, profile payload). Gate (lint/typecheck/test/build) +
`check:no-hex` per slice. Full Supabase email / OAuth / avatar-upload paths = manual (need creds) —
documented, not faked.
