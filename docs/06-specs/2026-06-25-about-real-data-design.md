# About page — real data + team slider

**Status:** in review · **Date:** 2026-06-25 · **Branch:** `fix/about-real-data`

About/Contact are content pages (no backend) — copy lives in `@tourism/i18n`.
This pass makes About honest/real where it matters and restyles the team. Contact
is untouched (handled later). Direction: **hybrid** — keep the polished
travel-brand persona, but real where it's cheap to be real.

## Changes

### 1. ByTheNumbers → real catalog numbers

"A decade of crafting journeys" (fabricated 12+ years / 40+ guides / 98%) is
replaced with **real** figures derived from the live catalog:

- `computeAboutMetrics(tours, destinations)` (pure, TDD) → `{ tours, destinations,
  regions, rating }`: published tours count, destinations count, distinct region
  count, and the review-count-weighted average rating (1-dp, 0 when none).
- `fetchAboutMetrics()` fetches tours + destinations and computes; the About page
  becomes an async server component (`revalidate = 300`) and passes the values.
- i18n keeps the labels (reworded: Curated tours · Destinations · Regions covered
  · Traveller rating) + a reworded heading/subtitle (no "decade"); `ByTheNumbers`
  takes a `values: string[]` prop aligned to the labels (count-up via MetricValue).

### 2. Team → real members + Testimonial-02 slider

- i18n `about.team.members` → the four real team members (names provided), with
  travel-brand roles/bios (persona kept, content fictional) + an optional
  `image?` field for future portraits.
- `Team` is rebuilt as a **slider** adapted from Shadcn Space "Testimonial 02"
  (the code the user pasted in `playground.md`): one member per slide — a large
  bio (quote), name + role, and a portrait column. Built with `@tourism/ui`
  `Carousel` + `Badge` + the existing `Reveal` (NOT `motion/react`, which isn't a
  dependency), brand-tokenized. No portrait photos yet → the portrait column shows
  an **initials avatar**; a real `image` drops in later. The brand-logo marquee
  from the original block is dropped (irrelevant to a team section).

### 3. Story → enrich + image-ready

Keep the alternating timeline + persona dates, but **enrich each milestone's
description** and move the milestone image into the i18n data as an optional
`image?` (component falls back to the current placeholder set), so swapping in
real milestone photos later is a data edit, not a code change.

## Out of scope

Contact page (offices/phones — later); real team photos (data-ready now);
booking/auth.

## Tests / verification

- web jest: `computeAboutMetrics` (counts, distinct regions, weighted rating, no-
  reviews → 0).
- Build + live verify: About shows real counts; team slider renders members with
  initials; story descriptions enriched.
