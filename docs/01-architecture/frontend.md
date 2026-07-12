# Frontend (web · admin · mobile)

> Living doc. Web (P3), admin (P4), and mobile (P5 + P5.5) are all complete and filled in below.

## Shared foundation

- **Tokens:** `@tourism/tokens` → web CSS vars + RN theme (no hex; tokens only). Built with **Style
  Dictionary**; visual direction **"Emerald Heritage"** (deep emerald + ivory + brass, Fraunces serif
  h1–h3 + Geist body, radius `0.375rem`, WCAG AA). `pnpm check:no-hex` enforces tokens-only.
- **Brand:** product name is **"Nexora"** (set in `@tourism/i18n` `brand.name`) — a single "Nexora"
  wordmark carrying the origami two-tone fold (`.nexora-fold`); the standalone "NEX" monogram was
  dropped from the lockup (`ca1cfd0`). "Emerald Heritage" names the *palette/visual direction*, not
  the product.
- **UI:** `@tourism/ui` (web, React) — shadcn on **Base UI** (`base-nova`), 59 components. admin reuses
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
sites prefer `MediaAsset.alt` when the admin has set one (wave D1, 2026-07-11; **web debt wave W1
2026-07-12** added the PAID-booking review form · suitableFor chips · full contact lead set —
247 tests) — an
empty slot or failed fetch renders exactly the previous visuals. Image hosts go through `next/image`
`remotePatterns` (`images.unsplash.com`, `res.cloudinary.com`).

### Routes

| Route | Render | Notes |
| --- | --- | --- |
| `/` | static | Lily-style homepage (hero · destinations bento · experiences · featured · why-choose · trust · blog-teaser · enquiry). |
| `/destinations` | static | Overview: hero · full-bleed region mosaics (feature tiles) · when-to-visit · popular (image posters) · testimonials · travel-tips · enquiry. |
| `/destinations/[region]` | **SSG** (×3) | `generateStaticParams` → northern/central/southern-vietnam; unknown → `notFound()`. Hero · intro bento · highlights · **per-region L2 signature** (North dark-stats · Central heritage-timeline · South delta-postcards) · tours (tabs, `?d=` client-read keeps SSG) · gallery · value-props · **rich Plan-your-trip form** (maps Enquiry model). Replaced per-destination `[slug]`. |
| `/tours` | static | Filterable catalogue: sidebar facets (Destination · Category · Duration · Price) + mobile drawer · sort · **free-text search** (`searchTours` from `@tourism/core`, accent/đ-insensitive, fed by the hero `?q=`) · client-side pagination (10/15/25, TDD `pageView`/`pageNumbers`) · `TourCard` grid w/ **availability badge** ("Only N seats left" at ≤5 · "Next: {date}" · "On request" — never "sold out"; pure `tourAvailability`/`nextDepartureInfo` over BE `nextDepartureDate`/`nextDepartureSeatsLeft`) · empty state. Client-side filter (`filterTours`/`sortTours`) keeps it static. |
| `/tours/[slug]` | **SSG + ISR 300** | `generateStaticParams` from live tour slugs (`fetchTourDetailSlugs`); unknown → `notFound()`. Tour hero · overview · highlights · **itinerary accordion** · what's-included · sticky **BookingBox** (real "Book now" → `/tours/[slug]/book` · "Travel on your own dates" → private request · **seats-left per departure** · wishlist heart for signed-in users) · gallery · enquiry. |
| `/about` | static | AboutHero · "Our story" **alternating image timeline** (centre spine + haloed year nodes) · by-the-numbers · team · enquiry. |
| `/contact` | static | ContentHero · **Contact-01 inquiry** (real hotline/email/location · "Secure payments" self-hosted marks row · real enquiry form → `POST /enquiries` w/ **interest dropdown from live tour categories**, ISR 1h) · **MapLibre map** (lazy) · short FAQ accordion · image CtaBand. |
| `/faq` | static | Searchable grouped accordion (category icons) · sticky TOC · **FAQPage JSON-LD**. |
| `/privacy`, `/terms`, `/cancellation-policy` | static | Legal documents — complete real content, **not lawyer-reviewed** (fine for the demo). |
| `/blog` · `/blog/[slug]` · `/blog/rss.xml` | ISR (300s) | Journal index (pagination + `?tag=`/`?q=` chips) · markdown article (outline scrollspy + scroll-progress · share row · prev/next · "Updated on") · RSS 2.0 feed. Footer carries a **live newsletter signup** (browser-side `POST /newsletter/subscribe`). `/blog/[slug]` `generateMetadata` prefers the post's `metaTitle`/`metaDescription` (admin wave C, 2026-07-11), falling back to `title`/`excerpt`. |
| `/login` `/register` `/forgot-password` `/reset-password` · `/account/*` | dynamic | Supabase auth + account hub (dashboard · settings · bookings + detail/cancel · saved). Booking detail carries the **"Rate this trip" review form** on PAID bookings (wave W1, 2026-07-12): star radiogroup + BE-limit validation, 409 → "already reviewed" panel, success → awaiting-moderation panel. |
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
  account/     dashboard/settings/bookings/saved surfaces
  auth/        login/register/forgot/reset forms
  blog/        journal index · article · outline scrollspy · share row · newsletter signup
  booking/     departure picker · price summary · checkout redirect
  forms/       shared field/error primitives (noValidate + per-field error rendering)
  feedback/    <Toaster>/<FlashToaster> + AlertDialog confirms · LoadErrorState (inline retry) · ErrorState (boundary panel)
  skeletons/   route-level loading placeholders (tours · tour-detail · destinations · blog-list · article · account · checkout)
  seo/         JSON-LD builders + metadata helpers
  about/ contact/ brand/ icons/
