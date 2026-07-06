# Web feedback layer (toast + AlertDialog) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `apps/web` a toast feedback layer (mirroring admin) so user mutations confirm their outcome, and standardize the two destructive confirms on `AlertDialog`.

**Architecture:** Port admin's proven toast + flash pattern verbatim (mount `<Toaster>` + `<FlashToaster>` in the web root layout; a pure `lib/flash.ts` for redirect-based actions). Then migrate a focused set of client-island mutations to fire `toast.success/error` on their action result, keeping field-level validation inline. Convert the cancel-booking and delete-account confirms from `Dialog` to `AlertDialog`.

**Tech Stack:** Next.js 16 (App Router, client islands + Server Actions) · `@tourism/ui` (`sonner` Toaster/`toast`, `AlertDialog`) · `@tourism/i18n` (English-only copy) · Jest-style specs.

**Spec:** `docs/06-specs/2026-07-06-web-feedback-layer-design.md` — read it first.

## Global Constraints

- **`apps/web` only** — no backend, no schema, no `@tourism/api` changes.
- **Toast = operation outcome** (success + operation-level errors: save failed,
  rate-limited, network). **Inline stays for field-level validation** (password
  too short, invalid email) — never move field errors to toast.
- **Redirect actions use flash:** a Server Action that redirects can't fire a
  client toast → redirect via `flashPath(path, key)` and let `<FlashToaster>`
  fire on landing. Only `deleteAccount` (→ home, key `account-deleted`) in scope.
- **AlertDialog only for the two destructive confirms:** cancel PENDING booking +
  delete account. No other dialog changes.
- **Copy lives in `@tourism/i18n`** (English-only, ADR-0005) — add keys, never
  inline user-facing toast strings. **No hex colors** — `@tourism/ui`/tokens only.
- **Mirror admin verbatim** where a file is ported (`lib/flash.ts`,
  `FlashToaster`) — only the flash-key map differs.
- Straight quotes · Conventional Commits · **TDD on pure logic** (`lib/flash.ts`)
  · do **not** reformat lines a task doesn't name · **`/gate` green** before done.

---

## File Structure

**Infra (new):**
- Create: `apps/web/src/lib/flash.ts` — pure `resolveFlash`/`flashPath` + web key map.
- Create: `apps/web/src/lib/flash.spec.ts` — unit tests.
- Create: `apps/web/src/components/feedback/flash-toaster.tsx` — `<FlashToaster>` (ported).
- Modify: `apps/web/src/app/layout.tsx` — mount `<Toaster>` + `<FlashToaster>`.

**Copy (i18n):**
- Modify: `libs/shared/i18n/src/lib/messages.ts` — new toast copy keys (namespace confirmed in Task 2+).

**Surface migrations (modify):**
- `apps/web/src/components/booking/booking-actions.tsx` (AlertDialog + toasts)
- `apps/web/src/components/account/danger-zone.tsx` (AlertDialog + flash)
- `apps/web/src/components/account/{profile-form,change-email-form,change-password-form,avatar-uploader}.tsx` (toasts)
- `apps/web/src/components/contact/contact-inquiry.tsx` + `apps/web/src/components/marketing/{enquiry-cta,plan-trip-form}.tsx` + `apps/web/src/components/booking/private-request-form.tsx` (toasts)
- `apps/web/src/components/layout/newsletter-form.tsx` (toast)
- wishlist toggle component(s) (toasts) — exact path resolved in Task 5.

**Docs (after merge):** `CLAUDE.md` · `HANDOFF.md` · web frontend doc if it covers feedback.

---

## Task 1: Toast + flash infrastructure

**Files:**
- Create: `apps/web/src/lib/flash.ts`
- Test: `apps/web/src/lib/flash.spec.ts`
- Create: `apps/web/src/components/feedback/flash-toaster.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: `resolveFlash(key: string | null | undefined): FlashMessage | null`;
  `flashPath(path: string, key: string): string`; `FlashType = 'success' |
  'error' | 'info'`; `FlashMessage = { type: FlashType; text: string }`;
  `<FlashToaster/>` (renders null; fires the mapped toast for `?flash=<key>`).
  A `<Toaster>` is mounted app-wide so any client island can call `toast` from `@tourism/ui`.

- [ ] **Step 1: Write the failing test** `apps/web/src/lib/flash.spec.ts`:
```ts
import { resolveFlash, flashPath } from './flash';

