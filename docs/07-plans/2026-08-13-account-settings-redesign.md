# Account settings redesign — implementation plan

**Date:** 2026-08-13 · **Spec:** [design](../06-specs/2026-08-13-account-settings-redesign-design.md) ·
**Branch:** `feat/checkout-success-redesign` (user-directed; see spec decision 7) ·
**Status:** NOT STARTED

## Sequencing

T1 → T2 → T3 (i18n + tokens/keyframes first, so every later task compiles) →
T4, T5 (pure logic, TDD, independent of each other) → T6 → T7 → T8 → T9 →
T10 → T11 → T12 (page wiring, needs everything above) → T13 → T14 (gate +
browser pass).

T4 and T5 can run in parallel. Everything from T6 on is DOM work that depends
on the helpers landing first.

## Reused seams

| Need | Existing seam | Where |
| --- | --- | --- |
| Card surface + shadow | `bg-card shadow-card rounded-2xl border` | `components/account/account-dashboard.tsx:89` |
| Count-up number | `NumberTicker` | `@tourism/ui` (used in `booking/checkout-hero.tsx:42`) |
| Collapsible danger zone | `Collapsible` | `@tourism/ui` |
| Avatar + fallback | `Avatar` / `AvatarImage` / `AvatarFallback` | `@tourism/ui`, already used by `AvatarUploader` |
| Reveal / enter animation classes | `tw-animate-css` (`animate-in fade-in slide-in-from-bottom-*`) | imported in `app/global.css:2` |
| Reduced-motion guard | `useReducedMotion()` | `apps/web/src/hooks/use-reduced-motion.ts` |
| Reduced-motion CSS baseline | `@media (prefers-reduced-motion: reduce)` | `app/global.css:33` |
| Keyframe conventions (`nx-` prefix, transform-only, comment block) | `nx-kenburns` / `nx-rail` / `nx-pulse` | `app/global.css:48-110` |
| Section-heading typography | `font-heading … font-semibold` | `components/account/account-section.tsx:16` |
| Toast feedback | `toast` | `@tourism/ui`, already in `profile-form.tsx` |

Nothing new is added to `package.json`.

---

## T1 — Section constant

Add `SETTINGS_SECTIONS` to `apps/web/src/lib/account/settings-nav.ts`: an
ordered readonly array of `{ id, navLabel }` for `personal · security ·
connected · danger`, labels read from `messages.auth.account.settings.nav`.

**Accept:** `pnpm nx typecheck @tourism/web` passes; the constant is the only
place section ids are literal.

## T2 — i18n keys

Add the `nav`, `completeness`, `savedShort`, `saving` and `dangerToggle` keys
from the spec's i18n table to `auth.account.settings` in
`libs/shared/i18n/src/lib/messages.ts`. Straight quotes in code, typographic
apostrophes in copy to match the surrounding catalog. Remove nothing.

**Accept:** `pnpm nx typecheck @tourism/i18n` passes; every key in the spec
table exists.

## T3 — Keyframes

Append `nx-ring-in` and `nx-flash` to `apps/web/src/app/global.css`, each with
the same style of explanatory comment the existing `nx-*` blocks carry. Confirm
`--color-success` resolves in this theme; if it does not, use the token that
does and note it in the spec.

**Accept:** both keyframes present; `pnpm nx build @tourism/web` still compiles
CSS; a manual check that reduced-motion neutralises them (the existing baseline
covers `animation-duration`).

## T4 — `computeCompleteness` (TDD)

Write `apps/web/src/lib/account/completeness.spec.ts` **first**, covering: all
four present → 100; only providers → 25; whitespace-only `fullName` counts as
missing; whitespace-only `phone` counts as missing; empty `providers` → `signin`
missing; `missing` preserves item order; `percent` is an integer.

Then implement `apps/web/src/lib/account/completeness.ts` to the signature in
the spec.

**Accept:** `pnpm nx test @tourism/web --testPathPattern=completeness` green,
red-before-green observed.

## T5 — `pickActiveSection` (TDD)

Write `apps/web/src/lib/account/settings-nav.spec.ts` **first**: nothing passed
the anchor → first id; one passed → that id; several passed → the last one;
all passed → last id; empty positions → `ids[0]`; a position whose id is not in
`ids` is ignored.

Then implement `pickActiveSection` alongside `SETTINGS_SECTIONS` in
`settings-nav.ts`.

**Accept:** `pnpm nx test @tourism/web --testPathPattern=settings-nav` green,
red-before-green observed.

