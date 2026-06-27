# Design + plan — Web account settings (redesign)

> Status: executing · Branch: `feat/web-account-settings` · Date: 2026-06-27
> Redesign `/account/profile` into one unified **settings** page (adapts the Shadcn "Account Settings 01"
> two-column section pattern), merging the old `/account/security`. Mapped to Nexora's real data.

## Sections (two-column: label/desc left, form right, `Separator` between)

1. **Personal information** — avatar (existing uploader) + Full name + Phone (`GET`/`PATCH /users/me`,
   `saveProfile`). Drop the block's first/last/country/gender/role (not in our model).
2. **Email & password** — email (read-only + change-email form) + change-password, **with a password
   strength meter + show/hide toggle** (the nice bits from the block). Keep the min-6 rule (meter is
   advisory).
3. **Connected accounts** — read-only: show "Google" when the user has a Google identity (from the
   Supabase session's `app_metadata.providers` / identities). No link/unlink this slice.
4. **Danger zone** — Delete account, behind a confirm dialog.

## Backend (new)

`DELETE /api/v1/users/me` (auth):
- If the caller has **any bookings** → 409 `ACCOUNT_HAS_BOOKINGS` (Booking.user is `onDelete: Restrict`;
  keep financial records — tell them to contact support). Else:
- Delete the local `User` row (cascades reviews + wishlist), then delete the Supabase auth user via the
  **Admin REST** (`DELETE {SUPABASE_URL}/auth/v1/admin/users/{supabaseId}` with the service-role key —
  no new dependency). Unit test the controller branch.

## Frontend

- `/account/profile` → the settings page (server: `getUser` + `fetchProfile`; reads identity providers
  from the session for Connected accounts). `/account/security` → redirect to `/account/profile`.
- Pure helper (TDD): `scorePassword(pw)` → `{ score 0–5, label, tone }` (token tones, no raw palette).
- Components: `personal-info`, `email-password` (reuses change-pw/email logic + meter + toggle),
  `connected-accounts`, `danger-zone` (delete dialog → `deleteAccount` action → native fetch `DELETE
  /users/me` → sign out + redirect home).
- i18n `messages.auth.account.settings.*`.

## Out of scope
Link/unlink OAuth providers; social URLs; preferences/users tabs; anonymise-instead-of-delete.

## Testing
TDD `scorePassword` + the delete-account controller branch. Gate + `check:no-hex`. Full delete/email
flows = manual (need a no-booking account / real email).
