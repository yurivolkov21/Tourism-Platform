# Email change: single-confirm + notify old address + password re-auth — design spec

**Date:** 2026-07-16 · **Scope:** `@tourism/web` + `@tourism/api` (+ Supabase dashboard config) · **Status:** APPROVED (design signed off 2026-07-16)

## Goal

Reshape the email-change flow to the mainstream, low-friction consumer pattern
(what Google/GitHub/Amazon do): **one confirmation on the NEW address**, a
**security notification to the OLD address**, and **password re-authentication**
before the change. Restrict email change to **password-only accounts** so an
account whose email is managed by Google is never left in an inconsistent state.

Builds on the just-shipped `/auth/confirm` token_hash flow (`406f02c`).

### Why (research-backed)

The current "Secure email change" (Supabase default) requires confirming links in
**both** the old and new inboxes — high friction and confusing for customers, and
it locks out anyone who has lost access to the old inbox. Industry norm and OWASP
(for MFA-less password accounts the strict dual-confirm is the fallback; the
preferred UX is confirm-new + notify-old). Sources captured in the conversation
(OWASP "Changing a User's Registered Email Address"; Google/GitHub/Amazon flows).

### Locked decisions

1. **Turn OFF Supabase "Secure email change"** → single confirmation to the new
   address (via the existing `/auth/confirm?type=email_change` route). Dashboard
   toggle, not code.
2. **Notify the OLD address** with a branded "your email was changed" email
   (informational — no revert link; contact/support pointer only).
3. **Password re-auth** before the change (verify current password).
4. **Email change is allowed ONLY for password-only accounts** — the account has
   an `email` identity and **no** OAuth (Google) identity. Accounts with a Google
   identity (Google-only OR password+Google) are **blocked** with an explanatory
   note (avoids the primary-email vs Google-identity-email mismatch). Unlinking
   Google to enable a change is a **deferred follow-up** (needs Supabase manual
   linking enabled + new UI).

### Identity-model analysis (basis for #4)

