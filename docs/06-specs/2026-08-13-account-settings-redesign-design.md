# Account settings redesign — design spec

**Date:** 2026-08-13 · **Scope:** `@tourism/web` + `@tourism/i18n` · **Status:** SUPERSEDED BY REVISION 2

## Revision 2 (2026-08-13) — direction abandoned mid-build

Everything below describes **direction A** (sticky rail + scroll-spy + identity
hero + completeness ring). It was built, reviewed in the browser, and rejected
by the user. What shipped instead is at the bottom of this file under
"Revision 2 — what actually shipped".

**Why it was rejected.** The page is too short to carry navigation. Four groups,
two of them nearly empty (Connected = two pills, Danger = one button), fit in
roughly two viewports. Everything the direction was built around degraded from
that one fact:

- the rail sat idle with an almost-static active state, over an empty left
  column;
- the scroll-spy needed a bottom-of-page clamp precisely *because* the last
  sections could never reach the anchor line — machinery to paper over the fact
  that there was nothing to spy on;
- reveal-on-scroll stagger only pays off on a page long enough to scroll;
- the identity hero spent a full viewport on a name, an email and a percentage
  while the actual tasks (edit name, change password) were pushed below the
  fold.

**Kept from direction A:** the card shell (`SettingsCard`) and the collapsed
danger zone. **Dropped:** the rail, the chip bar, scroll-spy, `SectionLink`,
the hero, the completeness ring and its scoring, the reveal stagger, the
save-button morph and the saved-field flash — with their i18n keys and both
`nx-` keyframes.

## Goal

`/account/profile` (the unified account-settings page) renders four
`AccountSection` rows inside a bare `divide-y` stack: no card surfaces, no
in-page navigation, no motion, and "Danger zone" carries the same visual weight
as "Personal information". It reads as a form dump, and it is visibly out of
step with both `/account` (the dashboard already uses
`shadow-card rounded-2xl` cards with hover lift) and the new
`/checkout/success` hero.

Redesign it as **a sticky-rail settings page with card sections and an identity
hero**: an identity header carrying the avatar inside an animated
profile-completeness ring, a sticky section rail with scroll-spy on the left,
and each settings group as its own card on the right.

This is a **presentation-layer change**. Server actions, API calls, form
submit logic and validation behaviour are untouched.

## Locked decisions (confirmed with user 2026-08-13)

1. **Direction A — sticky rail + card sections**, plus the identity hero with a
   completeness ring taken from direction B. Bento tiles (direction C) rejected:
   long forms inside expanding tiles break down on mobile and complicate focus
   management.
2. **Completeness scoring: 4 items × 25%** — avatar · full name · phone ·
   linked sign-in method. `sign-in` is satisfied whenever the account has at
   least one Supabase provider, i.e. always for a signed-in user, so the ring
   never renders empty on a fresh account (floor 25%). Missing items surface as
   chips that scroll to the owning section.
3. **Mobile keeps the rail** as a horizontally scrollable sticky chip bar under
   the header; the active chip scrolls itself into view. Below `lg` the two
   columns collapse to hero → chip bar → stacked cards.
4. **Motion in scope (user-picked):** save-button morph + saved-field flash ·
   section reveal stagger on scroll · danger zone collapsed behind a toggle.
5. **Motion out of scope (user-declined):** avatar drag-and-drop, upload
   progress ring, avatar crossfade. `AvatarUploader` keeps its current
   pick-a-file behaviour.
6. **Web only.** `apps/mobile` is untouched. ("Mobile" in decision 3 means the
   narrow web viewport, not the Expo app.)
7. **Branch:** work continues on `feat/checkout-success-redesign` at the user's
   request, rather than a fresh `feat/` branch. Deviation from CLAUDE.md §"How
   we work" #1, accepted explicitly.
8. **EN-only copy** per ADR-0005 — new strings go into `@tourism/i18n`, no VI
   parity (the `/new-feature` template's EN/VI line does not apply to this
   repo).
9. **No new backend fields.** Everything the hero needs is already on
   `UserDto` (`avatarUrl`, `fullName`, `phone`, `email`) plus the Supabase
   provider list the page already reads via `readProviders()`.

## In scope

- `/account/profile` layout: identity hero, sticky rail/chip bar, card sections.
- `AvatarUploader` reshaped to sit inside the hero (its own heading + hint move
  out; the file input, Change and Remove controls stay exactly as they are).
- `ProfileForm` save button → morph + card flash.
- `DangerZone` → collapsed behind a toggle.
- `ConnectedAccounts` → provider tiles that match the new card language.
- `account/loading.tsx` reshaped to match the new layout.
- Two new CSS keyframes in `global.css` (ring draw, saved flash).
- New i18n keys under `auth.account.settings`.

## Out of scope

