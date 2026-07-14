# Contact Launcher — implementation plan

**Spec:** [`docs/06-specs/2026-07-14-contact-launcher-design.md`](../06-specs/2026-07-14-contact-launcher-design.md)
**Branch:** `feat/contact-launcher` · **Date:** 2026-07-14

## STATUS

- [ ] T1 i18n namespace
- [ ] T2 pure helpers (TDD)
- [ ] T3 launcher component + tests
- [ ] T4 env documentation touch-points
- [ ] T5 gate + review

**RESUME STATE:** plan written, no code yet — awaiting user review of spec + plan.

## Sequencing

T1 → T2 → T3 (T3 consumes T1 keys and T2 helpers) → T4 → T5. No parallel lanes
needed — single-surface feature.

## Reused seams

- `FloatingContact` + `AppShell` `floating` slot (`apps/web/src/components/layout/`) — existing mount point; no layout change.
- `Popover`/`PopoverTrigger`/`PopoverContent` from `@tourism/ui` (Base UI) — no new UI-lib component.
- `messages` object pattern in `libs/shared/i18n/src/lib/messages.ts` (direct import, nested namespaces, function values for interpolation).
- Env pattern: static `process.env.NEXT_PUBLIC_*` reads (as in `lib/api/client.ts`); `lib/site.ts` for URL helpers if needed.
- Test conventions: `*.spec.ts(x)` co-located; `@tourism/ui` barrel mock as in `auth-form-field.spec.tsx`; jest jsdom + `jest.setup.ts` matchMedia stub.
- Prefill-context precedent: `EnquiryCta prefillDestination={tour.title}` (we use `document.title` instead — no plumbing).

## Tasks

### T1 — i18n: `contactLauncher` namespace

Add to `libs/shared/i18n/src/lib/messages.ts`: `trigger` (label), `triggerAria`,
`title`, `whatsapp` (label + optional hint), `enquiry` (label + hint),
`prefillGeneric`, `prefillTour: (title, url) => string`. EN-only (ADR-0005).

**Accept:** `pnpm nx typecheck @tourism/i18n` green; keys referenced nowhere yet.

### T2 — pure helpers, test-first

`apps/web/src/lib/contact-launcher.spec.ts` FIRST (red), then
`apps/web/src/lib/contact-launcher.ts` (green):

- `normalizeWhatsAppPhone`: `"+84 91-234-5678"` → `"84912345678"`; letters /
  <7 digits → `null`.
- `buildWhatsAppLink`: no text → bare `wa.me` URL; text → `?text=` with
  `encodeURIComponent` (cover quotes, em-dash, newline).
- `getContactChannels`: env unset/blank/invalid → enquiry only; valid → WhatsApp
  first, enquiry last.
- `buildPrefill`: tour pathname + `"Ha Long Cruise — Nexora"` title → tour
  prefill with suffix stripped (also: title itself containing ` — `); non-tour
  pathname → generic; missing title → falls back to generic.
- `isLauncherHidden`: true for `/checkout`, `/checkout/success`,
  `/tours/x/book`; false for `/`, `/tours/x`, `/contact`, `/account/bookings`.

**Accept:** new spec file ≥ those cases, `pnpm nx test @tourism/web` green.

### T3 — upgrade `FloatingContact` to launcher

Rewrite `apps/web/src/components/layout/floating-contact.tsx` as `'use client'`:
`usePathname()` + `isLauncherHidden` early-return; Popover with trigger styled
as today's bubble (tokens only); channels from `getContactChannels`
(`process.env.NEXT_PUBLIC_CHAT_WHATSAPP` read statically); WhatsApp href built
on open/click from `buildPrefill({ pathname, documentTitle: document.title,
url: window.location.href })`; enquiry row = `<Link href="/contact">`. All copy
from `messages.contactLauncher`. Aria per spec.

Component test `floating-contact.spec.tsx` (barrel mock): trigger renders;
hidden on money-path routes; channel rows per env presence; WhatsApp href
contains `wa.me` + encoded text.

**Accept:** `pnpm nx test @tourism/web` green; no new lint/module-boundary
violations; manual check deferred to Vercel preview (user rule: no local
dev-server review).

### T4 — env documentation

Add `NEXT_PUBLIC_CHAT_WHATSAPP` to the web env reference/example touch-points
(wherever `NEXT_PUBLIC_SITE_URL` is documented — locate at execution time) with
format note (international digits, no `+`). Mark optional + hide-when-unset.

**Accept:** grep shows the var documented alongside existing web env vars.

### T5 — gate + review

Kill orphan node processes first (standing rule), then
`pnpm nx affected -t lint typecheck test build`. Then `superpowers:requesting-code-review`
self-review pass, report to user, **STOP before any merge/push**.

**Accept:** gate green; report includes test-count delta (web baseline 261).

## Post-merge (rule 9 — not part of this branch's code tasks)

CHANGELOG entry · CLAUDE.md web row · HANDOFF · `frontend.md` (launcher) ·
roadmap cell. Owner to-do: create WhatsApp number → set env in Vercel.
