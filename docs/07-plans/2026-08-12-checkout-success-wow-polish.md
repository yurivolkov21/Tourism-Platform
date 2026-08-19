# Checkout success — "WOW" visual upgrade plan

**Spec:** extends [`2026-08-12-checkout-success-redesign-design.md`](../06-specs/2026-08-12-checkout-success-redesign-design.md)
**Branch:** `feat/checkout-success-redesign` (same branch) · **Date:** 2026-08-12
**Status:** W1–W4 ALL BUILT (2026-08-12) — awaiting visual sign-off.

## STATUS

- [x] `countdown.ts` — `daysUntilDeparture` + `tripLengthDays` (TDD, 14 tests)
- [x] W1.1 `CheckoutCelebration` — one-shot confetti, session-guarded, reduced-motion aware
- [x] W1.2 cinematic hero — Ken Burns (`.nx-kenburns` in `global.css`), layered scrim, countdown
- [x] W1.3 `TripStatStrip` — days to go · trip length · travellers · total paid
- [x] W2.1 boarding-pass `CheckoutResult` — tear line + punched notches, mono ref stub
- [x] W2.2 `ShineBorder` on the ticket only
- [x] W3.1 rail turns horizontal at `md` (stacked below)
- [x] W3.2 connector draw-in (`.nx-rail`, axis swaps at the breakpoint) + `.nx-pulse` halo on the live step
- [x] W3.3 `Progress` bar + "Step N of M" — both dropped for a stopped (cancelled/refunded) rail
- [~] W4.1 `.ics` add-to-calendar — built, then **CUT** at the user's call (2026-08-12).
      `calendar.ts` + spec + `AddToCalendarButton` deleted, `ticket.addToCalendar`
      i18n key removed, and `CheckoutResult`'s `meetingPoint` prop (which existed
      only to feed the event LOCATION) reverted. The ticket's PAID footer is back
      to a single full-width "Browse more tours" CTA.
- [x] W4.2 scroll-reveal sequencing via `AnimatedContent` (hero excluded — must paint instantly)
- [ ] Visual sign-off (needs a signed-in session — user-verified)

Gate after W1–W4: GREEN — web **430** tests (+28 over the 402 baseline), lint 0
errors, build OK.

Also refactored: `formatPrice` now derives from a new shared `currencyPrefix`
export so the count-up ticker and the static price render an identical face.

## Wave 5 — Editorial pass (2026-08-12, after visual review)

