# Navbar redesign + Nexora "NEX" logo

**Date:** 2026-06-25 · **Branch:** `feat/navbar-redesign` · **Scope:** `@tourism/web`

## Goal

Finalise the Nexora brandmark in the header/footer/favicon and upgrade the
header with three touches adapted from the shadcnspace **Navbar 01** block
(pasted into `playground.md`). The shadcnspace **Topbar 01** block was reviewed
and deliberately **not** adopted now — it is a logged-in dashboard topbar
(notifications, profile, language switcher); language is out of scope (EN-only,
ADR-0005) and notifications/profile need customer auth (a later phase). Its
profile dropdown is a candidate to revisit when customer auth lands.

## Logo — "NEX" monogram (origami fold)

- `LogoMark` renders **NEX** in a heavy geometric sans (`font-sans`, extrabold)
  with a diagonal **two-tone "origami fold"** via the `.nexora-fold` utility
  (`global.css`). The fold colour follows `--nx-tone` (defaults to `--primary`).
- `Logo` = `LogoMark` + the **Nexora** wordmark (Fraunces). **No tile** — the
  emerald letters sit beside the serif wordmark so the mark never competes with
  the emerald "Plan your trip" CTA in the header.
- **Footer** (dark `bg-foreground`) overrides `--nx-tone` → ivory and the
  wordmark → ivory.
- **Favicon** `app/icon.svg`: emerald rounded tile + white NEX (text with an
  embedded Geist `@import` + system-sans fallback, two-tone gradient). The
  favicon keeps a tile so it stays legible standalone on a browser tab.

## Header upgrades (from Navbar 01)

1. **Pill-on-scroll (#1):** past 50px (`window.scrollY`, passive listener) the
   bar contracts into a floating glass pill — `rounded-full`, `bg-background/70`,
   `backdrop-blur-lg`, soft `shadow-primary/5`, border. All transitions gated
   behind `motion-safe:` so reduced-motion users get an instant state swap.
2. **Hover-pill links (#2):** About/Contact (and Login) lift into a soft
   `bg-muted` pill on hover instead of a plain colour change. The Tours /
   Destinations dropdown structure is unchanged.
3. **Arrow CTA (#3):** `PlanTripButton` — the arrow disc slides across and
   rotates on hover (motion-safe), replacing the flat primary button on desktop.
   Mobile keeps the simple button.

## Constraints honoured

- Tokens only / no raw hex (favicon uses the same `oklch` token values).
- Base UI (`@tourism/ui`) — `render` prop, not `asChild`.
- Single Primary `nav` landmark (the desktop nav); the scroll container is a
  plain `div`.

## Verification

- `nx run-many -t lint build @tourism/web` green; `check:no-hex` OK.
- Visual: review header at top vs scrolled (pill), light + dark, mobile;
  logo in header + footer + favicon tab.
