# Tour form content authoring + rich itinerary — design

- **Date:** 2026-07-01
- **Scope:** `@tourism/admin` (tour create/edit form) · `@tourism/api` (itinerary length) · `@tourism/web`
  (tour-detail rendering)
- **Status:** approved direction, spec for execution
- **Trigger:** review of the New-Tour form. Slug is manual (inconsistent), Meeting point has no format
  guidance, the Content lists are fiddly chip inputs, the Itinerary/FAQ/Policy fields have hidden
  formats no one explained, Highlights is collected but never shown on the web, and the itinerary can't
  express the rich, structured day content Lily-style tours need.

## Reference: how Lily writes an itinerary day

(`lilystravelagency.com` product page.) Each day is a **small document**: `DAY N: TITLE` heading,
**bold** place/activity names, time markers (`07:30`, `8:00–8:30AM`), a mix of paragraphs and bullet
lists, meal notes — 2–5 paragraphs on complex days. Our current model (`parseItinerary` → flat "time +
one line" list) can't express bold, sub-headings, bullets, or multi-paragraph. **The data model is too
poor**, so a hint alone won't fix it — the itinerary body needs real rich text.

## Decisions (confirmed with the user)

- **Itinerary body → Markdown**, keeping the day **Stepper**. Author markdown in a large textarea; the
  web renders it (prose) inside the existing per-day Stepper panel. Plain text stays valid markdown, so
  existing days keep rendering.
- **Highlights → wired into the web** (currently dropped in the view-model). Render a Highlights list on
  the tour detail.
- **Layout stays single-column** Form Layout 2 — consistent with the other admin forms (do NOT split
  Tours into two columns).
- Markdown is scoped to the **itinerary body for now**; FAQ answer / policy body stay plain text
  (shorter content) — revisit later if needed.

## Changes

### A. Admin — quick wins (non-markdown)

1. **Slug auto-generate** — mirror the destination form: live `slugify(title)` fills the slug until the
   admin edits it (`slug`/`slugEdited` state). The BE already derives a blank slug; this adds the live,
   consistent preview so admins stop hand-typing divergent slugs.
2. **Meeting point hint** — add a `FieldDescription` with a fixed convention: **"Venue name, street
   address, city"** (e.g. *"Hoi An Tourist Info Centre, 78 Le Loi Street, Hoi An"*). Purely additive.
3. **Content lists (Highlights / Included / Excluded): `ChipInput` → one-per-line `Textarea`.** Each is
   still an **array of short bullets** (matches how the web renders them), but a textarea (split on
   newlines → trimmed non-empty lines) is far easier to bulk-enter and edit as a block. Hint: "One item
   per line." The server action parses these fields by splitting the textarea value instead of
   `formData.getAll` of per-chip hidden inputs. (`ChipInput` can be removed if nothing else uses it.)
4. **FAQ / Policy example hints** — enrich placeholders + short `FieldDescription`s so the intent is
   obvious. Clarify that a policy's **Kind** is organisational (grouping) and **not shown verbatim** on
   the web; **Title** is the heading, **Body** the shown text.

### B. Web — rich itinerary + highlights

5. **Itinerary Markdown rendering.** Add `react-markdown` + `remark-gfm` to `@tourism/web`. In
   `tour-itinerary.tsx`, replace the `parseItinerary` time-list in the Stepper **panel** with a
   `<ReactMarkdown>` render of the day's `body`, styled via a `components` map (Tailwind classes on
   `h3/h4/strong/em/ul/ol/li/p/a`) — **no `@tailwindcss/typography` plugin needed**, keeping the bundle
   lean and the styling on-brand. Keep the Stepper day-nav (left) + panel (right) shell. `parseItinerary`
   + its spec are removed once unused. **Security:** react-markdown does not render raw HTML by default
   (no `rehype-raw`), so no XSS from authored content.
6. **Highlights on the web.** Map `dto.highlights` into `TourDetailVM` and render a **Highlights**
   section on the tour detail (a clean checklist near the overview). Empty → section hidden.

### C. API — itinerary length

7. **Bump `TourItineraryDayInput.description` `@MaxLength(2000)` → 8000** (rich markdown days run long).
   Match the admin `tourSchema` itinerary description `max(2000)` → `max(8000)` in lockstep. No response
   shape change → **no type regen**; it's a validation bound only (Render redeploy).

## Non-goals

- No two-column tour form (consistency).
- No markdown for FAQ answer / policy body (yet).
- No WYSIWYG editor — a markdown textarea + a small formatting cheatsheet is the MVP (a live preview is a
  possible later enhancement, not in scope).
- No blog reader work — but this adds the `react-markdown` infra the deferred blog (Post.content is
  markdown) will reuse.

## Authoring example (what an admin types → what the web shows)

Itinerary day **Description** (markdown):

```markdown
**08:00 — Hotel pickup** in the Old Town, then drive to Cu Chi (60 km, ~1h).

Morning highlights:
- Watch the documentary on the tunnel network
- Crawl a widened, tourist-safe tunnel section
- See the Hoang Cam kitchen & weapon workshops

**12:00 — Lunch** by the river *(included)*.
```

→ Renders in the Stepper panel with a bold lead line, a bulleted list, and paragraphs — a real document,
not a flat time list.

## Testing

- **Admin:** `tourSchema` unit tests updated for the itinerary length bump + the Content
  newline-splitting parse (pure). `slugify` already tested.
- **API:** the itinerary DTO length change is a bound; covered by the existing tours e2e/service tests
  compiling — add/adjust a validation test if one exists for the 2000 bound.
- **Web:** `parseItinerary` removed (drop its spec); markdown rendering is visual → verified on the
  Vercel deploy. Add a small render smoke test only if cheap.
- Visual verification on deploy per the usual rhythm.

## Risks

- **Deploy order:** the web must render markdown (Slice 2) **before** admins are told to author markdown
  (Slice 3), so authored `**bold**` never shows raw. Plain text renders fine throughout, so no hard
  break — just sequence the slices.
- **Length mismatch:** admin schema and API `@MaxLength` must move together, or a long day 400s. Bump
  both in the same slice.
- **Bundle:** `react-markdown` + `remark-gfm` add ~40–50 kB gz to the tour-detail route; acceptable for
  an app page, and it's the shared markdown infra for blog. Keep it out of the landing bundle (it's only
  imported by the tour-detail itinerary component, which is already client-side).

## Success criteria

- New-tour slug auto-fills from the title; Meeting point has a clear format hint.
- Highlights / Included / Excluded are easy one-per-line textareas.
- Itinerary days render rich (headings/bold/bullets/paragraphs) on the web, authored as markdown, in the
  existing Stepper.
- Highlights appear on the tour detail.
- Form stays single-column. `/gate` green on each touched project; reviewed per slice.