The user brought a reference brief ("cinematic luxury travel editorial —
asymmetrical composition, floating translucent glass panel, no rigid grids, no
generic dashboard cards"). Taken selectively — it is an image-generation prompt,
so it optimises for a still frame, while this page also has to prove a payment
and stay re-readable weeks later.

**Adopted**

- **Asymmetric hero.** Copy holds the left column, the countdown answers on the
  right with baselines aligned (`sm:grid-cols-[1fr_auto] sm:items-end`); the
  status icon moves inline with the reference pill. Centring everything was what
  made the page read as a template rather than a spread.
- **Scrim re-weighted** for that composition: bottom-up + **left**-weighted (the
  centred radial vignette was fighting a left-aligned headline).
- **Glass strip.** `bg-card/85` + `backdrop-blur-xl`, border dropped, tiles
  separated by hairline `divide-x` instead of card edges.

**Refused, with reasons**

- *"No generic dashboard cards"* applied to the **ticket** — the border, tear
  line and punched notches ARE the boarding-pass metaphor. Stripping them to
  chase borderless minimalism would delete the strongest element on the page.
- *Unbounded glass over photography* — the tour photo is admin-supplied and can
  be near-white. The 85% opacity floor is a WCAG AA decision, not a taste one.

**Bug the review surfaced:** the days-to-departure figure rendered **twice**
(hero centrepiece + a stat tile). The tile is gone; the strip is now 3-up
(length · travellers · total). Its now-dead i18n keys (`daysToGo`, `tripStatus`,
`status*`) were deleted rather than left orphaned.

## Bugfix — API date format (2026-08-12)

`departure.startDate/endDate` are documented `format: date` but the API sends
**full ISO datetimes** (`2026-09-15T00:00:00.000Z` — a serialised Prisma
`Date`). Confirmed against the running API, not assumed. Three consumers were
silently wrong:

| Symptom | Cause |
| --- | --- |
| "NaN days" in the strip, hero stuck on "Trip completed" | `Date.parse('<iso>T00:00:00.000Z')` → `NaN`, so every comparison fell through to the `past` branch |
| Timeline hid the departure day itself | string compare: `'2026-09-15' >= '2026-09-15T00:00:00.000Z'` is `false` |
| `.ics` rejected by calendar clients | `DTSTART;VALUE=DATE:20260914T00:00:00.000Z` |

Fixed with one shared seam — `lib/booking/dates.ts` `dateOnly()` — used by
`countdown.ts` and `timeline.ts` (and, while it existed, the `.ics` builder),
with regression tests that feed **the format the API actually sends**.

> The `.ics` builder was the third victim of this bug and is now cut, but the
> mismatch itself is live for anything else that touches these fields: the
> OpenAPI schema says `format: date` and the wire says otherwise. Worth a
> reference-doc note, or normalising it API-side.

## Design principle

Brand is **"Emerald Heritage" — boutique, premium, unhurried**. So WOW here
means *cinematic and tactile*, **not** arcade. Every effect must survive the
question: *would a luxury travel brand ship this?* Anything that reads as a
game-UI (neon sparkle text, bouncing badges) is rejected on purpose.

Second rule: **every animation respects `prefers-reduced-motion`** and every
effect degrades to a clean static page if JS is off. No layout shift.

## Reused seams (all already in `@tourism/ui` — zero new deps)

| Component | Used for |
| --- | --- |
| `Confetti` / `ConfettiRef` (canvas-confetti) | the one-shot payment-confirmed celebration |
| `NumberTicker` | days-to-departure countdown + total-paid count-up |
| `ShineBorder` | premium sheen on the ticket card |
| `AnimatedContent` (gsap scroll-reveal) | staggered section entrances |
| `AspectRatio`, `Progress`, `Badge`, `Separator` | supporting structure |

---

## Wave 1 — The moment (highest impact)

### W1.1 · Confetti on confirmation
Fires **once**, only when `status === 'PAID'`, only on `/checkout/success`
(never on the booking-detail page — that's a re-read, not a moment). A
`sessionStorage` guard keyed by booking code stops it re-firing when the user
comes back via the "View trip details" link. Brand-token colours, one short
burst from the hero centre — not a 5-second party.
**Skipped entirely under `prefers-reduced-motion`.**

### W1.2 · Cinematic hero
- **Ken Burns**: the tour photo drifts/zooms ~4% over 20s — pure CSS
  `@keyframes`, GPU-composited, no JS.
- **Layered scrim**: replace the flat overlay with a two-stop gradient so the
  title stays readable while the photo keeps its depth.
- **Countdown**: `NumberTicker` counts up to *"34 days until you go"* — real
  data (`departure.startDate − today`), and the single most emotional number
  on the page. Copy adapts: *today* / *tomorrow* / *N days* / *"Your trip has
  begun"* / *"Completed"*.

### W1.3 · Stat strip
A 4-up strip directly under the hero: **days to go · trip length · travellers
· total paid** (total uses `NumberTicker` too). Turns a receipt into a
dashboard. All values already on the DTO.

---

## Wave 2 — The ticket (tactile identity)

### W2.1 · Boarding-pass summary card
Re-cut the summary from a plain `Card` into a **ticket**: a dashed tear-line
across the middle, two punched notches on the edges (CSS radial-gradient
masks in `bg-background`, no images), the booking ref in mono/tracking-wide
like a real stub, and the tour title as the "route" line.
**Zero JS, zero layout risk — the highest wow-per-byte item in this plan.**

### W2.2 · ShineBorder
A slow sheen sweep on the ticket only (never on every card — scarcity is what
makes it read as premium).

---

## Wave 3 — The rail (the Shopee part, done better)

### W3.1 · Responsive orientation
Vertical rail on mobile (current), **horizontal on `md+`** — the desktop
layout Shopee uses, where all four steps read in one glance.

### W3.2 · Draw-in + live pulse
The connector fills left-to-right on mount (CSS transform, `will-change`),
and the **current** step gets a soft breathing ring so the eye lands on
"where am I now" instantly. Done steps get a spring-in tick.

### W3.3 · Progress context
A `Progress` bar + *"Step 2 of 4"* above the rail, so progress is legible even
before reading labels.

---

## Wave 4 — Utility that feels like magic

### W4.1 · Add to calendar (.ics)
A download button that generates a real `.ics` for the departure — title,
dates, meeting point in the location field, booking ref in the description.
**Pure function → TDD**, no backend, no external service. This is the item
users actually *remember*, because it saves them a chore.

### W4.2 · Scroll-reveal sequencing
Each section rises 24px + fades in on entry, staggered ~80ms via
`AnimatedContent`. Makes the page feel authored rather than dumped.

---

## Explicitly rejected

| Idea | Why not |
| --- | --- |
| `SparklesText` / `GradientText` on the headline | reads as gaming UI, fights the heritage brand |
| Auto-playing hero video | payment-return page must be instant; video is a latency + data cost |
| Sticky mobile mini-header | the page is short; a sticky bar would eat the hero |
| Parallax on scroll | jank risk on mid-range Android for a page users see once |
| Celebration on the booking-detail page | a re-read is not a moment; repeating it cheapens W1.1 |

## Pure logic (TDD, before any UI)

| Function | File | Contract |
| --- | --- | --- |
| `daysUntilDeparture(startDate, endDate, now)` | `lib/booking/countdown.ts` | → `{ kind: 'upcoming' \| 'today' \| 'ongoing' \| 'past', days }`; UTC day-boundary math (same rule as the timeline) |
| `buildTripCalendarEvent(booking, meetingPoint)` | `lib/booking/calendar.ts` | → RFC-5545 `.ics` string: `VEVENT`, all-day `DTSTART/DTEND` (end is exclusive → +1 day), CRLF line endings, escaped `;,\` in text fields, stable `UID` from the booking code |

## Sequencing

W1.2/W1.3 need `countdown.ts` first. W4.1 needs `calendar.ts` first.
Otherwise every wave is independent — they can ship in any order, or you can
take Wave 1 + 2 only and stop.

## Effort / risk

| Wave | Effort | Risk |
| --- | --- | --- |
| W1 | ~1h | low — confetti is a mounted client component; guard logic is the only subtlety |
| W2 | ~40m | very low — pure CSS |
| W3 | ~1h | medium — responsive orientation is the fiddly part |
| W4 | ~1h | low — `.ics` is a tested pure string builder |

**Recommendation if you only want one:** **W1 + W2**. The confetti moment plus
the ticket card is where the "WOW" actually lives; W3/W4 are refinement.
