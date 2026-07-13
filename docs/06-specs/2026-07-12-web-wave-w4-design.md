# Web wave W4 — shared AuthFormField · noValidate stragglers · auth titles — design spec

**Date:** 2026-07-12 · **Scope:** apps/web only (no BE, no i18n additions
needed — all keys exist) · **Status:** approved (user 2026-07-12; W4 is the
last wave of the web debt program W1→W4).

## ① Shared `AuthFormField` (the 17-site field-group cluster)

Audit (2026-07-12, file:line verified): the block
`<div className="space-y-1.5"><Label/><Input/><AuthFieldError/></div>` repeats
17× across 7 auth/account forms. Invariants: wrapper `space-y-1.5` ·
`@tourism/ui` `Label htmlFor` + `Input id` · optional `AuthFieldError
id="{id}-error"` · aria wiring (`aria-required`/`aria-invalid`/
`aria-describedby`) hand-repeated per site. All in-scope sites use
`AuthFieldError` (`messages.auth.fieldErrors`, field union
fullName·email·password·confirm) — the public-form `FieldErrorText` family is
out of scope.

New `apps/web/src/components/auth/auth-form-field.tsx`:

```ts
type AuthFormFieldProps = {
  id: string;
  label: string;
  /** Error wiring — omit both for display-only/no-validation fields. */
  field?: 'fullName' | 'email' | 'password' | 'confirm';
  code?: FieldErrorCode;            // from lib/auth/validate
  required?: boolean;               // emits aria-required="true"
  hint?: string;                    // trailing muted <p> (profile email)
  after?: ReactNode;                // trailing slot (login forgot-password link)
  children?: ReactNode;             // custom control replaces the internal <Input>
} & ComponentPropsWithoutRef<typeof Input>; // name/type/autoComplete/placeholder/value/... spread to the internal Input
```

Behavior: renders the invariant wrapper/Label; when `children` absent renders
`<Input id={id} aria-required={required || undefined}
aria-invalid={Boolean(code) || undefined}
aria-describedby={code ? `${id}-error` : undefined} {...rest} />`; renders
`<AuthFieldError id={`${id}-error`} field={field} code={code} />` only when
`field` given; then `hint`, then `after`. RTL spec (co-located
`auth-form-field.spec.tsx`, copying trust-band's `jest.mock('@tourism/ui')`
barrel-stub pattern — direct barrel import crashes jsdom via maplibre/gsap).

**Migration — 16 of 17 sites** (DOM-equivalent; the one sanctioned delta:
the valid state renders NO `aria-invalid` attribute where old code rendered
`aria-invalid="false"` — ARIA's default is false and the `@tourism/ui` Input
styling only matches `[aria-invalid="true"]`, so behavior is identical):
register ×4 · login ×2 (password uses `after` for the forgot-link) ·
reset-password ×2 · forgot-password ×1 (scalar `fieldError` state maps fine) ·
change-email ×2 (current-email = display-only: no field/code, disabled
readOnly) · change-password ×1 (confirm only) · profile ×3 (no field/code;
email uses `hint` + disabled readOnly).
**Stays bespoke (1):** change-password's new-password group — relative
wrapper + visibility toggle + strength meter is a composite control, not a
field row (documented here, not debt).

## ② noValidate stragglers (standing rule sweep)

- `profile-form.tsx:61` — the ONLY auth/account form missing `noValidate`;
  add it. Its fields are genuinely optional → no `aria-required` added
  (correct per rule: aria-required marks required fields only).
- `booking-actions.tsx:154` cancel-reason form — add `noValidate`.
- `hero.tsx:53` + `blog/page.tsx:126` GET search forms — add `noValidate`
  for uniformity (no validation surface today; guards against a future
  `required` slipping native UI in).

## ③ Auth titles → i18n (W3 leftover nit)

`login/page.tsx` `title: 'Sign in'` → `messages.auth.login.title`
("Welcome back" — also fixes the copy mismatch with the on-page AuthShell
heading); `register/page.tsx` `title: 'Create your account'` →
`messages.auth.register.title`. Follows the exact W3 pattern of forgot/reset
(auth metadata lives under `messages.auth.*`, NOT `pageMeta`).

## Non-goals

Public lead-form `FieldErrorText` family unification (different namespace,
working fine) · restyling any field · the bespoke new-password composite ·
BE/i18n changes.

## Testing

TDD the component: `auth-form-field.spec.tsx` red-first — label/input id
wiring · aria-required only when required · error state (aria-invalid +
describedby + message via mocked FieldError) · no error elements when
field/code omitted · hint + after slots · children replaces internal Input.
Migrated forms: existing suites stay green (behavior identical); gate +
`format:check`.

## Definition of done

One `AuthFormField` renders 16 of the 17 field groups with identical DOM and
centralized aria wiring; every `<form>` in apps/web carries `noValidate`;
login/register tab titles read from i18n; gate green; changelog + sweep
(this closes the web debt program W1→W4).
