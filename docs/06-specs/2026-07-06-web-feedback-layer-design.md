# Web feedback layer — toast + AlertDialog

- **Date:** 2026-07-06
- **Candidate:** HANDOFF §Next action — "web feedback layer (toast/AlertDialog on
  web)". Closes the UX-consistency gap the cancellation flow exposed: admin has a
  toast + flash layer; web has none (inline status only).
- **Scope:** `apps/web` only (+ maybe a doc note). No backend, no schema. Mount a
  toast layer, port admin's flash pattern for redirect-based actions, migrate a
  focused high-value set of mutations to fire toasts, and standardize the two
  genuinely-destructive confirms on `AlertDialog`.

## Locked decisions (brainstorming 2026-07-06)

1. **Mirror admin's proven pattern** — mount `<Toaster>` in the web root layout +
   port `lib/flash.ts` (`resolveFlash`/`flashPath`) + `<FlashToaster>` verbatim
   (only the flash-key map differs). No new abstraction.
2. **Toast vs inline rule:** toast fires for **operation outcomes** — success
   ("Profile saved", "Message sent", "Subscribed", "Cancellation requested",
   "Booking cancelled", "Saved to wishlist") and operation-level errors
   ("Couldn't save — try again", rate-limited). **Field-level validation errors
   stay inline** (password too short, invalid email) — they must point at the
   input; a transient toast can't.
3. **Redirect actions use flash:** a Server Action that redirects can't fire a
   client toast, so it redirects with `?flash=<key>` and `<FlashToaster>` fires
   on landing. The only redirect case in this scope is **delete account**
   (→ home, `account-deleted`).
4. **AlertDialog for the destructive confirms:** convert the two `Dialog`-based
   confirms that gate irreversible actions — **cancel PENDING booking** and
   **delete account** — to `AlertDialog` (role=alertdialog, focus on the action,
   a11y parity with admin).
5. **Surface set (high-value + wishlist + enquiry family; auth excluded):**
   - **Account:** `profile-form`, `change-email-form`, `change-password-form`,
     `avatar-uploader`, `danger-zone` (delete → AlertDialog + flash).
   - **Booking:** `booking-actions` (cancel PENDING → AlertDialog + toast;
     cancellation request → toast).
   - **Contact / lead capture:** `contact-inquiry`, plus the enquiry family for a
     uniform lead-capture surface: `enquiry-cta`, `plan-trip-form`,
     `private-request-form`.
   - **Newsletter:** `newsletter-form`.
   - **Wishlist:** the save/remove toggle (tour-detail `BookingBox` heart + the
     account "saved tours" manage/un-save).
   - **Excluded (deferred):** auth (`login`/`register`/`forgot`/`reset`/
     `resend-confirmation`) — they redirect or have dedicated page states, low
     marginal value, sensitive flows; `checkout-result` (already a full-page
     outcome); booking pay/create (redirects to the gateway — the checkout
     success/cancel pages own that outcome).

## Verified facts (from code, 2026-07-06)

- `@tourism/ui` exports `sonner` (`Toaster` + `toast`, `libs/web/ui/src/index.ts:63`)
  and `alert-dialog` (`:9`). Web imports neither today.
- **Web root layout** (`apps/web/src/app/layout.tsx`): `<body>` → `ThemeProvider`
  → `AuthProvider` → `{children}`. **No `<Toaster>` is mounted.** (Admin mounts
  `<Toaster position="bottom-right" richColors />` + `<FlashToaster>` in its
  layout — `apps/admin/src/app/layout.tsx:27-29`.)
- **Admin flash pattern is directly portable** — `apps/admin/src/lib/flash.ts`
  exposes pure `resolveFlash(key): FlashMessage | null` (over a `Record<string,
  {type,text}>` map) + `flashPath(path, key)` (appends `?flash=`); the client
  `apps/admin/src/components/feedback/flash-toaster.tsx` reads `?flash`, fires the
  mapped `toast`, guards a StrictMode double-fire, and strips the param via
  `router.replace`. The web port copies both, changing only the key map.
- **Web islands already follow a client-island + Server Action pattern** with
  inline `role="status"`/`role="alert"` states (~20 components). The mutation
  results we surface as toasts currently live as inline `setStatus`/`{ok,error}`
  states; field validation is separate (zod/HTML5). Migration = fire a toast on
  the outcome and drop the inline *operation-level* status line, keeping inline
  *field* errors.
- `danger-zone` (delete account) and `booking-actions` (cancel PENDING) both use
  `Dialog`/`DialogContent` today (`danger-zone.tsx:11-17`; booking-actions PENDING
  branch). `deleteAccount` signs out + leaves (redirect) → the flash case.
- Newsletter subscribe is **silent-dedupe / no email-exists oracle** — the toast
  must say "Subscribed" on both a new subscribe and a dedupe (no distinct
  "already subscribed" message); a rate-limit still gets its own toast.

## Design

### 1. Infra (new)