describe('resolveFlash', () => {
  it('maps a known key to its message', () => {
    expect(resolveFlash('account-deleted')).toEqual({
      type: 'success',
      text: 'Your account has been deleted.',
    });
  });
  it('returns null for an unknown or empty key', () => {
    expect(resolveFlash('nope')).toBeNull();
    expect(resolveFlash(null)).toBeNull();
    expect(resolveFlash(undefined)).toBeNull();
    expect(resolveFlash('')).toBeNull();
  });
});

describe('flashPath', () => {
  it('appends the flash key to a bare path', () => {
    expect(flashPath('/', 'account-deleted')).toBe('/?flash=account-deleted');
  });
  it('preserves an existing query string', () => {
    expect(flashPath('/account?tab=security', 'account-deleted')).toBe(
      '/account?tab=security&flash=account-deleted',
    );
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (module not found).
Run: `pnpm nx test @tourism/web --skip-nx-cache -- flash`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/web/src/lib/flash.ts`** (ported from
  `apps/admin/src/lib/flash.ts`; only the key map differs):
```ts
/**
 * Flash-message plumbing for toasts fired after a redirect-based Server Action.
 * The action redirects with `?flash=<key>`; the client `<FlashToaster>` reads the
 * key, fires the mapped toast, and strips the param. Pure module — safe to import
 * from both server and client.
 */

export type FlashType = 'success' | 'error' | 'info';

export interface FlashMessage {
  type: FlashType;
  text: string;
}

const FLASH_MESSAGES: Record<string, FlashMessage> = {
  'account-deleted': { type: 'success', text: 'Your account has been deleted.' },
};

/** Resolve a `?flash=` key to its toast message, or null for a missing/unknown key. */
export function resolveFlash(key: string | null | undefined): FlashMessage | null {
  if (!key) return null;
  return FLASH_MESSAGES[key] ?? null;
}

/** Append a `flash` query key to a redirect path, preserving any existing query string. */
export function flashPath(path: string, key: string): string {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('flash', key);
  return `${base}?${params.toString()}`;
}
```

- [ ] **Step 4: Run it — expect PASS.**
Run: `pnpm nx test @tourism/web --skip-nx-cache -- flash`
Expected: PASS.

- [ ] **Step 5: Create `apps/web/src/components/feedback/flash-toaster.tsx`**
  (ported verbatim from `apps/admin/src/components/feedback/flash-toaster.tsx`,
  importing the web `../../lib/flash`):
```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { toast } from '@tourism/ui';

import { resolveFlash } from '../../lib/flash';

/**
 * Reads a `?flash=<key>` param (set by a redirect-based Server Action), fires the mapped toast once,
 * then strips the param from the URL. Renders nothing. Mount once, next to `<Toaster>`.
 */
export function FlashToaster() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = params.get('flash');
    if (!key) return;

    const token = `${pathname}:${key}`;
    if (firedFor.current !== token) {
      firedFor.current = token;
      const message = resolveFlash(key);
      if (message) {
        if (message.type === 'error') toast.error(message.text);
        else if (message.type === 'info') toast.info(message.text);
        else toast.success(message.text);
      }
    }

    const next = new URLSearchParams(params.toString());
    next.delete('flash');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}

export default FlashToaster;
```

- [ ] **Step 6: Mount `<Toaster>` + `<FlashToaster>` in the web layout.** In
  `apps/web/src/app/layout.tsx`: add `Toaster` to the `@tourism/ui` import; import
  `FlashToaster`; render both inside `ThemeProvider` (after `{children}` / inside
  the existing tree, mirroring admin's `apps/admin/src/app/layout.tsx:27-29`).
  `<FlashToaster>` uses `useSearchParams` — if the production build errors with
  "useSearchParams should be wrapped in a suspense boundary", wrap `<FlashToaster/>`
  in `<Suspense fallback={null}>` (import `Suspense` from `react`). Add
  `<Toaster position="bottom-right" richColors />`.

- [ ] **Step 7: Verify build + test.**
Run: `pnpm nx test @tourism/web --skip-nx-cache -- flash && pnpm nx build @tourism/web --skip-nx-cache`
Expected: PASS (Toaster mounted, no build error).

- [ ] **Step 8: Commit.**
```bash
git add apps/web/src/lib/flash.ts apps/web/src/lib/flash.spec.ts apps/web/src/components/feedback/flash-toaster.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): toast + flash feedback infrastructure"
```

---

## Migration rule + one UX decision (applies to Tasks 2–6)

**The recipe** for each island: on the action RESULT, fire `toast` from
`@tourism/ui` instead of (or in addition to) the inline outcome line; **reuse the
component's EXISTING i18n copy** (most surfaces already have success/error
strings). Keep field/validation state inline.

**UX decision (deviation from a literal reading of the spec — flagged for review):**
surfaces that today replace the whole form with a strong success **panel** — the
**enquiry family** (`contact-inquiry`, `enquiry-cta`, `plan-trip-form`) and
`private-request-form` — **KEEP that success panel** (a persistent thank-you is
better than a transient toast for lead capture). For those, we toast only the
**failure** outcomes (`error`/`rateLimited`, currently easy-to-miss inline lines)
and keep the `invalid` validation inline. Surfaces WITHOUT a strong success panel
(account forms, booking cancel/request, newsletter, wishlist) get a **success
toast**. If you disagree, this is the thing to change before Task 5.

New copy is only needed for **booking request** + **wishlist** (Tasks 2, 6); every
other surface reuses existing keys.

---

## Task 2: booking-actions — AlertDialog cancel + cancel/request toasts

**Files:**
- Modify: `apps/web/src/components/booking/booking-actions.tsx`
- Modify: `libs/shared/i18n/src/lib/messages.ts` (add `booking.detail.requestToast`)

**Interfaces:**
- Consumes: `toast` from `@tourism/ui`; `cancelBookingAction`/`requestCancellationAction` (`{ ok; error? }`).
- Produces: cancel success → `toast.success` + `router.refresh()`; cancel/request error → `toast.error`; the cancel confirm uses `AlertDialog`.

- [ ] **Step 1: Add the request-toast copy.** In `libs/shared/i18n/src/lib/messages.ts`,
  inside `messages.booking.detail` (block starts ~`:242`; `detail` has
  `requestPending`/`cancelled` already), add:
```ts
    requestToast: 'Cancellation requested — we’ll email you.',
```
  (Curly apostrophe to match the file's house style. `cancelled: 'Booking
  cancelled.'` already exists — reuse it for the cancel toast.)

- [ ] **Step 2: Swap the cancel `Dialog` → `AlertDialog`.** In `booking-actions.tsx`,
  change the `@tourism/ui` import to bring in the `AlertDialog*` family
  (`AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
  AlertDialogAction`) + `toast`, and rewrite the cancel dialog (current lines
  83-118) using the AlertDialog primitives. Keep the same copy (`t.cancelConfirmTitle`,
  `t.cancelConfirmBody`, `t.keep`, `t.cancelConfirmCta`, `t.cancelling`). The
  destructive confirm is `<AlertDialogAction variant="destructive" onClick={() => void confirmCancel()} disabled={pending}>`.
  (Mirror the admin `refund-booking.tsx` AlertDialog structure.)

- [ ] **Step 3: Toast the cancel outcome + drop the inline error lines.** Rewrite
  `confirmCancel` (lines 48-60) so success toasts and failure toasts:
```tsx
  async function confirmCancel() {
    if (pending) return;
    setPending(true);
    const res = await cancelBookingAction(booking.code);
    if (res.ok) {
      setCancelOpen(false);
      toast.success(t.cancelled);
      router.refresh();
    } else {
      setPending(false);
      toast.error(res.error);
    }
  }
```
  Remove the in-dialog error `<p role="alert">` (lines 100-104) and the
  out-of-dialog error `<p role="alert">` (lines 120-124); drop the now-unused
  `error`/`setError` state for the cancel path.

- [ ] **Step 4: Toast the cancellation-request outcome.** Rewrite the request
  handler (lines 62-74):
```tsx
    const result = await requestCancellationAction(booking.code, reason);
    if (result.ok) {
      toast.success(t.requestToast);
      router.refresh();
    } else {
      setSubmitting(false);
      toast.error(result.error ?? t.requestError);
    }
```
  Remove the request-form inline error `<p role="alert">` (lines 164-168) + the
  `requestError` state. **Keep** the persistent `requestPending` (line 132-136),
  `requestDenied` banner (144-148), and the refunded-note (187-191) — those are
  status displays, not transient outcomes.

- [ ] **Step 5: Verify.**
Run: `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add apps/web/src/components/booking/booking-actions.tsx libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(web): toast + AlertDialog for booking cancel/cancellation-request"
```

---

## Task 3: danger-zone — AlertDialog + flash on delete

**Files:** Modify `apps/web/src/components/account/danger-zone.tsx`

**Interfaces:**
- Consumes: `deleteAccount()` (`{ error? }`); `flashPath` (Task 1); `toast`.
- Produces: delete confirm uses `AlertDialog`; success redirects via
  `flashPath('/', 'account-deleted')` (FlashToaster fires on `/`); error → `toast.error`.

- [ ] **Step 1: Swap `Dialog` → `AlertDialog`** (imports + the dialog at lines
  58-89), keeping copy `t.confirmTitle`/`t.confirmBody`/`t.cancel`/`t.confirmCta`/
  `t.deleting`. Destructive confirm = `<AlertDialogAction variant="destructive">`.

- [ ] **Step 2: Flash on success, toast on error.** Rewrite `confirmDelete`
  (lines 32-49); import `flashPath` from `../../lib/flash` and `toast` from `@tourism/ui`:
```tsx
  async function confirmDelete() {
    if (pending) return;
    setPending(true);
    const result = await deleteAccount();
    if (result.error) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    await createClient().auth.signOut().catch(() => {});
    router.push(flashPath('/', 'account-deleted'));
    router.refresh();
  }
```
  Remove the inline error `<p role="alert">` (lines 75-79) + drop `error`/`setError`.

- [ ] **Step 3: Verify.** `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache` → PASS.
- [ ] **Step 4: Commit.**
```bash
git add apps/web/src/components/account/danger-zone.tsx
git commit -m "feat(web): AlertDialog + flash toast for delete-account"
```

---

## Task 4: account forms — success/error toasts

**Files:** Modify `apps/web/src/components/account/{profile-form,change-email-form,change-password-form,avatar-uploader}.tsx`

**Interfaces:**
- Consumes: `toast`; existing per-form copy (reuse). Produces: each form toasts its
  outcome; **field/validation stays inline**.

For each form: import `toast`; on the success path call `toast.success(<existing
success key>)` and remove the inline `role="status"` success `<p>`; on the
operation-error path call `toast.error(<message>)` and remove the inline
`role="alert"` error `<p>` — EXCEPT where that `<p>` also renders a validation
error (change-password), which stays inline.

- [ ] **Step 1: profile-form** (`profile-form.tsx`). Success (line ~55, after
  `setSaved(true)`): `toast.success(t.saved)`; drop the success `<p>` (87-91).
  Error (46-50): `toast.error(result.error)`; drop the error `<p>` (82-86). Remove
  the `saved` state (now unused).

- [ ] **Step 2: change-email-form** (`change-email-form.tsx`). Success (line ~38):
  `toast.success(\`${t.sent} ${t.sentHint}\`)`; drop success `<p>` (59-63). Error
  (33-37): `toast.error(authErrorMessage(updateError))`; drop error `<p>` (54-58).
  Remove `sent` state.

- [ ] **Step 3: change-password-form** (`change-password-form.tsx`). Success
  (line ~50): `toast.success(t.success)`; drop success `<p>` (133-137). **Split
  the error element:** the API-error path (42-46) → `toast.error(authErrorMessage(updateError))`;
  the **client-side validation** path (`validatePasswordPair` failure, lines
  35-40) MUST stay inline — keep a `fieldError` state + its inline `<p role="alert">`
  for that, and stop routing the API error through it. Concretely: rename the
  existing `error` used for validation to stay inline for `validatePasswordPair`
  only; send the API `updateError` to a toast. Keep the strength meter/rules
  (85-116) untouched.

- [ ] **Step 4: avatar-uploader** (`avatar-uploader.tsx`). On any failure in
  `onPick`/`onRemove` → `toast.error(t.error)` (or `result.error` for remove);
  drop the inline error `<p>` (123-127). Success = the avatar re-render +
  `router.refresh()` (no toast needed, or add `toast.success` if you want — the
  brief lists avatar under success-toast surfaces, so add `toast.success(t.heading)`-style;
  prefer a concise reused key — if none fits, add `messages.auth.account.profile.avatar.saved: 'Photo updated.'` and toast that).

- [ ] **Step 5: Verify.** `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache` → PASS.
- [ ] **Step 6: Commit.**
```bash
git add apps/web/src/components/account/profile-form.tsx apps/web/src/components/account/change-email-form.tsx apps/web/src/components/account/change-password-form.tsx apps/web/src/components/account/avatar-uploader.tsx libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(web): outcome toasts for account settings forms"
```

---

## Task 5: enquiry family + private-request + newsletter — failure/success toasts

**Files:** Modify `apps/web/src/components/marketing/{enquiry-cta,plan-trip-form}.tsx`, `apps/web/src/components/contact/contact-inquiry.tsx`, `apps/web/src/components/booking/private-request-form.tsx`, `apps/web/src/components/layout/newsletter-form.tsx`

**Interfaces:**
- Consumes: `toast`; existing copy (`messages.enquiryForm.*`, `messages.booking.form.private.*`, `messages.footer.newsletter*`).
- Produces: **keep** the success panels (enquiry family + private-request); toast
  the `error`/`rateLimited` failures; keep `invalid` inline. Newsletter (no strong
  panel): success + failure both toast, keep `invalid` inline.

- [ ] **Step 1: enquiry family (3 islands).** In `contact-inquiry.tsx`,
  `enquiry-cta.tsx`, `plan-trip-form.tsx`, in the submit handler where they do
  `setStatus(res.ok ? 'success' : res.rateLimited ? 'rateLimited' : 'error')`,
  change the failure branch to toast and NOT set an inline failure status:
```tsx
    if (res.ok) {
      setStatus('success');
    } else {
      toast.error(res.rateLimited ? messages.enquiryForm.rateLimited : messages.enquiryForm.errorGeneric);
      setStatus('idle');
    }
```
  Keep the `invalid` pre-check (`setStatus('invalid')`) so `<EnquiryStatus>` still
  shows the inline "required" validation. Keep `<EnquirySuccess>` on
  `status === 'success'`. Import `toast` + `messages` (already imported) in each.
  *(The `<EnquiryStatus>` `rateLimited`/`error` branches become unreachable but
  harmless — leave `enquiry-status.tsx` untouched to keep the diff minimal.)*

- [ ] **Step 2: private-request-form.** In the handler (lines 92-99): on failure
  → `toast.error(result.rateLimited ? tp.rateLimited : tp.error)` and `setPending(false)`;
  do NOT set the inline `error` state; remove the inline error `<p>` (248-252) +
  the `error`/`setError` state. **Keep** the `done` success panel (101-115).

- [ ] **Step 3: newsletter-form.** In the handler (lines 23-35): keep the
  `invalid` pre-check inline; on `res.ok` → `toast.success(f.newsletterSuccess)`
  and reset the input; on failure → `toast.error(res.rateLimited ? f.newsletterRateLimited : f.newsletterError)`.
  Replace the inline success `<p>` (37-46) and the inline error/rate/invalid `<p>`
  (75-83) so ONLY the `invalid` branch renders inline (keep that one small line);
  success + rateLimited + error move to toasts.

- [ ] **Step 4: Verify.** `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache` → PASS.
- [ ] **Step 5: Commit.**
```bash
git add apps/web/src/components/marketing/enquiry-cta.tsx apps/web/src/components/marketing/plan-trip-form.tsx apps/web/src/components/contact/contact-inquiry.tsx apps/web/src/components/booking/private-request-form.tsx apps/web/src/components/layout/newsletter-form.tsx
git commit -m "feat(web): toast failures for enquiry/lead forms (keep success panels)"
```

---

## Task 6: wishlist toggle — the biggest gap (success + error toasts)

**Files:**
- Modify: `apps/web/src/components/tours/wishlist-button.tsx`
- Modify: `apps/web/src/components/account/saved-tours-grid.tsx`
- Modify: `libs/shared/i18n/src/lib/messages.ts` (new `wishlist` toast copy)

**Interfaces:**
- Consumes: `addToWishlistAction`/`removeFromWishlistAction` (`{ ok }`); `toast`.
- Produces: save → `toast.success`; remove → `toast.success`; failure → `toast.error`.

- [ ] **Step 1: Add wishlist toast copy.** In `messages.ts`, add a new top-level
  namespace (alongside the others):
```ts
  wishlist: {
    saved: 'Saved to wishlist.',
    removed: 'Removed from wishlist.',
    error: 'Something went wrong — please try again.',
  },
```

- [ ] **Step 2: wishlist-button** (`wishlist-button.tsx`, toggle at lines 49-59).
  Import `toast` + `messages`. After the action:
```tsx
    const res = next ? await addToWishlistAction(tourId) : await removeFromWishlistAction(tourId);
    if (res.ok) {
      toast.success(next ? messages.wishlist.saved : messages.wishlist.removed);
    } else {
      setSaved(!next); // roll back a failed optimistic toggle
      toast.error(messages.wishlist.error);
    }
    setPending(false);
```

- [ ] **Step 3: saved-tours-grid** (`saved-tours-grid.tsx`, remove handler lines
  24-32). Import `toast` + `messages`. After the action:
```tsx
    const res = await removeFromWishlistAction(tourId);
    if (res.ok) {
      toast.success(messages.wishlist.removed);
    } else {
      setItems(prev); // roll back on failure
      toast.error(messages.wishlist.error);
    }
    setRemoving(null);
```

- [ ] **Step 4: Verify.** `pnpm nx lint @tourism/web --skip-nx-cache && pnpm nx build @tourism/web --skip-nx-cache` → PASS.
- [ ] **Step 5: Commit.**
```bash
git add apps/web/src/components/tours/wishlist-button.tsx apps/web/src/components/account/saved-tours-grid.tsx libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(web): wishlist save/remove toasts"
```

---

## Task 7: slice gate + docs sweep

- [ ] **Step 1: Full gate.** `pnpm nx run-many -t lint test build --projects=@tourism/web,@tourism/i18n --skip-nx-cache` → all green.
- [ ] **Step 2: Manual smoke** (deployed preview or local): success toast fires
  (save profile, subscribe, save-to-wishlist, cancel booking); failure toast
  fires; field validation still inline (bad password, empty required); delete
  account → land on `/` with the "account deleted" toast; the two AlertDialogs
  trap focus + confirm/cancel.
- [ ] **Step 3: Docs sweep (rule 9).** `CLAUDE.md` `@tourism/web` row (note the
  toast + flash feedback layer + AlertDialog standardization); `HANDOFF.md`
  §Next action (mark "web feedback layer" done); web `frontend.md` if it documents
  feedback patterns. Update the web test-count baseline (Task 1's flash spec adds
  ~4 tests → web 181 → ~185; use the real number from Step 1).
- [ ] **Step 4: STOP for user source review → rebase + `--ff-only` merge** of
  `feat/web-feedback-layer`.

---

## Self-Review (against the spec)

**Spec coverage:** infra (Toaster + flash + FlashToaster mount) → Task 1;
toast-vs-inline rule → applied per task (Tasks 2–6, field errors kept inline);
flash for redirect (delete account) → Task 3; AlertDialog for the two destructive
confirms → Tasks 2 (cancel) + 3 (delete); surface set (account, booking, contact
+ enquiry family, newsletter, wishlist; auth excluded) → Tasks 2–6; copy in i18n
→ reused existing + new `requestToast`/`wishlist.*`; TDD on `lib/flash` → Task 1;
docs sweep → Task 7.

**Deviation flagged:** enquiry family + private-request keep their success
**panels** (toast only failures) rather than converting success to a toast — a
deliberate UX call noted at the top of the migration section for the user to
confirm at plan review.

**Placeholder scan:** the only soft spot is Task 4 Step 4 (avatar success copy —
"reuse a concise key, else add `avatar.saved`") — resolved by adding the key if
none fits; not a blocker. No other TODO/vague steps.

**Type consistency:** `resolveFlash`/`flashPath` signatures match Task 1 across
Tasks 3; action result shapes (`{ ok; error? }`, `{ ok: true } | { ok: false;
rateLimited }`, `{ ok }`) match the Explore-verified signatures used in each task;
`toast` import from `@tourism/ui` consistent throughout; new copy keys
(`booking.detail.requestToast`, `messages.wishlist.{saved,removed,error}`)
referenced exactly where defined.
