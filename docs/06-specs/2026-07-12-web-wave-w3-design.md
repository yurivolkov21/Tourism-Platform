# Web wave W3 — final cleanups (dead code · i18n sweep · SectionHeading) — design spec

**Date:** 2026-07-12 · **Scope:** apps/web + @tourism/i18n (NO BE changes) ·
**Status:** ✅ **done** — merged 2026-07-12 (`0b8dc66…a127979`); gate green (web
252), adversarial review clean. Also folded in the auth/account/checkout
double-brand fix (12 pages). web debt program W1 ✅ · W2 ✅ · W3 ✅ → next W4
(FormField, deferred by design).

## Problem

Third and (for now) final wave of the web debt program — mechanical debt from
three in-code audits (2026-07-12):

1. **Dead fixture generator.** `apps/web/src/lib/tours.ts` (335 lines) is a
   pre-API placeholder tour-detail generator. The live pages fetch through
   `lib/api/*` now; only its **types** are still imported (all 6 importers are
   `import type`). ~270 lines of functions are dead weight.
2. **Hardcoded copy.** 8 pages hardcode `Metadata` `title`/`description` as
   literals instead of `@tourism/i18n` — and worse, they read
   **"— Tourism Platform"** when the brand is **"Nexora"** (a live branding
   bug). Breadcrumb + pagination `aria-label`s are duplicated verbatim across
   several files. One message key (`messages.blog.loadError`) went dead when W2
   replaced the blog inline failed-panel with `LoadErrorState`.
3. **Repeated section-heading markup.** ~30 marketing/content sections hand-roll
   the same "Fraunces title (+ optional eyebrow/subtitle)" header block. No
   shared web component exists — though **mobile already extracted one**
   (`apps/mobile/src/components/section-heading.tsx`, `{eyebrow,title,subtitle}`).

## Resolved decisions (user, 2026-07-12)

- **FormField → deferred to W4.** The forms-refactor item (14 forms · ~26
  aria-wired fields · two coexisting label idioms · many bespoke widgets · no
  web component test harness) is the largest, most a11y-critical piece and gets
  its own wave. W4 also absorbs the adjacent bug: `account/profile-form.tsx` is
  missing `noValidate` (silently breaks the standing no-native-validation rule).
  **Not touched in W3.**
- **SectionHeading → focused.** One component covering the clean title rhythm;
  the accent-bar tour-detail family (already deduped via `TourSection`),
  view-all/action headers, and bespoke outliers stay as-is. No god-component.

## ① Dead-code removal — `lib/tours.ts` → types only

Reduce `apps/web/src/lib/tours.ts` to the **type declarations only**, preserving
the file path so the 6 type-only importers (`booking-box`, `tour-overview`,
`tour-reviews`, `tour-itinerary`, `lib/api/tour-detail`) don't change:

- **Keep:** `ItineraryDay`, `TourBadge`, `TourReview`, `Departure`,
  `TourDetailVM` (with its existing doc comments).
- **Delete (~270 lines):** `allTours`, `tourSlugs`, `getTourBySlug`, `ownerOf`,
  `buildItinerary`, `formatMeals`, `computeMealTotals`, `buildTransport`,
  `buildAccommodation`, `buildReviews`, `relatedTours`, `deriveBadge`,
  `buildDepartures`, `getTourDetail`, and the `INCLUDED`/`NOT_INCLUDED`/
  `REVIEW_POOL` constants — plus the now-unused `getBySlug` (`@tourism/core`)
  and `destinations` (`./destinations.fixtures`) imports.
- **Keep the `TourCardData` import** (`../components/tours/tour-card`) — the
  retained `TourDetailVM extends TourCardData` + `related: TourCardData[]` still
  use it.
- **`destinations.fixtures` stays** — verified still live (imported by
  `regions.ts` for its `destinations` data + it's the declared home of
  `DestinationTileVM` for ~9 files). Only `lib/tours.ts`'s import of it is removed.
- **No test references the deleted functions** (verified: the only `lib/tours`
  importers are `import type`; `sitemap.ts`'s `tourSlugs` is a local variable,
  not the deleted fn). Nothing else to update.

## ② i18n sweep

### Metadata → messages (fixes the Nexora branding bug)

Add a `messages.pageMeta` group holding `{ title, description }` for the 8
offending pages (privacy · terms · cancellationPolicy · faq · about · tours ·
destinations · contact). Each page renders its document title as
`` `${messages.pageMeta.<page>.title} — ${messages.brand.name}` `` (matching the
already-correct login/account/checkout pages) — which replaces the hardcoded
**"Tourism Platform"** with **"Nexora"**. `description` reads from the same group.
Also route the three `"… not found"` fallback titles
(`tours/[slug]`, `blog/[slug]`, `destinations/[region]`) + the region
`` `${data.name} tours` `` label through messages (`pageMeta.notFound.*` +
`pageMeta.regionSuffix`).

