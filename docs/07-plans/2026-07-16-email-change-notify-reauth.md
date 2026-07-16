# Email change: notify-old + re-auth + gate — implementation plan

**Spec:** [`docs/06-specs/2026-07-16-email-change-notify-reauth-design.md`](../06-specs/2026-07-16-email-change-notify-reauth-design.md)
**Branch:** `feat/email-change-notify-reauth` · **Date:** 2026-07-16

## STATUS

- [x] T0 context7 confirm — re-auth via `signInWithPassword({email,password})` then
  `updateUser({email})` (`current_password` is documented for password change only,
  not email-only). Gate reuses the profile page's existing
  `readProviders(user.app_metadata)` → helper takes `providers: string[]` (page also
  already has a `ConnectedAccounts` section).
- [x] T1 web gate helper `canChangeEmail` (TDD) + wire profile page
- [x] T2 web re-auth on `change-email-form` + tests + i18n
- [x] T3 api migration: `EmailType.EMAIL_CHANGED`
- [x] T4 api enqueue on detected change (`auth.service`) + tests
- [x] T5 api email: renderer + sender + outbox dispatch + tests
- [x] T6 gate + review

**RESUME STATE:** MERGED to `main` (feat `83d76a0` + docs sweep). Gate green
(api 558 · web 336). Review 1 finding fixed: email-keyed `dedupeKey` would drop
the notice on a repeat A→B→A→B change (SENT rows kept forever) → switched to a
per-enqueue uuid. **Deploy to-do (outside repo): apply the migration to Supabase
+ Auth → Providers → Email → Secure email change OFF.**

## Sequencing

T0 first. Web lane: T1 → T2 (independent of api). Api lane: T3 → T4 → T5 (T4/T5
both need the enum from T3). T6 last. Web + api lanes interleave.

## Reused seams

- Outbox idiom: `moderateById` (`reviews.service.ts`) = `$transaction(update +
  outbox.createMany skipDuplicates)`; `NEWSLETTER_WELCOME` = self-sufficient
  payload + `email-changed:${to}` dispatch tag.
- Email stack: `email.templates.ts` renderers (v2 shell, `escapeHtml`),
  `email.service.ts` `sendX → dispatch`, `outbox.service.ts` `dispatch` switch.
- `account/profile/page.tsx` already has `supabase.auth.getUser()` (identities).
- Form conventions: `AuthFormField`, `validate.ts`, `noValidate`, per-field errors,
  `@tourism/ui` barrel mock in component specs (`auth-form-field.spec.tsx`).
- Config: `frontendUrl` already injected in `outbox.service.ts`.

## Tasks

### T0 — context7 confirm

`signInWithPassword` as a re-auth/verify step (return shape, session refresh
behaviour) and the `user.identities[].provider` shape from `getUser()`. Record in
RESUME STATE. No writing from memory on the Supabase auth API.

### T1 — gate helper + profile wiring

`apps/web/src/lib/auth/can-change-email.spec.ts` FIRST, then `can-change-email.ts`:
`canChangeEmail(identities)` → true iff an `email` provider is present and no other
provider; false for empty/nullish. Then `account/profile/page.tsx`: render
`<ChangeEmailForm>` only when true, else the managed-by-Google note (i18n key).

**Accept:** `pnpm nx test @tourism/web` green; profile page typechecks.

### T2 — re-auth on the change form

`change-email-form.tsx`: add required current-password `AuthFormField`; on submit
`signInWithPassword({ email: currentEmail, password })` → error → field error (no
`updateUser`); success → `updateUser({ email })`. i18n: password label +
"wrong password" + the managed-by-Google note. `change-email-form.spec.tsx`
(barrel mock): password field renders; wrong password blocks + shows error, no
`updateUser`; correct → `updateUser({ email })` called.

**Accept:** `pnpm nx test @tourism/web` green.

### T3 — migration: `EMAIL_CHANGED`

Add `EMAIL_CHANGED` to `enum EmailType` in `schema.prisma`; create
`apps/api/prisma/migrations/<ts>_add_email_changed_type/migration.sql` with
`ALTER TYPE "EmailType" ADD VALUE 'EMAIL_CHANGED';` (match existing folder naming).
`prisma generate` so the client type includes it.

**Accept:** `pnpm nx typecheck @tourism/api` sees the new enum member; migration
file present (applied to Supabase at deploy time).

### T4 — enqueue on detected change

`auth.service.ts` `upsert` `bySub` branch: compute `emailChanged =
bySub.email.toLowerCase() !== emailLower`; wrap the update + (if changed)
`outbox.createMany({ type: EMAIL_CHANGED, payload: { oldEmail: bySub.email,
newEmail: emailLower }, dedupeKey: 'email-changed:'+bySub.id+':'+emailLower },
skipDuplicates)` in `$transaction`. Extend `auth.service.spec.ts`: enqueue on
change (payload + dedupeKey asserted), not on equal-email, not on relink/create.

**Accept:** `pnpm nx test @tourism/api` green.

### T5 — email renderer + sender + dispatch

`email.templates.ts`: `EmailChangedVars` + `renderEmailChanged` (v2 shell, escape).
`email.service.ts`: `sendEmailChangedNotice`. `outbox.service.ts`: `case
EMAIL_CHANGED → sendEmailChanged(row)` reading payload → `email.sendEmailChangedNotice`.
Specs: `email.templates.spec.ts` (render), `email.service.spec.ts` (dispatch tag),
`outbox.service.spec.ts` (payload → sender).

**Accept:** `pnpm nx test @tourism/api` green.

### T6 — gate + review

Kill orphan node, `pnpm nx affected -t lint typecheck test build`.
`superpowers:requesting-code-review` (auth + email path — careful on the
gate-helper logic, the enqueue-once guarantee, and re-auth). Report test-count
deltas (web 329 · api 551 baselines). **STOP before merge.**

**Accept:** gate green; review clean; report delivered.

## Post-merge (rule 9)

CHANGELOG · CLAUDE.md web+api rows · HANDOFF · `frontend.md` (email-change gate +
re-auth) · `backend.md` (EMAIL_CHANGED outbox type) · `functions-*`/data-model if
the enum is catalogued. **Deploy to-do:** apply the migration to Supabase +
**turn Secure email change OFF**. Verify: change email (wrong then right password)
→ new address confirms → old address gets the notice → Account shows new email;
Google-linked account shows the note.