- `/account` (dashboard), `/account/bookings`, `/account/saved` — untouched.
- Any change to `lib/account/actions.ts`, the profile API, or Supabase calls.
- Password-strength UI, email-change flow semantics, delete-account semantics.
- Adding an animation dependency. GSAP is already in the web bundle (used by
  `StorySpine`) but is not needed here — the reveal is one `IntersectionObserver`
  plus `tw-animate-css` classes.

## Per-section design

### Page shell — `app/account/profile/page.tsx`

```
main  max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14
├─ back link (unchanged)
├─ <SettingsHero>
└─ grid  gap-8 lg:grid-cols-[13rem_1fr] lg:gap-12 lg:items-start
   ├─ <SettingsNav>          (sticky rail on lg, chip bar below)
   └─ div space-y-6
      ├─ <SettingsCard id="personal">   avatar-less ProfileForm
      ├─ <SettingsCard id="security">   ChangeEmailForm + ChangePasswordForm
      ├─ <SettingsCard id="connected">  ConnectedAccounts
      └─ <SettingsCard id="danger">     DangerZone
```

Section ids are a single exported constant (`SETTINGS_SECTIONS`) shared by the
nav, the cards and the completeness chips — one source of truth for ids, order
and labels.

### `SettingsHero` (server component)

A `rounded-2xl` bordered panel with a soft `from-primary/8` gradient wash.
Left: the avatar at `size-24`, wrapped by `CompletenessRing`, with the
`AvatarUploader` controls beneath it. Right: display name (`font-heading
text-2xl`), email, then the completeness readout —

- `< 100%`: `<NumberTicker value={percent} />` + `% complete`, followed by one
  chip per missing item (`Add a photo`, `Add your phone number`, …). Each chip
  is an anchor to the owning section id, so clicking it scrolls there
  (`scroll-mt-28` on the cards keeps the heading clear of the sticky header).
- `100%`: a single `CheckCircle2Icon` + "Your profile is complete" line, no
  ticker, no chips.

### `CompletenessRing` (server component, CSS-only animation)

An `<svg>` overlaying the avatar: a `stroke-border` track circle and a
`stroke-primary` progress circle with `stroke-linecap="round"`, rotated -90° so
it starts at 12 o'clock. `stroke-dasharray` is the circumference `C`;
`stroke-dashoffset` animates from `C` (empty) to `C × (1 − percent/100)` via a
keyframe that reads two inline custom properties:

```css
@keyframes nx-ring-in {
  from { stroke-dashoffset: var(--nx-ring-c); }
  to   { stroke-dashoffset: var(--nx-ring-offset); }
}
```

Both properties are set inline on the element, so the component stays a server
component with zero client JS. The reduced-motion baseline already in
`global.css` collapses the animation to its end state.

`aria-hidden` on the svg — the percentage is announced by the text next to it.

### `SettingsNav` (client component)

- **`lg` and up:** `sticky top-24` vertical list of four `h-9` links. A single
  absolutely-positioned `bg-muted rounded-lg` pill sits behind them and moves
  with `translateY(activeIndex × 2.25rem)` + `transition-transform` — uniform
  item height means the pill never has to measure anything.
- **Below `lg`:** `sticky top-16 z-30` horizontal chip row, `overflow-x-auto`
  with a `bg-background/85 backdrop-blur` backing so cards scrolling under it
  stay readable. The active chip calls `scrollIntoView({ inline: 'nearest' })`.
- **Scroll-spy:** one `IntersectionObserver` over the four sections; on each
  update the active id is chosen by the pure `pickActiveSection()` helper
  (below), never inline in the effect — that is the part worth testing.
- **A11y:** `<nav aria-label>`, links are real `<a href="#id">` (so the page
  works with JS off), `aria-current="true"` on the active one.

### `SettingsCard`

```
section  id  scroll-mt-28  bg-card shadow-card rounded-2xl border
├─ header  border-b px-5 py-4 sm:px-6   icon + title + description
└─ div     p-5 sm:p-6                    children
```

Wrapped by `<Reveal>` — a small client component that adds
`animate-in fade-in slide-in-from-bottom-3 duration-500` when the card first
enters the viewport, with a per-index `delay` for the stagger. Under
`useReducedMotion()` it renders visible immediately and never observes.

Danger's card takes `border-destructive/30` and a destructive-toned header icon.

### `SaveButton` + saved flash — `ProfileForm`

`SaveButton` is a three-state button: `idle` → label; `saving` → spinner +
`Saving…`; `saved` → `CheckIcon` + `Saved`, reverting to `idle` after 1.4 s.
On success the form's wrapper also gets a `nx-flash` class for 700 ms:

```css
@keyframes nx-flash {
  from { box-shadow: 0 0 0 0.25rem color-mix(in oklch, var(--color-success) 35%, transparent); }
  to   { box-shadow: 0 0 0 0.25rem transparent; }
}
```