## T6 — `CompletenessRing`

Server component: svg over the avatar, track + progress circles, inline
`--nx-ring-c` / `--nx-ring-offset`, base `stroke-dashoffset` equal to the final
value with `nx-ring-in` animating into it (`both` fill mode), `aria-hidden`.
Props: `percent: number`, `children` (the avatar it wraps).

**Accept:** renders at 25/50/100 without layout shift; the ring is visible with
JS disabled; percent 100 draws a full circle with no seam at 12 o'clock.

## T7 — `AvatarUploader` reshaped

Drop the internal `h2` heading and the wrapping `space-y-3`; keep the file
input, Change and Remove buttons and every action/toast path byte-identical.
Expose the hint copy so the hero can place it. Avatar size becomes a prop
(default keeps today's `size-16`).

**Accept:** upload and remove still work end to end (manual); no change to
`lib/account/actions.ts`.

## T8 — `SettingsHero`

Compose `CompletenessRing` + `AvatarUploader` + name/email + the completeness
readout and missing-item chips (anchors to section ids). 100 % renders the
"complete" line instead of ticker + chips.

**Accept:** at <100 % the ticker counts up and each chip scrolls to its section
with the heading clear of the sticky header; at 100 % no chips render.

## T9 — `Reveal` + `SettingsCard`

`Reveal`: client, `IntersectionObserver` (once, then disconnect), adds the
`animate-in` classes plus a per-index delay; under `useReducedMotion()` it
renders visible and never observes; children are always in the DOM.

`SettingsCard`: server, the card shell from the spec, `id` + `scroll-mt-28`,
optional `tone="danger"`.

**Accept:** cards below the fold animate once on first scroll-in and never
again; keyboard tabbing into an un-revealed card still focuses its inputs.

## T10 — `SettingsNav`

Client. Sticky rail at `lg` with the translating pill; sticky chip bar below
`lg` with `scrollIntoView` on the active chip. One observer, active id from
`pickActiveSection`. `<nav aria-label>`, real `<a href="#id">`,
`aria-current="true"`.

**Accept:** the pill tracks the section under the anchor line while scrolling;
clicking a rail item jumps to the section; with JS disabled the anchors still
navigate.

## T11 — `SaveButton` + `ProfileForm` flash

`SaveButton`: `state: 'idle' | 'saving' | 'saved'`, spinner and check icons,
auto-revert after 1.4 s, `disabled` while saving.

`ProfileForm`: adopt it, add the 700 ms `nx-flash` class on success, keep the
existing `toast.success` and the Supabase metadata mirror untouched. Apply
`SaveButton` to `ChangePasswordForm` only if it is a drop-in.

**Accept:** save → spinner → check → back to idle; the card flashes once; the
toast still fires; an error path leaves the button in `idle` with the error
toast, exactly as today.

## T12 — `DangerZone` + `ConnectedAccounts`

`DangerZone`: wrap in `Collapsible`, closed by default, chevron rotates on
open, `AlertDialog` and `confirmDelete` untouched. `ConnectedAccounts`: pills →
hover-lift tiles.

**Accept:** the delete dialog still opens from inside the collapsed-then-opened
panel and still signs out on success; connected tiles keep their read-only
semantics.

## T13 — Page wiring + cleanup

Rewrite `app/account/profile/page.tsx` to the shell in the spec (hero + rail +
four cards), reshape `app/account/loading.tsx` to match the new layout, and
delete `components/account/account-section.tsx`.

**Accept:** `pnpm nx lint @tourism/web` clean (no unused imports, no dangling
importer of the deleted file); the skeleton's block sizes track the real
layout.

## T14 — Gate + browser pass

Run `/gate` (lint + typecheck + test + build). Then a manual pass in the
browser preview at desktop, tablet and mobile widths, plus dark mode and
`prefers-reduced-motion`, checking each risk in the spec: sticky offsets, the
two sticky layers below `lg`, the ring at 25/100, focus order through the
revealed cards.

**Accept:** gate green; screenshots at desktop + mobile; the spec's risk list
either cleared or updated with what was actually chosen.

---

## Revision 2 (2026-08-13) — T1–T14 above are obsolete

Direction A was built end to end, reviewed in the browser and rejected: the page
is too short to carry navigation (see the spec's revision-2 block for the full
reasoning). The tasks above are kept as the record of what was tried, not as
work to resume.

What replaced them, in one pass:

- **Deleted:** `settings-hero` · `completeness-ring` · `reveal` ·
  `settings-nav` (component) · `section-link` · `save-button` ·
  `lib/account/completeness{,.spec}` · `lib/account/settings-nav{,.spec}`.
  Copies live in this session's scratchpad under `account-v1/` in case any of it
  is wanted back.
- **Reverted to `HEAD`:** `profile-form` · `avatar-uploader` ·
  `connected-accounts`.
- **Kept:** `settings-card` (minus `scroll-mt-28`) and the collapsible
  `danger-zone`.
- **Rewritten:** `app/account/profile/page.tsx` as two hand-paired columns;
  `AccountSettingsSkeleton` to match.
- **Cleaned:** the `nav` / `completeness` / `savedShort` / `saving` i18n keys and
  both `nx-ring-in` / `nx-flash` keyframes are gone; `personalDesc` restored to
  mentioning the photo. Only `settings.dangerToggle` remains of this feature's
  new copy.

Gate after revision 2: lint clean, build green, `@tourism/web` **423** tests
passing (down from 442 — the 19 tests belonged to the two deleted helpers).

Still unverified in the browser: the two-column pairing at `lg`, the stacked
order below `lg`, and dark mode. `/account/profile` is auth-gated, so that pass
needs a signed-in session in the preview pane.

## STATUS / RESUME STATE (direction A — historical)

**T1–T13 done. T14 partially done.** Gate is green — lint + typecheck clean
(only pre-existing warnings), `@tourism/web` **439 tests passing**, build OK.

Outstanding on T14: the browser pass. `/account/profile` is auth-gated and
redirects to `/login` for a signed-out visitor, so the visual checks (sticky
offsets, the two sticky layers below `lg`, the ring at 25 % vs 100 %, focus
order through the revealed cards, dark mode, reduced motion) need a signed-in
session in the preview pane.

Deviations from the plan, decided during execution:

- `CompletenessRing` is an **overlay**, not a wrapper. `AvatarUploader` owns the
  image state after an upload, so the avatar has to stay inside it; the ring
  takes a `relative` box from the uploader and sits over it via a new `overlay`
  prop.
- The nav ships as **two exported components sharing one `useActiveSection`
  hook** (`SettingsRail`, `SettingsChipBar`) rather than one component. A sticky
  element can only travel inside its parent's box, and the settings grid's first
  column collapses to chip height once the layout stacks — so the chip bar has
  to be a direct child of `main`, outside the grid.
- The rail needs **`lg:self-start`** (fixed 2026-08-13 after the first browser
  pass showed it scrolling away). `sticky` pins the element's *own* box; a grid
  item left at the default `stretch` grows to the full row height, so the box
  has no room to travel inside its grid area and the links scroll off with the
  page. Shrinking the item to its content height is what turns the tall grid
  area into the track it slides down.
- Section links glide instead of jumping (user feedback, 2026-08-13). A shared
  client `SectionLink` — used by the rail, the chip bar and the hero chips —
  upgrades the anchor jump to `scrollIntoView({ behavior: 'smooth' })`, honours
  `useReducedMotion()`, and moves focus to the target so a keyboard user's next
  Tab resumes from the section rather than the link. Deliberately **not**
  `scroll-smooth` on `<html>`: that is site-wide and would animate Next's
  scroll-to-top on every route change.
- Scroll-spy is driven by a **passive scroll listener behind a rAF gate**, not
  by the IntersectionObserver T10 planned, and `pickActiveSection` grew an
  `atBottom` argument (fixed 2026-08-13 after the second browser pass). The
  sections at the foot of the page are short, so the page runs out of scroll
  before their tops reach the anchor line — `connected` and `danger` could never
  light up. An observer cannot cover that last stretch either: no edge crosses
  while it happens, so nothing fires.
- The loading skeleton is a **new** `AccountSettingsSkeleton` at
  `app/account/profile/loading.tsx`, not a reshape of the shared
  `AccountSkeleton` — that one still serves the `/account` dashboard.
- `settings.personalDesc` copy dropped "photo" (`Your name and phone number.`),
  since the avatar now lives in the hero.
- `ChangePasswordForm` did **not** adopt `SaveButton` — its pending state is
  wired through its own error handling, so it was not the drop-in T11 allowed.

Nothing is committed yet beyond the spec + plan (`5739985`): `global.css` and
`messages.ts` also carry the in-flight checkout-success work on this branch, so
the two features cannot be split into separate commits without an interactive
add.

Tests before this feature: web **385** (**439** on this branch, which also
carries the uncommitted checkout-success suites).
