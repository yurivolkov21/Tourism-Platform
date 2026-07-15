# P5.6 — Mobile "Nexora Dark Heritage" redesign (Navel-inspired)

**Date:** 2026-07-15 · **Status:** APPROVED (design), plan pending
**Scope:** `apps/mobile` + `@tourism/mobile-ui` + `@tourism/tokens` (dark values)
**Reference:** Navel — Tour & Travel Booking App UI Kit (Figma Community,
50-screen audit 2026-07-15). Inspiration only — no assets/copy carried over
(personal license, non-commercial). Local exports live in `.png/` (gitignored).
Tripora kit was evaluated and dropped, except one pattern noted in §3.

## Problem

The mobile app is feature-complete (P5 + P5.5) but reads as "a shrunken
website": text-dense sections, static vertical rhythm, boxed images, flat
attached tab bar, weak depth. User confirmed direction against two reference
kits; Navel's aesthetic matches the brand almost 1:1 (dark forest-teal base +
warm amber accent + heritage mood = Emerald Heritage in dark mode).

## Locked decisions (user, 2026-07-15)

1. **Dark-first:** app forces the dark theme (ignores OS setting). Light
   palette stays in the codebase; an in-app toggle is backlog.
2. **Typography:** keep Fraunces as display — adopt Navel's *scale/contrast*
   (36–44pt heavy display, tight leading), not its typeface.
3. **Delivery:** three waves (R1 foundation+browse → R2 detail+money-path
   skin → R3 remainder), each gated/reviewed/merged separately.
4. **Ordering:** the owed combined device pass (esp. W4 payment loop) runs
   FIRST on the current UI to baseline logic; redesign is presentation-only
   on top of that baseline.

## §1 Design language

One-liner: **photography is the content; UI is a thin atmosphere over it.**

Palette — translated to Emerald Heritage tokens (never copied hex; no-hex
lint stands; all values enter via `@tourism/tokens` Style Dictionary):

| Role | Navel reference | Nexora Dark Heritage token intent |
| --- | --- | --- |
| Base background | dark forest teal ~#17302A | brand emerald, lightness dropped (~oklch 0.24) — related to web green, not Navel's teal verbatim |
| Accent / CTA / rating / active nav | warm amber ~#E1A45C | brand gold/amber family |
| Primary text | warm cream ~#F1E8D9 | new `text-inverse-warm` (no pure white) |
| Secondary text | sage grey ~#8CA39A | emerald-desaturated sage |
| Secondary surfaces | translucent lighter teal | raised emerald + alpha (inputs, chips, non-photo cards) |
| Success / error | sage ~#7FCB9C / coral ~#E2735A | keep existing semantics, retuned for dark |

Principles: no true black, no true white — every neutral is emerald- or
cream-tinted. Icons stay outline; active states change the *background*
(capsule), never the icon style. Radius scale: media cards 24–28dp, sheet
top 28dp, buttons stadium, icon buttons rounded-square 16dp.

Typography: one Fraunces display moment per screen (hero title, sheet title,
Home greeting) at 36–44pt heavy/tight; Geist body 14–15pt airy; money is
display-treated (large cream amount, small muted unit).

Image treatment: new `ScrimImage` applies ONE recipe everywhere — bottom-up
dark-emerald gradient scrim + a thin teal tint layer for uniform "grading" of
real admin-uploaded photos. Depth comes from translucent layering, peeking
carousel edges, and a glow halo used ONLY on confirmation screens.

## §2 Component inventory

Tokens (modify): retune `buildTheme('dark')` values per §1; add radius/scrim
tokens. `ThemeProvider` gains a `scheme` override prop; the app pins
`scheme="dark"`.

New `@tourism/mobile-ui` primitives:

- `ScrimImage` — image + scrim + tint (keeps N1 placeholder fade-in behavior)
- `FloatingTabBar` — floating pill bar w/ side margins, 5 outline icons,
  active = gold rounded-square capsule; injected via expo-router `tabBar`
  prop (routes untouched)
- `StickyCTABar` — pinned footer: left slot (price) + stadium button
- `GlowBadge` — circular photo + semantic glow halo (success gold / cancel
  coral) for confirmations

Modified primitives: `Card` gains a `media` variant (image-led, badges
overlaid on the photo); `Chip` gains a translucent filter-pill variant;
`Button` gains a two-tier resting/ready color state (the single Tripora
carry-over); `AppSheet` unchanged behaviorally, consumes new tokens.

**Zero data-layer change:** `lib/booking.ts`, query keys, payload builders,
auth flows are untouched. This is a presentation-layer program.

## §3 Wave breakdown

**R1 — Foundation + Browse:** dark tokens + forced dark + `ScrimImage` +
`FloatingTabBar` + `Card media`. Home (Fraunces greeting, pill search, rails
as peeking media cards) and Explore (full-width media cards, "Found N" chip,
filter sheet reskinned). Scrim recipe validated against 5–6 real tour photos
at wave start.

**R2 — Detail + money-path skin:** tour detail (full-bleed hero behind the
status bar, floating back/bookmark, vertical thumbnail rail from existing
gallery data, Fraunces 40pt title on scrim, segmented tabs Overview /
Itinerary / Reviews mapping existing sections — no new Location/map tab,
`StickyCTABar`); booking sheets reskinned (step logic from N2 byte-identical);
confirmation screens become one `GlowBadge` template with success/cancel
differing only in glow color + copy. Touches money-path presentation ⇒
**adversarial review required before merge.**

**R3 — Remainder:** auth screens (sparse form on emerald), Account / Trips
(status badge overlaid on card thumbnail) / Saved, one standardized
empty-state component (headline + subtext) replacing bespoke empties,
Settings. After R3 no screen carries the old skin.

## §4 Constraints & risks

1. No-hex lint stands — all Navel-derived values enter as tokens.
2. Test baselines (mobile 153 · mobile-ui 34) stay green; spec updates ride
   each task, not a wave-end sweep.
3. Perf: scrim = `expo-linear-gradient`, tint = overlay View; no runtime
   blur; glow shadows only on confirmations.
4. A11y: cream-on-emerald meets AA; text-on-photo depends on the scrim —
   recipe locked early in R1 against real photos.
5. Real photos will never match kit photography — `ScrimImage` uniformity is
   the mitigation, not a promise of parity.
6. Out of scope: maps/routes, wallet UI, Face ID/OTP, video tab, light-theme
   toggle, everything else Tripora.

## §5 Execution order

1. User runs the owed combined device pass on the current UI (logic
   baseline). In parallel: gate + commit the 2026-07-15 worklets/babel fix.
2. Write the 3-wave implementation plan under `docs/07-plans/` (one plan,
   wave-per-section, or three plans — decided at planning time).
3. Execute R1 → gate → on-device look → merge; repeat R2 (with adversarial
   review), R3. Docs sweep after every merge (CLAUDE.md rule 9).