The existing `toast.success` stays — the flash is a second, local channel, not
a replacement (screen-reader users get the toast; the flash is decorative and
`aria-hidden`-irrelevant since it is pure box-shadow).

`ChangePasswordForm` adopts `SaveButton` only if it is a drop-in; its
pending/error handling is not otherwise touched.

### `DangerZone`

Wrapped in `Collapsible` from `@tourism/ui`, closed by default. The trigger row
shows the title + a chevron that rotates 180° when open; the delete button and
its `AlertDialog` are unchanged inside.

### `ConnectedAccounts`

Provider pills become small tiles (`rounded-xl border p-3`) with the provider
label, a `text-success` check, and a `hover:-translate-y-0.5 hover:shadow-md`
lift matching the dashboard cards. Still read-only.

## Pure logic (TDD)

**`lib/account/completeness.ts`**

```ts
export type CompletenessKey = 'avatar' | 'name' | 'phone' | 'signin';
export interface CompletenessItem { key: CompletenessKey; done: boolean; sectionId: string }
export interface Completeness { percent: number; items: CompletenessItem[]; missing: CompletenessKey[] }
export function computeCompleteness(input: {
  avatarUrl: string | null; fullName: string; phone: string; providers: string[];
}): Completeness;
```

Rules: each item is 25 %; `percent` is a rounded integer; whitespace-only
`fullName`/`phone` count as missing; `providers: []` makes `signin` missing
(defensive — the page always passes at least one).

**`lib/account/settings-nav.ts`**

```ts
export interface SectionPosition { id: string; top: number }
export function pickActiveSection(positions: SectionPosition[], ids: string[]): string;
```

Returns the last section whose `top` is at or above the anchor line (`top <= 0`);
if none has been passed yet, the first id; empty input falls back to `ids[0]`.
Keeps the observer callback a one-liner and makes the edge cases testable.

## i18n (EN-only, ADR-0005)

Added under `auth.account.settings`:

| Key | Copy |
| --- | --- |
| `nav.personal` / `nav.security` / `nav.connected` / `nav.danger` | `Personal` · `Sign-in` · `Connected` · `Danger zone` |
| `completeness.label` | `complete` (follows the ticker) |
| `completeness.done` | `Your profile is complete.` |
| `completeness.hint` | `Finish these to complete your profile` |
| `completeness.add.avatar` | `Add a photo` |
| `completeness.add.name` | `Add your name` |
| `completeness.add.phone` | `Add your phone number` |
| `completeness.add.signin` | `Link a sign-in method` |
| `savedShort` | `Saved` |
| `saving` | `Saving…` |
| `dangerToggle.show` / `.hide` | `Show` · `Hide` |

Existing `settings.*Heading` / `*Desc` strings are reused verbatim as the card
headers. No key is removed.

## Testing

- `lib/account/completeness.spec.ts` — 0 %/25 %/50 %/100 %, whitespace-only
  name and phone, empty providers, `missing` order matches item order.
- `lib/account/settings-nav.spec.ts` — nothing passed → first id; some passed →
  last passed; all passed → last id; empty positions → first id.
- `change-email-form.spec.tsx` must stay green (it renders the form directly,
  so the layout change should not reach it — a canary for accidental coupling).
- Visual/layout (rail stickiness, pill travel, reveal stagger, chip-bar
  scrolling) is covered by a manual browser pass, per CLAUDE.md #4.

## Planned files

**New**

- `apps/web/src/lib/account/completeness.ts` + `.spec.ts`
- `apps/web/src/lib/account/settings-nav.ts` + `.spec.ts`
- `apps/web/src/components/account/settings-hero.tsx`
- `apps/web/src/components/account/completeness-ring.tsx`
- `apps/web/src/components/account/settings-nav.tsx`
- `apps/web/src/components/account/settings-card.tsx`
- `apps/web/src/components/account/reveal.tsx`
- `apps/web/src/components/account/save-button.tsx`

**Modified**

- `apps/web/src/app/account/profile/page.tsx`
- `apps/web/src/app/account/loading.tsx`
- `apps/web/src/app/global.css` (two keyframes)
- `apps/web/src/components/account/avatar-uploader.tsx`
- `apps/web/src/components/account/profile-form.tsx`
- `apps/web/src/components/account/danger-zone.tsx`
- `apps/web/src/components/account/connected-accounts.tsx`
- `libs/shared/i18n/src/lib/messages.ts`

**Deleted**

- `apps/web/src/components/account/account-section.tsx` — replaced by
  `SettingsCard`; verified to have no other importer.

## Risks

1. **Sticky offsets are guesses until seen.** `SiteHeader` is `sticky top-0` and
   shrinks `h-16 → h-14` on scroll, so `top-24` / `top-16` / `scroll-mt-28` are
   starting values to confirm in the browser, not derived constants.