Supabase ([Identity Linking docs](https://supabase.com/docs/guides/auth/auth-identity-linking)):
automatic linking merges only **same-email** identities and enforces unique
emails; a Google sign-in with a *different* email creates a separate account.
**Manual linking** (`linkIdentity`, different-email) is beta, default-off, and the
app never calls it (grep: zero `linkIdentity`/`identities` usage, no linking UI).
⇒ "password account A + linked Google email B" **cannot occur** here. The only
cross-provider case is same-email auto-link (password+Google on one email), which
#4 blocks from email change.

### Out of scope (follow-up)

- Unlink-Google flow (a "Linked accounts" section) → would let a linked account
  become password-only and then change email.
- Password re-auth for the separate **change-password** form (same identity idea).
- Revert-email link; MFA.

## Design

### A. Supabase dashboard (deploy step)

Auth → Providers → Email → **Secure email change: OFF**. Confirmation then goes to
the new address only; `/auth/confirm` completes it in one click.

### B. Gate the form to password-only accounts (`@tourism/web`)

- New pure helper `apps/web/src/lib/auth/can-change-email.ts`:
  `canChangeEmail(identities)` → `true` **iff** identities contains a `provider ===
  'email'` entry **and no** entry with a different provider; `false` for
  empty/nullish (conservative — block when unknown).
- `apps/web/src/app/account/profile/page.tsx` already calls `supabase.auth.getUser()`.
  Render `<ChangeEmailForm>` only when `canChangeEmail(user.identities)`; otherwise
  a note: *"Email của tài khoản này được quản lý qua Google. Để thay đổi, vui lòng
  dùng tài khoản Google của bạn."* (i18n).

### C. Password re-auth on the change form (`@tourism/web`)

`apps/web/src/components/account/change-email-form.tsx` gains a required **current
password** field. On submit: verify via `supabase.auth.signInWithPassword({ email:
currentEmail, password })` (Supabase has no dedicated verify-password API; this is
the standard confirm). Error → per-field "mật khẩu không đúng"; success →
`updateUser({ email })`. No OAuth branch — the form only renders for password
accounts (B). i18n: new label + error keys.

### D. Notify the old address (`@tourism/api`)

Detected + sent through the existing outbox/Resend/pg-boss pipeline (ADR-0007):

- **Migration:** add `EMAIL_CHANGED` to the `EmailType` enum (8th type).
- **`auth.service.ts` `upsert`, `bySub` branch:** `bySub.email` is the pre-update
  (OLD) mirror value. If `bySub.email.toLowerCase() !== emailLower`, the email just
  changed. Wrap the update + an `outbox.createMany` in one `$transaction` (same
  idiom as `moderateById`): enqueue `{ type: EMAIL_CHANGED, payload: { oldEmail:
  bySub.email, newEmail: emailLower }, dedupeKey: 'email-changed:<bySub.id>:<newEmail>' }`
  (`skipDuplicates`). Fires exactly once — the next sync sees mirror == JWT. Payload
  is self-sufficient (like `NEWSLETTER_WELCOME`); the OLD address is gone from the
  row after the change, so it must live in the payload.
- **`outbox.service.ts`:** new `case EmailType.EMAIL_CHANGED: return this.sendEmailChanged(row)`
  → reads `{ oldEmail, newEmail }`, calls `email.sendEmailChangedNotice({ to:
  oldEmail, vars: { newEmail, manageUrl: `${frontendUrl}/account`, supportUrl:
  `${frontendUrl}/contact` } })`.
- **`email.templates.ts`:** `EmailChangedVars` + `renderEmailChanged` (v2 shell,
  matches the other Resend templates): subject "Your Nexora email was changed",
  body states the account email changed to `newEmail`, "if this wasn't you,
  contact support", support/contact link.
- **`email.service.ts`:** `sendEmailChangedNotice({ to, vars })` → `dispatch(to,
  renderEmailChanged(vars), 'email-changed:'+to)`.

The notification fires when the change **completes** (the post-`/auth/confirm`
`syncUser()` upsert observes the new JWT email), so timing is correct.

### Flow (end to end)

```
Account → change email: enter new email + current password (password-only accounts)
  → signInWithPassword(current) verify → updateUser({ email: new })
  → Supabase sends ONE confirm to NEW address (Secure email change OFF)
  → click → /auth/confirm?type=email_change → verifyOtp → email changes
      → syncUser() → API upsert: bySub.email (old) != new
          → EMAIL_CHANGED outbox → drain → Resend → OLD address gets the notice
      → mirror updated → /users/me shows new email immediately
```

## Testing (TDD on logic)

- `apps/web/src/lib/auth/can-change-email.spec.ts`: email-only → true;
  email+google → false; google-only → false; empty/null → false.
- API `auth.service.spec.ts`: enqueue `EMAIL_CHANGED` (correct payload + dedupeKey)
  when `bySub.email` differs; NOT enqueued when equal, nor on the `byEmail`
  relink / `create` branches.
- `email.templates.spec.ts`: `renderEmailChanged` (subject, both addresses,
  HTML-escaping). `email.service.spec.ts`: `sendEmailChangedNotice` dispatch tag/to.
  `outbox.service.spec.ts`: `EMAIL_CHANGED` dispatch reads payload → service call.
- `change-email-form.spec.tsx`: renders password field; wrong password (mock
  `signInWithPassword` error) blocks + shows field error, no `updateUser`; correct
  password → `updateUser({ email })` called. Mock the `@tourism/ui` barrel per
  convention.

## Planned files

| File | Change |
| --- | --- |
| `apps/web/src/lib/auth/can-change-email.ts` (+ `.spec.ts`) | new — gate helper (TDD) |
| `apps/web/src/app/account/profile/page.tsx` | gate `ChangeEmailForm` + note |
| `apps/web/src/components/account/change-email-form.tsx` (+ `.spec.tsx`) | password field + re-auth |
| `libs/shared/i18n/src/lib/messages.ts` | new email-security note + password label/errors |
| `apps/api/prisma/schema.prisma` + `migrations/…_add_email_changed_type/` | `EmailType.EMAIL_CHANGED` |
| `apps/api/src/modules/auth/auth.service.ts` (+ spec) | enqueue on detected change |
| `apps/api/src/modules/jobs/outbox.service.ts` (+ spec) | `EMAIL_CHANGED` dispatch |
| `apps/api/src/modules/email/email.templates.ts` (+ spec) · `email.service.ts` (+ spec) | renderer + sender |
| `docs/03-reference/*` · `docs/CHANGELOG.md` | docs sweep on merge (rule 9) |

## Deploy steps (outside code)

1. Apply the Prisma migration (adds the enum value) to Supabase Postgres.
2. Supabase → Auth → Providers → Email → **Secure email change: OFF**.
3. Resend/outbox already live → the notification sends with no extra infra.

## Acceptance criteria

1. Password account: change email → enter wrong current password → blocked with a
   field error; correct password → confirmation sent to the NEW address only.
2. Confirm on the new address → email changes, `/users/me` + Account show it
   immediately; the OLD address receives the "email was changed" notice once.
3. Google-linked account (Google-only or password+Google): the change-email form
   is replaced by the managed-by-Google note — no way to trigger a change.
4. Tests cover `canChangeEmail`, the enqueue-on-change branch, the renderer/dispatch,
   and the re-auth form; `/gate` green.

## Risks

- **`signInWithPassword` re-auth** refreshes the session (new tokens) — benign
  (same user). Verified against Supabase docs before coding (post-training API).
- **Enum-value migration** on Postgres: `ALTER TYPE … ADD VALUE` — applied via the
  normal migration path; can't run inside a txn on older PG (Prisma handles it).
- **Notification depends on a sync** after confirm: our `/auth/confirm` always
  calls `syncUser()`, so the change is always observed. If email ever changes with
  no sync (e.g. admin edits Supabase directly), the notice fires on the next sync.
