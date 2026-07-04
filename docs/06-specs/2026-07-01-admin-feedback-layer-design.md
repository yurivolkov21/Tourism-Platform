# Admin — Feedback layer standardization (Phase 1: admin)

> Status: **DRAFT — awaiting review** · Date: 2026-07-01 · Scope: `@tourism/admin` (web = later phase) · Follows the feedback-component audit (2026-07-01).

## 1. Problem (from the audit)

The admin app has **no consistent feedback layer**. The audit found:

- **Toast:** none anywhere. `sonner` (`@tourism/ui` `Toaster`) is installed, themed, and
  exported — but **never mounted or called** in admin (or web). Every result is an
  inline text node or a modal.
- **Inline errors:** ad-hoc `<p className="text-destructive" role="alert">` and
  bespoke `<div className="border-destructive/30 …">` banners instead of the
  `Alert` component (which exists in `@tourism/ui`, unused).
- **Loading:** hand-rolled `Loader2` + `animate-spin` (login, media upload) instead
  of the `Spinner` component (exists, unused).
- **Confirm dialogs:** admin already uses `AlertDialog` consistently (4 sites). (Web
  uses plain `Dialog` for confirms — reconciled in the later web phase.)

Net: mutations (refund, enquiry status, delete, create/update) give **no success
signal**, and errors are styled inconsistently.

## 2. Decisions (confirmed with the user)

- **Admin first**; web is a separate later phase.
- **Toast = the existing `@tourism/ui` Sonner wrapper**, mounted **bottom-right**,
  `richColors`, auto-dismiss. No custom toast design for now.
- **Confirm dialogs standardize on `AlertDialog`.** Admin is already compliant; the
  web `Dialog → AlertDialog` migration (booking-actions, danger-zone) is deferred to
  the web phase (lightbox stays a `Dialog` — it's a viewer, not a confirm).

## 3. Goals / Non-goals

**Goals (admin)**

- One global toast, fired on every meaningful mutation (success + failure).
- Inline errors use the `Alert` component; loading uses the `Spinner` component.
- A documented, reusable pattern for firing toasts from **Server Actions** (both the
  inline and the redirect-after-success cases).

**Non-goals**

- Web app (separate phase). No visual redesign of toasts beyond the themed wrapper.
- Field-level validation errors stay as `FieldError` (already consistent).

## 4. The toast-from-Server-Action pattern (the crux)

`toast()` is client-side; our mutations run in Server Actions. Two cases:

### 4a. Inline mutations (no redirect) — client fires the toast from the result

Actions that return `{ error?: string }` and stay on the page:
`deleteX` (via `RowActions`), `refundBooking`, `updateEnquiryStatus`.
The client component already awaits the result → add:

```ts
const res = await action(...)
if (res.error) toast.error(res.error)
else toast.success('…')      // e.g. 'Refund issued', 'Status updated', 'Deleted'
```

Errors: keep the existing inline message inside dialogs (context) **and** fire
`toast.error` (transient). Success: toast only.

### 4b. Redirect mutations (create/update) — flash via query param

`create*`/`update*` actions `redirect('/x')` on success, so we can't toast before
the redirect (it throws). Standard pattern:

- The action redirects to the list **with a flash key**: `redirect('/tours?flash=created')`.
  A tiny helper `flashPath(path, key)` builds the URL (keeps existing redirects one-line).
- A **`FlashToaster`** client component (mounted once in the admin layout, next to
  `<Toaster>`) reads `?flash=` via `useSearchParams`, fires the mapped toast **once**,
  then strips the param with `router.replace`.
- `FLASH_MESSAGES` (pure map, TDD): `created → {type:'success', text:'Created'}`,
  `updated → {type:'success', text:'Saved'}`. Unknown key → no-op.

This keeps every action's redirect intact (just append the param) and needs no change
to the form components.

## 5. Workstreams & files (admin)

### A. Toast infra

- `apps/admin/src/app/(admin)/layout.tsx` (or root layout): mount
  `<Toaster position="bottom-right" richColors />` + `<FlashToaster />`.
- New `apps/admin/src/components/feedback/flash-toaster.tsx` (client).
- New `apps/admin/src/lib/flash.ts` — `flashPath(path, key)` + `FLASH_MESSAGES` +
  `flash.spec.ts` (TDD).

### B. Wire toasts into mutations

- Redirect actions → append flash: `lib/{destinations,categories,tours,posts}/actions.ts`
  (`create*`/`update*`), `lib/departures/actions.ts`.
- Inline actions → client `toast` calls:
  - `components/crud/row-actions.tsx` (delete success/error).
  - `components/bookings/refund-booking.tsx` (refund success/error).
  - `components/enquiries/enquiries-view.tsx` (status update success/error — already
    optimistic; add toast, keep rollback).

### C. Inline errors → `Alert`

- List-page load errors: replace the bespoke `<div className="border-destructive…">`
  with `<Alert variant="destructive">` in `bookings/page.tsx`, `enquiries/page.tsx`,
  `tours/page.tsx`, `destinations/page.tsx`, `categories/page.tsx`, `posts/page.tsx`.
- Form submit errors: replace `<p className="text-destructive" role="alert">` with a
  compact `<Alert variant="destructive">` in the form components (tour/destination/
  category/post/departure forms). Field errors stay `FieldError`.

### D. Loading → `Spinner`

- Replace `Loader2 + animate-spin` with `<Spinner>` in
  `components/auth/login-form.tsx` and `components/{destinations,tours}/…media-field`.

## 6. Pure logic to unit-test (TDD)

- `FLASH_MESSAGES` / `resolveFlash(key)` → `{type, text} | null` (created/updated/
  unknown). `flashPath(path, key)` → appends `?flash=` correctly (respecting an
  existing query string).

## 7. Testing / gate / review

- Jest for the flash helpers.
- `/gate`: admin lint · typecheck · test · build green.
- `ecc:code-reviewer` pass (touches many mutation paths).
- Manual review on the Vercel admin deploy.

## 8. Rollout (slices, each its own branch)

1. **Toast infra + redirect flashes** — Toaster/FlashToaster mount + `flashPath` +
   create/update toasts across all entities.
2. **Inline-action toasts** — delete (RowActions) · refund · enquiry status.
3. **Alert + Spinner standardization** — list/form errors → `Alert`; loaders →
   `Spinner`.

(Each slice: review → user merge → deploy, per the standing workflow.)

## 9. Later phase — web (not in this spec)

Mount `<Toaster>` in the web root layout; toasts on booking/auth/enquiry flows;
migrate the two web confirm `Dialog`s (booking-actions, danger-zone) → `AlertDialog`;
Alert/Spinner standardization. Written up separately when we reach it.