2. **Two sticky layers below `lg`** (site header + chip bar) can fight on short
   viewports. Mitigation: the chip bar is `h-12` and `z-30` (under the header's
   `z-50`); if it still crowds, it loses stickiness below `sm`.
3. **`stroke-dashoffset` keyframes** need the custom properties inline on the
   same element; if a browser drops the animation the circle must still render
   at its final offset — set `stroke-dashoffset` as the base style too, with the
   keyframe only animating *into* it (`animation-fill-mode: both`).
4. **Moving the avatar into the hero** changes `AvatarUploader`'s markup
   contract. It has no spec file today, so nothing breaks silently — but the
   heading it currently renders (`t.avatar.heading`) disappears from the DOM;
   the hero must not lose the `hint` copy that explains accepted file types.
5. **`Reveal` on a card containing forms** must not mount-block interactivity:
   it only toggles classes, never conditionally renders children, so inputs are
   in the DOM and focusable from the first paint.

---

## Revision 2 — what actually shipped

**Two hand-paired columns, no navigation of any kind.**

```
main  max-w-5xl
├─ back link
├─ header       h1 title + subtitle
└─ grid  items-start gap-6 lg:grid-cols-2
   ├─ column 1  Personal (avatar + name/phone/email)  ·  Connected accounts
   └─ column 2  Email & password (change email + change password)  ·  Danger zone
```

Locked decisions for this revision:

1. **No rail, no chip bar, no tabs, no anchors.** With four groups on a
   two-viewport page, any navigation costs more attention than the scrolling it
   saves.
2. **Columns are paired by hand, not auto-flowed.** The groups differ wildly in
   height — a password form against a single delete button — so row-major
   auto-flow would leave a ragged gap under the shorter card. Pairing the tall
   Email & password card against Personal + Connected keeps both columns level.
   Two explicit column `<div>`s, not `grid-flow`.
3. **The avatar returns to the Personal card**, above a `Separator` and the
   name/phone form. `AvatarUploader` is back to its original markup — its own
   heading and file-type hint included.
4. **Motion left in place: the danger-zone chevron, and nothing else.** No
   hover-lift on the cards: they hold live form fields, and a card that shifts
   under the pointer while you are aiming at an input is a cost, not a flourish.
5. **`SettingsCard` survives** as the shared shell (header strip with a tinted
   icon tile, `tone="danger"` variant). It lost `scroll-mt-28` along with the
   anchors.
6. **Copy is unchanged from before the redesign** — `personalDesc` went back to
   mentioning the photo, and the only key added by this feature that remains is
   `settings.dangerToggle.{show,hide}`.

Testing: no new pure logic, so no new specs. `@tourism/web` is back to **423**
tests, all passing; lint clean; build green.

---

## Revision 3 — back to the original shape, polished

Revision 2's two-column card grid was also rejected. Final direction, at the
user's instruction ("như thiết kế gốc ban đầu nhưng làm nó đẹp hơn thôi"): keep
the **original** layout — four groups stacked in one column, each a
label-left / content-right row, separated by `divide-y` — and spend the effort
on finish rather than structure.

What "polished" means concretely, against the pre-redesign page:

1. **No icons.** An icon tile beside each group heading was tried and removed at
   the user's request — decorative glyphs on every section read as generated
   filler, not as design. The label column is heading + description, nothing
   else.
2. **The content sits in a panel** (`bg-card shadow-card rounded-2xl border`)
   rather than floating on the page background. Previously nothing marked where
   one group's controls ended and the next began.
3. **Panels are divided into labelled rows** — Photo / Your details, Email /
   Password — with the padding on the row, so each rule spans the panel's full
   width. An inset hairline reads as a gap; a full-width one reads as a
   boundary. This is what the user asked for with "chia ra từng phần rõ ràng".
4. **The forms stopped rendering their own headings.** `ChangeEmailForm` and
   `ChangePasswordForm` each emitted an `<h3>`; the row now owns that, so the
   heading tier is consistent across every group.
5. **The avatar row lost its "Photo" heading** (the row supplies it) and gained
   `ring-1` plus a larger fallback initial.
6. **The danger group is tinted** (`border-destructive/30 bg-destructive/5`) and
   still hides the delete button behind a Show toggle.

New i18n keys in this revision: `settings.photoHeading` · `detailsHeading` ·
`emailHeading` · `passwordHeading` (row labels), alongside the surviving
`settings.dangerToggle`.

Components at the end of the feature: `account-section.tsx` (`AccountSection` +
`AccountSectionRow`) and the existing `avatar-uploader` / `profile-form` /
`change-email-form` / `change-password-form` / `connected-accounts` /
`danger-zone`. `settings-card.tsx` was deleted with revision 2's grid.

Gate: lint clean, build green, `@tourism/web` **423** tests passing.
