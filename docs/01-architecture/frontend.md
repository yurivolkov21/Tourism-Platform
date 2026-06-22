# Frontend (web · admin · mobile)

> Living doc. Web (P3) is filled below; admin (P4) / mobile (P5) fill as they land.

## Shared foundation

- **Tokens:** `@tourism/tokens` → web CSS vars + RN theme (no hex; tokens only). Built with **Style
  Dictionary**; brand **"Emerald Heritage"** (deep emerald + ivory + brass, Fraunces serif h1–h3 +
  Geist body, radius `0.375rem`, WCAG AA). `pnpm check:no-hex` enforces tokens-only.
- **UI:** `@tourism/ui` (web, React) — shadcn on **Base UI** (`base-nova`), 54 components. admin reuses
  it. `@tourism/mobile-ui` (RN) later. *(Base UI: `Button` is the primitive — use `render`/`nativeButton`,
  no `asChild`.)*
- **i18n:** `@tourism/i18n` EN-only ([ADR-0005](../02-decisions/0005-en-only.md)). All web surfaces read
  copy from `messages.*` — no inline strings. Long-form legal *documents* are the one exception (see Web).
- **Domain/data:** `@tourism/core` types · zod · typed OpenAPI client (consumed by all apps) + pure
  domain helpers (e.g. destination region-grouping / slug lookup, TDD'd).

## Web (`@tourism/web`)

Next.js 16 App Router (RSC). **Layout-first**: build with placeholder fixtures shaped like the eventual
`@tourism/core` DTOs, then wire the live client later (deferred to end of P3). Temporary **Unsplash**
imagery via `next/image` `remotePatterns` — review only, swap for `MediaAsset`.

### Routes

| Route | Render | Notes |
| --- | --- | --- |
| `/` | static | Lily-style homepage (hero · destinations bento · experiences · featured · why-choose · trust · blog-teaser · enquiry). |
| `/destinations` | static | Overview: hero · full-bleed region mosaics (feature tiles) · when-to-visit · popular (image posters) · testimonials · travel-tips · enquiry. |
| `/destinations/[region]` | **SSG** (×3) | `generateStaticParams` → northern/central/southern-vietnam; unknown → `notFound()`. Hero · intro bento · highlights · **per-region L2 signature** (North dark-stats · Central heritage-timeline · South delta-postcards) · tours (tabs, `?d=` client-read keeps SSG) · gallery · value-props · **rich Plan-your-trip form** (maps Enquiry model). Replaced per-destination `[slug]`. |
| `/about` | static | AboutHero · "Our story" **alternating image timeline** (centre spine + haloed year nodes) · by-the-numbers · team · enquiry. |
| `/contact` | static | ContentHero · **channels** (call/email/WhatsApp action cards) · **two offices + map** · Plan-your-trip form · closing CtaBand. |
| `/faq` | static | Searchable grouped accordion (category icons) · sticky TOC · **FAQPage JSON-LD**. |
| `/privacy`, `/terms` | static | Legal documents — **drafts pending legal review** (placeholders + review callout). |
| `/ui-check` | static | Dev sandbox for `@tourism/ui`. |

**Header/footer** live in `app/layout.tsx`. Primary nav: **Tours** (experiences dropdown) · **Destinations**
(regions dropdown → `/destinations/<region>`; regions also expanded in the mobile menu) · **About** (`/about`) ·
**Contact** (`/contact`). The "Plan your trip" button/FAB keeps `#contact` (scrolls to the on-page enquiry
form — every page carries one with `id="contact"`). Footer Support column → About · `/faq` `/privacy` `/terms` · Contact.

### Component layout (`apps/web/src/`)

```text
components/
  layout/      SiteHeader · SiteFooter · TopBar · FloatingContact · ScrollToTop
  marketing/   hero · destinations(bento) · experiences · featured-packages · why-choose ·
               trust · testimonials · blog-teaser · enquiry-cta · plan-trip-form(rich enquiry) ·
               gallery(+lightbox) · faq* · cta-band …
  destinations/ DestinationTile · RegionGroup(mosaic) · DestinationsHero · DestinationHero ·
               RegionHero · RegionIntro(bento) · RegionHighlights · RegionTours(tabs) · ValueProps ·
               RegionSignature{Adventure,Timeline,Delta} (per-region L2; dispatched by lib/region-theme)
               DestinationIntro · DestinationTours · PopularTours · BestTime · TravelTips
  faq/         FaqExplorer (search + card accordion)
  legal/       LegalArticle (renders a LegalDoc)
  content/     ContentHero · OnThisPage (shared content-page template)
  tours/       TourCard · ToursExplorer · TourGallery
  about/ contact/ brand/ icons/
lib/           destinations.fixtures.ts · slug.ts          (view-model fixtures + helpers)
content/       privacy.ts · terms.ts · legal-page.ts       (long-form legal documents)
```

### Shared content-page template

`/faq`, `/privacy`, `/terms` share a template:

- **`ContentHero`** — soft emerald header band: breadcrumb + Fraunces title (+ meta/subtitle).
- **`OnThisPage`** — sticky "On this page" TOC with `IntersectionObserver` scroll-spy.
- Two-column layout (`lg:grid-cols-[14rem_1fr]`): sticky TOC aside + `max-w-3xl` content.
- **FAQ** adds a client `FaqExplorer` (search filter + grouped card accordion with a plus↔minus toggle).
- **Legal** uses `LegalArticle` (numbered sections + dividers) driven by a typed `LegalDoc`.

### Data strategy

- **Now:** fixtures in `apps/web/src/lib/*.fixtures.ts`, typed as web view-models that extend
  `@tourism/core` DTOs (e.g. `DestinationTileVM extends DestinationSummary`).
- **Pure logic in `@tourism/core`** (not the app): the app has no unit-test harness, and the project
  TDDs pure logic in shared libs while covering web layout via e2e. Example: `groupByRegion`, `getBySlug`.
- **Later:** replace fixtures with the live typed client (`/regen-types` after BE DTO changes).

### Conventions

- Tokens-only (no hex), reuse `@tourism/ui` first, app imports **relative** (not `@/`).
- Inspiration surfaces image-forward + Fraunces serif; per section/page: build → `/gate` (+ no-hex) →
  review → branch → rebase-merge.
- **Legal pages need counsel review** before launch — they carry bracketed placeholders + a "draft" callout.

## Admin (`@tourism/admin`) — P4

📝 Scaffold. App Router structure, auth-protected layout, CRUD UIs — fill when P4 lands.

## Mobile (`@tourism/mobile`) — P5

📝 Scaffold. Expo Router, RN screens, `@tourism/mobile-ui`, reuse `@tourism/core` — fill when P5 lands.