lib/           api/ (typed-client wrappers per resource) · account/ · blog/ · booking/ · tours/ ·
               wishlist/ · supabase/ · forms/ (shared + per-flow validators) · site-media.ts ·
               region-imagery.ts · regions.ts (fixture fallback) · slug.ts · flash.ts ·
               resilience.ts (settle/contentState — empty-vs-failed) …
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

- **Live data via the typed client.** `apps/web/src/lib/api/*` wraps the `@tourism/core` OpenAPI
  client per resource (destinations, tours, posts, reviews, wishlist, booking, …); pages fetch through
  it server-side with ISR, not fixtures. Regenerate the client after any BE DTO change (`/regen-types`).
- **`lib/regions.ts` fixtures are a narrowly-scoped fallback**, not the data source: region-page +
  `/destinations` overview imagery derives from `Destination.media[]` via `lib/region-imagery.ts`
  (all-real-or-fixture — a region with real uploaded media renders it, else falls back entirely to the
  static fixture) so a destination never renders a half-real, half-placeholder gallery.
- **Pure logic in `@tourism/core`** (not the app): the app has no unit-test harness for React
  components, and the project TDDs pure logic in shared libs while covering web layout via e2e.
  Example: `groupByRegion`, `getBySlug`, `filterTours`/`sortTours`. The web app itself does carry a
  Jest harness for its own pure `lib/*.ts` helpers (e.g. `region-imagery`, `site-media`, `flash`,
  `paginate`), TDD'd the same way.

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
- **Resilience (2026-07-12, W2):** App Router special files across web — per-route
  `loading.tsx` skeletons (`components/skeletons/*`, split list vs detail so a
  nav never flashes the wrong shape); `app/error.tsx` · `app/not-found.tsx`
  (brand 404) · `app/global-error.tsx` (self-contained) · `checkout/error.tsx`
  (money-path reassurance), all reusing `ErrorState`. Data-fed pages use
  `lib/resilience.ts` `settle()`/`contentState()` to tell a real empty result
  from a fetch failure — an outage renders a `LoadErrorState` (retry via
  `router.refresh()`) instead of a lying "no results" (tours/destinations/blog).
  The deliberate cold-start swallow stays; Home keeps its silent hide (hero +
  static sections prevent a blank page).

## Admin (`@tourism/admin`) — P4

🟢 **P4 complete + DEPLOYED** (Vercel, dev port :3002). Current surfaces:

- **Shell & auth** — Supabase SSR auth + `proxy.ts` gate + `/auth/admin/sync` allowlist · app
  shell (sidebar / topbar / theme / user-menu) · dashboard (live `/admin/stats/dashboard`,
  preset/custom date-range filter, per-currency stats).
- **CRUD** — Destinations · Categories · Tours (+ itinerary/FAQs/policies sub-forms) ·
  Departures · Posts (Server Components fetch + Server Actions mutate, `@tourism/ui`,
  tokens-only), all sharing a `MediaField` upload with a "choose from library" reuse picker ·
  **blog-v2 authoring** (tag combobox · related-tours picker · inline body-image editor).
- **Users management** — `/users` list (role/search filter) · `/users/[id]` detail with
  footprint counts · role change and delete via a danger-zone confirm · `/users/me`
  self-profile.
- **Operations** — Subscribers list + CSV export · `/cancellation-requests` queue ·
  `/payment-events` webhook viewer · outbox delete · media library (`/media` + garbage queue,
  bulk delete, alt editor) · **Appearance** (`/appearance` brand-chrome slot manager, 9 slots).
- **CRM & money** — refund execution (partial amount + proactive-refund safeguard) · reviews
  CRM (server-driven facets, curated-review create/edit/delete/feature) · enquiry CRM (notes
  thread + repeat-lead badges).
- **Shared UI stack** — sortable `AdminTableShell` + `ColumnsMenu` (persisted column
  visibility) + `FacetFilter` + `TabPills` (`components/crud/`) · motion layer (route
  skeletons, KPI count-up, route fade, sidebar pill) · form-validation sweep (`noValidate` +
  per-field server errors — standing rule).

History: see [CHANGELOG](../CHANGELOG.md).

264 tests (2026-07-12).

## Mobile (`@tourism/mobile`) — P5

🟢 **P5 (W1→W4) + P5.5 (N1→N3) COMPLETE.** Expo Router (SDK 54) app over a **5-tab** shell —
**Home · Explore · Saved · Trips · Account** (`app/(tabs)/`) — consuming the same
`@tourism/core` typed client + TanStack Query as web/admin.

- **Browse & detail** — task-first Home (greeting · search pill → Explore autofocus ·
  signed-in next-trip/recently-saved rails · featured + destinations shelves); Explore
  (instant client-side search/filter/sort + an `AppSheet` filter drawer); tour detail at web
  parity (gallery pager, seats-left, accordions, reviews, sticky Inquire CTA).
- **Auth & wishlist** — guest-first Supabase auth (AsyncStorage session + `AppState`
  auto-refresh, `/auth/sync` after sign-in) via 3 auth screens (sign-in/up/forgot); wishlist
  (optimistic `useWishlist` + `HeartButton`, guest tap → sign-in) surfaced on its own Saved
  tab; bookings live on a dedicated **Trips** tab (booking detail is a stack screen); Account
  carries profile edit + sign-out.
- **Booking (money path)** — stepped, Airbnb-style booking sheets (`DepartureSheet` → contact
  → payment) driven by a `BookingDraft` context; pricing/validation logic ported **verbatim**
  from web (`booking-form.ts`/`price.ts`, TDD); checkout opens the provider's hosted page via
  `expo-web-browser`, then a **self-verifying result screen** refetches the booking (idempotent
  PayPal capture-on-return) — Android's `openBrowserAsync` resolves immediately, so the same
  verify also fires on `AppState` return-to-foreground.
- **Design system** — `@tourism/mobile-ui` (RN, themed off `@tourism/tokens/theme`): Button,
  Card, TextField, Chip, Accordion, Badge, Skeleton, `AppSheet` (bottom-sheet wrapper), native
  motion (reanimated, Android ripple, haptics) — **34 tests**.

⚠️ **Owed:** a combined on-device pass (Stripe test card · PayPal sandbox · abandon→pay-now ·
cancel/cancellation-request · guest gating) across N1–N3 + W4 hasn't run yet — feature work
itself is complete. **153 tests** (`apps/mobile`).