- **`apps/web/src/lib/flash.ts`** — port admin's: `FlashType`, `FlashMessage`,
  `resolveFlash`, `flashPath`; the key map holds web keys. Initial keys:
  ```ts
  const FLASH_MESSAGES = {
    'account-deleted': { type: 'success', text: 'Your account has been deleted.' },
  };
  ```
  Pure module — safe to import server + client. (Extensible; more keys land as
  future redirect flows need them.)
- **`apps/web/src/components/feedback/flash-toaster.tsx`** — port admin's
  `<FlashToaster>` verbatim (imports web `../../lib/flash`).
- **`apps/web/src/app/layout.tsx`** — mount `<Toaster position="bottom-right"
  richColors />` + `<FlashToaster />` inside `ThemeProvider` (next to
  `{children}`), matching admin. `<FlashToaster>` needs a Suspense boundary iff
  `useSearchParams` requires one under the app's config — mirror how admin mounts
  it (admin mounts it directly; follow the same, add Suspense only if the build
  demands it).

### 2. Per-surface migration (the rule applied)

For each surface's client island: on the Server Action / api-call result, fire
`toast.success(...)` or `toast.error(...)`; remove the inline operation-level
status line; **keep** any field-level validation error inline.

- **Account** (`profile-form`, `change-email-form`, `change-password-form`,
  `avatar-uploader`): success → `toast.success('Saved.')`-style copy per form;
  operation error → `toast.error(<message>)`. Field/zod errors stay inline.
- **danger-zone** (delete account): `Dialog` → `AlertDialog` confirm; the
  `deleteAccount` action redirects home with `flashPath('/', 'account-deleted')`;
  `<FlashToaster>` fires on landing. (No client toast — the page navigates.)
- **booking-actions**: cancel PENDING → `AlertDialog` confirm; on `{ ok: true }`
  → `toast.success(messages.booking.detail.cancelled)` then `router.refresh()`;
  on error → `toast.error(...)`. Cancellation request (PAID) → on `{ ok: true }`
  → `toast.success('Cancellation requested …')` + `router.refresh()`; error →
  `toast.error(result.error ?? …)`. Inline field bits (reason) stay.
- **contact-inquiry + enquiry family** (`enquiry-cta`, `plan-trip-form`,
  `private-request-form`): submit success → `toast.success('Message sent — we'll
  be in touch.')`; `rateLimited` → `toast.error('Too many messages — please try
  again shortly.')`; generic error → `toast.error(...)`. Field validation stays
  inline. (These currently carry an inline success/rateLimited/error tri-state —
  replace the operation part with toasts, keep the form's field errors.)
- **newsletter-form**: subscribe success (incl. silent dedupe) →
  `toast.success('Subscribed — thanks!')`; rate-limit → `toast.error(...)`.
- **wishlist toggle** (tour-detail heart + account saved): on save →
  `toast.success('Saved to wishlist.')`; on remove → `toast.success('Removed from
  wishlist.')`; failure → `toast.error(...)`. (This is the biggest *gap* fill —
  the toggle has near-zero feedback today.)

Copy lives in `@tourism/i18n` where a surface already reads from it (booking); for
one-off toast strings, add keys under the relevant `messages.*` namespace rather
than inlining (English-only, ADR-0005). New generic keys (e.g.
`messages.feedback.*` or per-surface) as needed.

### 3. AlertDialog standardization

Only the two irreversible confirms move `Dialog` → `AlertDialog`
(`AlertDialogContent/Header/Title/Description/Footer/Cancel/Action`): **cancel
PENDING booking** and **delete account**. Destructive action = `AlertDialogAction`
with `variant="destructive"`; keep the existing copy. No other dialog changes.

## Testing

- **TDD (pure logic):** `lib/flash.ts` — `resolveFlash` (known key → message;
  unknown/empty → null) + `flashPath` (appends `flash`, preserves existing query).
  Mirror admin's flash test if one exists; otherwise write the equivalent web spec.
- **Islands/layout:** no unit tests (consistent with the repo — FE islands aren't
  unit-tested); verified by manual smoke + existing e2e. `/gate` (lint + build +
  test) green.
- **Manual smoke checklist** (per surface): success toast fires; operation error
  toast fires; field validation still shows inline; delete-account flash toast
  fires after redirect; the two AlertDialogs trap focus + confirm/cancel correctly.

## Docs sweep (rule 9, after merge)

- `CLAUDE.md` `@tourism/web` row + `docs/…/frontend.md` (if it documents feedback
  patterns): note the web toast + flash layer + AlertDialog standardization.
- `HANDOFF.md` §Next action: mark "web feedback layer" done.
- Test-count baseline (web) if it changes (the flash spec adds a small count).

## Out of scope / future

- Auth flows (login/register/forgot/reset/resend) — deferred.
- A global error-boundary toast / offline detection.
- Migrating every remaining inline-status surface — only the listed high-value set.
- Backend changes — none.

## Open questions

None — surface set + toast/inline rule + AlertDialog scope locked 2026-07-06.
