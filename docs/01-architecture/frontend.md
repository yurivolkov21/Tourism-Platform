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
(ISR). **Region-page + `/destinations` overview imagery now derives from `Destination.media[]`**
(`lib/region-imagery.ts`, all-real-or-fixture — a region with real uploaded media renders it, else
falls back entirely to the `lib/regions.ts` fixture). The **brand-chrome** imagery (home hero,
experiences/why-choose/trust, about/FAQ/legal/CTA heroes, `/destinations` hero, auth panel) is now
**admin-managed** via the site-media Appearance surface (2026-07-10): components resolve their slot
through `getSiteMedia()` (`GET /site-media`, ISR 300s) + `siteImage`/`siteGallery`
(`lib/site-media.ts`, TDD) and keep the curated real-Vietnam photos as per-slot **fallbacks**; render
sites prefer `MediaAsset.alt` when the admin has set one (wave D1, 2026-07-11 — 232 tests) — an
empty slot or failed fetch renders exactly the previous visuals. Image hosts go through `next/image`
`remotePatterns` (`images.unsplash.com`, `res.cloudinary.com`).

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
| `/blog` · `/blog/[slug]` · `/blog/rss.xml` | ISR (300s) | Journal index (pagination + `?tag=`/`?q=` chips) · markdown article (outline scrollspy + scroll-progress · share row · prev/next · "Updated on") · RSS 2.0 feed. Footer carries a **live newsletter signup** (browser-side `POST /newsletter/subscribe`). `/blog/[slug]` `generateMetadata` prefers the post's `metaTitle`/`metaDescription` (admin wave C, 2026-07-11), falling back to `title`/`excerpt`. |
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

🟢 **P4 complete + DEPLOYED** (Vercel, dev port :3002). Supabase SSR auth + `proxy.ts` gate +
`/auth/admin/sync` allowlist · app shell (sidebar / topbar / theme / user-menu) · dashboard (live
`/admin/stats/dashboard`) · **CRUD: Destinations · Categories · Tours · Departures · Posts** (Server
Components fetch + Server Actions mutate, `@tourism/ui`, tokens-only) · Tours increment-2 sub-forms
(itinerary/FAQs/policies) + shared `MediaField` upload · **blog-v2 authoring** (tag combobox ·
related-tours picker · inline body-image editor w/ Write|Preview) · **Subscribers list + CSV
export** under Operations · media library (`/media` + garbage queue) · **refund execution +
cancellation-request queue** (partial amount + proactive-refund safeguard · `/cancellation-requests`)
· **form-validation sweep** (all forms `noValidate` + per-field server errors — standing rule) ·
**motion layer** (`components/motion/` Reveal/Stagger · 13 route skeletons · KPI count-up · route
fade · sidebar `layoutId` pill; RTL tests enabled) · **Appearance** (`/appearance` brand-chrome slot
manager, 9 slots) · **list-table stack** (`components/crud/`: `AdminTableShell` w/ sortable headers
(`accessorFn` opt-in, `aria-sort`) · `ColumnsMenu` + per-table localStorage persistence
(`lib/table-prefs.ts` + `usePersistentColumnVisibility`) · shared `FacetFilter` · client/server
pagination adapters; Tours destination/featured filters · Bookings tour/departure URL filters +
chips · Departures Upcoming·Past·All facet) · **reviews + enquiry CRM (2026-07-11)** — reviews
list server-driven (status/source/rating/search facets) + `/reviews/[id]/edit` shared form +
drawer customer/booking links; enquiries drawer notes thread + repeat-lead badges · **wave C
(2026-07-11)** — booking breakdown card + tab counts · post SEO/schedule UI · self-profile ·
subscriber remove + outbox delete · `/payment-events` viewer · **media library upgrade (wave D1,
2026-07-11)** — library reuse picker in MediaField · drawer alt editor · bulk selection/delete ·
**wave D2 (2026-07-12)** — shared **`TabPills`** (`components/crud/tab-pills.tsx`, button +
RSC-safe `<Link>` variants w/ count badges; all 13 copy-pasted tablists across 11 files
migrated byte-identically; post-form Write|Preview stays hand-rolled) · **dashboard
date-range** (preset pills + custom `Calendar` range popover → URL `?from&to`; TDD
`lib/dashboard/date-range.ts`; `today` resolves post-mount to stay hydration-safe) ·
per-currency stats render (extra-currency KPI footnote · per-row Top-Tours currency ·
AOV divides by the dominant currency's paid count).
260 tests (2026-07-12).

## Mobile (`@tourism/mobile`) — P5

📝 Scaffold. Expo Router, RN screens, `@tourism/mobile-ui`, reuse `@tourism/core` — fill when P5 lands.