### Shared duplicated aria copy

- `messages.common.breadcrumbLabel` — replaces the 4 identical
  `aria-label="Breadcrumb"` (`content-hero`, `destinations-hero`, `region-hero`,
  `tours/[slug]/page`).
- `messages.pagination.{first,previous,next,last}` — replaces the 10 identical
  "Go to first/previous/next/last page" labels across `tours-listing.tsx`,
  `region-tours.tsx`, `blog/page.tsx`.

### Placeholders

- The 3 auth-form email placeholders reuse **one** shared key
  `messages.common.emailPlaceholder` (`'you@example.com'`, already duplicated in
  contact/planTrip — consolidate those to point at it too).
- `register` name placeholder + `date-picker` placeholder & its two aria-labels
  → new keys under the relevant existing groups (`auth.register.*`,
  `booking.datePicker.*`).

### Dead key

- Delete `messages.blog.loadError` (the only statically-confirmed zero-reference
  key; W2 orphaned it). **No broader 700-key sweep** — out of scope.

## ③ SectionHeading (focused)

New `apps/web/src/components/section-heading.tsx`, mirroring the mobile
component's prop shape:

```tsx
export function SectionHeading({
  eyebrow,   // optional uppercase caption (ReactNode — carries per-region color when needed)
  title,     // required; renders as <h2> (or <h3>) in font-heading
  subtitle,  // optional muted paragraph
  as = 'h2',
  align = 'center',
  tone = 'default',   // 'onMedia' → light text for image-overlay banners
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  as?: 'h2' | 'h3';
  align?: 'left' | 'center';
  tone?: 'default' | 'onMedia';
  className?: string;
}): ReactElement
```

Renders the standard block: optional eyebrow (`text-xs font-semibold
tracking-widest uppercase`), `font-heading` heading (`text-balance`, standard
responsive scale), optional `text-pretty` subtitle (`text-muted-foreground`, or
`text-on-media/85` under `tone="onMedia"`); wrapper alignment from `align`;
`className` for per-call width/spacing overrides. Tokens only.

### Migration set (~18–22 clean sites)

Replace the hand-rolled header block in:

- **Centered h2(+subtitle):** experiences · why-choose · featured-packages ·
  destinations · payment-trust · trust (`tone="onMedia"`) · best-time ·
  popular-tours · travel-tips · story.
- **Left h2(+subtitle):** contact-location · (features — heading block only;
  its CTA button stays below, outside SectionHeading).
- **h2-only:** value-props (×2) · region-highlights · region-tours ·
  related-tours · the **byte-identical** `blog/[slug]` "Tours in this story" block.
- **Eyebrow bands (signature):** region-signature · -delta · -timeline ·
  -adventure — the per-region-colored eyebrow passes through as an `eyebrow`
  node. Include only where the color threads cleanly; otherwise leave that one
  bespoke (implementer's call, noted in the plan).

### Excluded (stay as-is)

Accent-bar tour family (`TourSection` + tour-faq/-trust/-reviews/contact-faq —
they need an accent/action slot this focused API omits); view-all/action headers
(blog-teaser, blog/[slug] "More", region-group); `content-hero` (h1);
`about/team` + `by-the-numbers` (bespoke type scale + custom layout);
`legal-article` (CMS-driven); `tours-filters` (accordion label, not a heading);
blog empty-state (a feedback concern, not a section header).

## Non-goals

FormField / any form-wiring change (→ W4, incl. the profile-form `noValidate`
fix) · accent/`action` props on SectionHeading · rebasing `TourSection` ·
a full leaf-by-leaf audit of all ~700 message keys · BE changes · new deps ·
dev-server/screenshot review.

## Error handling

None new — W3 is deletion + copy-relocation + a presentational component. The
metadata/placeholder moves are 1:1 string relocations (same visible text, minus
the "Tourism Platform" → "Nexora" correction).

## Testing

W3 introduces **no new pure logic** → no new TDD specs; covered by the gate
(lint · typecheck · **build** — the real check that the deleted symbols and
moved keys resolve) + visual review, per CLAUDE.md #4. The existing **252** web
specs must stay green (the deleted `lib/tours.ts` functions are untested dead
code; the `DestinationTileVM`/`messages` specs are unaffected). Gate:
`pnpm nx affected -t lint typecheck test build --base=main` + `pnpm format:check`.

## Definition of done

`lib/tours.ts` is types-only; every W3-listed page/component reads its
metadata/aria/placeholder copy from `@tourism/i18n` (document titles now end in
"Nexora"); `messages.blog.loadError` is gone; the ~18–22 clean section headers
render through one `SectionHeading`; gate green; adversarial review; changelog
entry + docs sweep (frontend.md · CLAUDE.md web row → "W1+W2+W3 done, W4 =
FormField next" · HANDOFF · roadmap · plan STATUS).
