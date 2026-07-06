# Frontend (web · admin · mobile)

> Living doc. Web (P3) is filled below; admin (P4) / mobile (P5) fill as they land.

## Shared foundation

- **Tokens:** `@tourism/tokens` → web CSS vars + RN theme (no hex; tokens only). Built with **Style
  Dictionary**; visual direction **"Emerald Heritage"** (deep emerald + ivory + brass, Fraunces serif
  h1–h3 + Geist body, radius `0.375rem`, WCAG AA). `pnpm check:no-hex` enforces tokens-only.
- **Brand:** product name is **"Nexora"** (set in `@tourism/i18n` `brand.name`) — a single "Nexora"
  wordmark carrying the origami two-tone fold (`.nexora-fold`); the standalone "NEX" monogram was
  dropped from the lockup (`ca1cfd0`). "Emerald Heritage" names the *palette/visual direction*, not
  the product.
- **UI:** `@tourism/ui` (web, React) — shadcn on **Base UI** (`base-nova`), 54 components. admin reuses
  it. `@tourism/mobile-ui` (RN) later. *(Base UI: `Button` is the primitive — use `render`/`nativeButton`,
  no `asChild`.)*
- **i18n:** `@tourism/i18n` EN-only ([ADR-0005](../02-decisions/0005-en-only.md)). All web surfaces read
  copy from `messages.*` — no inline strings. Long-form legal *documents* are the one exception (see Web).
- **Domain/data:** `@tourism/core` types · zod · typed OpenAPI client (consumed by all apps) + pure
  domain helpers (e.g. destination region-grouping / slug lookup, TDD'd).

## Web (`@tourism/web`)

Next.js 16 App Router (RSC). Built **layout-first** with fixtures shaped like the `@tourism/core`
DTOs; **real data is now wired** across home/destinations/tours/blog/account via the typed client
(ISR). Only curated editorial imagery remains static (Unsplash via `next/image` `remotePatterns`).

### Routes

| Route | Render | Notes |
| --- | --- | --- |
| `/` | static | Lily-style homepage (hero · destinations bento · experiences · featured · why-choose · trust · blog-teaser · enquiry). |
| `/destinations` | static | Overview: hero · full-bleed region mosaics (feature tiles) · when-to-visit · popular (image posters) · testimonials · travel-tips · enquiry. |
| `/destinations/[region]` | **SSG** (×3) | `generateStaticParams` → northern/central/southern-vietnam; unknown → `notFound()`. Hero · intro bento · highlights · **per-region L2 signature** (North dark-stats · Central heritage-timeline · South delta-postcards) · tours (tabs, `?d=` client-read keeps SSG) · gallery · value-props · **rich Plan-your-trip form** (maps Enquiry model). Replaced per-destination `[slug]`. |
| `/tours` | static | Filterable catalogue: sidebar facets (Destination · Duration · Travel style · Theme) + mobile drawer · sort · `TourCard` grid · empty state. Client-side filter (`filterTours`/`sortTours` from `@tourism/core`) keeps it static. |
| `/tours/[slug]` | **SSG** | `generateStaticParams` from all fixture tour slugs; unknown → `notFound()`. Tour hero · overview · highlights · **itinerary accordion** · what's-included · sticky **BookingBox** (UI-only) · gallery · enquiry. |
| `/about` | static | AboutHero · "Our story" **alternating image timeline** (centre spine + haloed year nodes) · by-the-numbers · team · enquiry. |
| `/contact` | static | ContentHero · **channels** (call/email/WhatsApp action cards) · **two offices + map** · Plan-your-trip form · closing CtaBand. |
| `/faq` | static | Searchable grouped accordion (category icons) · sticky TOC · **FAQPage JSON-LD**. |
| `/privacy`, `/terms`, `/cancellation-policy` | static | Legal documents — complete real content, **not lawyer-reviewed** (fine for the demo). |
| `/blog` · `/blog/[slug]` · `/blog/rss.xml` | ISR (300s) | Journal index (pagination + `?tag=`/`?q=` chips) · markdown article (outline scrollspy + scroll-progress · share row · prev/next · "Updated on") · RSS 2.0 feed. Footer carries a **live newsletter signup** (browser-side `POST /newsletter/subscribe`). |
| `/login` `/register` `/forgot-password` `/reset-password` · `/account/*` | dynamic | Supabase auth + account hub (dashboard · settings · bookings + detail/cancel · saved). |
| `/tours/[slug]/book` · `/checkout/{success,cancel}` | dynamic | Booking flow (Stripe/PayPal + private-departure request). |
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
- **Legal pages** (`/privacy` `/terms` `/cancellation-policy`) are **complete real content** (placeholders filled, draft callout dropped) — **not lawyer-reviewed**, fine for the demo; have counsel review before a real launch.
- **Feedback (2026-07-06):** an app-wide `<Toaster>` (sonner) + `<FlashToaster>` (mounted in
  `app/layout.tsx`) give mutations an outcome toast; `lib/flash.ts` (`resolveFlash`/`flashPath`)
  handles redirect-based Server Actions (ported from admin). Toast = operation outcome
  (success + operation errors); field-level validation stays inline. Lead-capture forms with a
  strong success panel (contact/enquiry family, private-request) keep the panel and toast only
  failures. The two destructive confirms — cancel a PENDING booking, delete account — are
  standardized on `AlertDialog`. Auth flows are excluded (deferred).

## Admin (`@tourism/admin`) — P4

🟢 **CRUD breadth done + DEPLOYED** (Vercel, dev port :3002). Supabase SSR auth + `proxy.ts` gate +
`/auth/admin/sync` allowlist · app shell (sidebar / topbar / theme / user-menu) · dashboard (live
`/admin/stats/dashboard`) · **CRUD: Destinations · Categories · Tours · Departures · Posts** (Server
Components fetch + Server Actions mutate, `@tourism/ui`, tokens-only) · Tours increment-2 sub-forms
(itinerary/FAQs/policies) + shared `MediaField` upload — **done** · **blog-v2 authoring** (tag
combobox · related-tours picker · inline body-image editor w/ Write|Preview) · **Subscribers list +
CSV export** under Operations · media library (`/media` + garbage queue). Remaining (optional):
UI polish pass. 146 tests (2026-07-05).

## Mobile (`@tourism/mobile`) — P5

📝 Scaffold. Expo Router, RN screens, `@tourism/mobile-ui`, reuse `@tourism/core` — fill when P5 lands.
