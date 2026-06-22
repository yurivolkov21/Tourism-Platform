# Reference design study — Lily's Travel Agency (lilystravelagency.com)

**Date:** 2026-06-21 · Purpose: understand the reference site's IA + page patterns so our P3 web is
**consistent and intentional**, not reactively copied. Observations are of layout/structure (not content).

> Donor `tourism-be-api` is the *backend* reference; this is the *design/UX* reference. We adopt the
> **information architecture + page patterns**, then express them through our **Emerald Heritage**
> (light-luxury) brand — not a 1:1 visual copy.

## Information architecture (the big takeaway)

**Geographic, place-led hierarchy:** `Region (North / Central / South [+ Cambodia]) → Destination →
Tours/Packages`. Discovery starts from a *place that calls to you*, then drills into itineraries.
This maps cleanly onto our schema: `Destination(region, name, slug)` ⇄ `Tour` (M:N), `TourCategory`.

## Page-by-page patterns

**Homepage** — pragmatic/trust-heavy (more transactional than minimal):
dual header (top contact/social bar + main nav with a "Tours & Service" mega-dropdown + persistent
"Book Here") · full-bleed hero with a search CTA · "Famous Destinations" 6-card grid · "Best Packages"
horizontal carousel (price-anchored cards + "Book Now") · awards/trust carousel · review badges
(TripAdvisor/Google) · travel blog grid · footer with a large enquiry form.

**Tours overview** (`/tours-in-vietnam/`) — **editorial, place-led, minimal** (the look the user liked):
3 region blocks, each = short region intro + a **3+1 tile grid** (3 destinations + a "More <region>"
tile). Each tile = large image + destination name + a **one-line atmospheric tagline** (e.g. a short
evocative phrase) + "View More". Imagery-forward, generous whitespace, **no prices/logistics** — built
for inspiration, not conversion.

**Regional page** (`/northern-vietnam-tours/`): region intro → value props ("We've got you covered":
transfers / unique itineraries / meals) → "Travel guarantee" trust list → tours → enquiry form.

**Tour detail** (`/product/<slug>/`) — detail-rich, conversion-oriented:
hero banner + breadcrumb · **meta strip** (price→discounted, score/rating, start/end, places, meals,
departure) · image gallery · **2-column**: left = overview + value highlights + **day-by-day itinerary**
(expandable text blocks) + inclusions + policy; right = **sticky booking box** (price + "Inquire"/"Book")
· related tours (4-col) · enquiry forms · sticky WhatsApp.

**About** (`/about-us/`): founder hero (photo + tagline) · four-pillar values grid · leadership/team
carousels · growth timeline (alternating left/right) · team-culture photo galleries · footer form.
Human-centered, trust-building.

## Recurring system patterns

- **Lead-gen is central:** an enquiry form ("organise your dream trip") recurs on nearly every page →
  we have the `Enquiry` model; plan a reusable enquiry form/section.
- **Trust signals everywhere:** awards, review badges, a travel guarantee, founder/team → reviews exist
  (`Review` model); plan trust elements.
- **Price anchoring:** struck original → discounted → we have `compareAtPrice` for exactly this.
- **Place-led nav** + atmospheric one-line taglines per destination.
- **Sticky booking box** (detail) + sticky contact.
- **Visual:** clean card-based, mostly sans type (serif used sparingly for emotional headers), neutral +
  one accent on CTAs; imagery contained in cards on the homepage but **image-forward** on the editorial
  tours overview.

## What we adopt vs. how we differ (Emerald Heritage)

**Adopt:**

- The **place-led IA** (Region → Destination → Tours). Our homepage "Explore by destination" section
  already follows the editorial tours-overview pattern → keep it; refine to **group by region** and add a
  **one-line atmospheric tagline** per destination tile.
- **Two-tier card philosophy:** *editorial/minimal* on inspiration surfaces (home, destination overview =
  image + name + tagline); *detail-rich* on the tours **listing** + tour **detail** (price/itinerary/meta
  → our `TourCard` belongs here).
- The **tour-detail blueprint** (hero + meta strip + gallery + 2-col with sticky booking + day-by-day
  itinerary + inclusions + related + enquiry) for a later P3 page — maps to `Tour` (itinerary, inclusions,
  departures, policies, faqs).
- A reusable **enquiry** section + **trust** elements (reviews, guarantee).

**Differ (elevate to light luxury):** more imagery + whitespace, **Fraunces serif** display headings,
**restrained price-shouting** on inspiration pages, our **emerald/ivory/brass** palette (vs generic sans +
accent), and motion as a later consistent pass. Less "DMC corporate", more boutique-editorial.

## Suggested P3 page set (derived)

1. **Home** — hero · Explore by destination (region-grouped editorial) · why-us (features) · featured
   journeys (minimal) · trust/reviews · enquiry CTA · footer.
2. **Destinations overview** — region-grouped editorial tiles (place-led).
3. **Destination page** — destination intro + its tours (TourCard listing).
4. **Tours listing** — filterable `TourCard` grid (the e-commerce tier).
5. **Tour detail** — the blueprint above.
6. **About**, **Contact/Enquiry**.

Out of scope of this doc: implementation — this is the shared mental model to build against.

---

## Live-crawl deep-dive (2026-06-22)

Confirmed by browsing the live site + reading `sitemap_index.xml`. The earlier sections stay valid;
this adds **concrete URL patterns, the tour taxonomy/facets, and the content model**.

### Confirmed IA + URL patterns

```text
HOME (/)
├─ Tours & Service (mega-menu)
│  ├─ All Destinations ........ /tours-in-vietnam/        overview: 3 region blocks
│  │   └─ Region page ......... /{northern|central|southern}-vietnam-tours/
│  │        └─ Destination/theme landing ... /ha-long-bay-cruises/ · /tours-in-sapa/ ·
│  │             /ninh-binh/ · /hue/        (SAME landing template, narrower scope)
│  │             └─ Single tour ............ /project/{slug}/   (enquiry-based)
│  ├─ Package Tour ........... /lilys-package-tour/       filterable LISTING
│  │   └─ Multi-day package .. /product/{slug}/           WooCommerce (online booking)
│  └─ Promotional Tour ....... /promotional-tour/ · /promotion-tours/
├─ Travel Insight ........... /travel-insight/ → /{post-slug}/   BLOG hub
├─ Tips .................... /tips-for-viet-nam/ · /vietnam-travel-advice/
├─ About ................... /about-us/ · /meet-our-team/ · /who-is-lily-nguyen/ · /services/ · /gallery/
├─ Book/commerce .......... /book-here-now/ · /shop/ · /cart/ · /checkout/ · /my-account/
└─ Footer ................. /faqs/ · /privacy-statement/ · /terms-conditions/ · /contact/
```

### Page-template catalog (reusable shells)

| Template | Examples | Key blocks |
| --- | --- | --- |
| **Overview** | `/tours-in-vietnam/` | hero + 3 region blocks (heading + intro + feature tile + "View More") + popular tours |
| **Landing** (region / destination / theme — one shell) | region pages · `/ha-long-bay-cruises/` · `/ninh-binh/` · `/tours-in-sapa/` | hero + "THE BEST … " intro + (vlogs) + **tour grid** + "We've got you covered" (3 value props) + guarantee + enquiry |
| **Tours listing** | `/lilys-package-tour/` | hero + trust badges (30% deposit · free hold · free changes) + **filter sidebar** + card grid + "5 reasons" |
| **Tour detail** | `/project/{slug}/` (enquiry) · `/product/{slug}/` (booking) | title + badge (Best seller / Likely to sell out) + **day-by-day itinerary** (meal codes L/D/B) + Note + Includes/Excludes + "You might also like" |
| **Blog hub / post** | `/travel-insight/` · `/tips-for-viet-nam/` | H1 + post grid + sidebar (Recent Posts · Categories) |
| **About / team** | `/about-us/` · `/meet-our-team/` | founder hero + values + team + timeline |

### Tour taxonomy (the "Filter by" facets) — from the sitemap

Lily classifies tours on **five dimensions** (WordPress taxonomies → archive pages + listing filters):

| Facet (`/tour-…/`) | Values | Maps to our schema |
| --- | --- | --- |
| **destination** | hanoi · halong-bay · sapa · ninh-binh · mai-chau · pu-luong · hue · da-nang · hoi-an · nha-trang · ho-chi-minh-city · mekong-delta · phu-quoc · cu-chi-tunnel (~14) | `Destination` (M:N) ✅ |
| **travel-styles** | cultural-heritage · adventure-nature · luxury-high-end · relax-wellness · mice-business-travel | `TourCategory` ✅ |
| **theme** | couple · family · friend · company | `TravellerType` / `suitableFor` ✅ (P1.7e) |
| **duration** | 1-day · 2-days · 3-days · 4-6-days · 7-days · 11-15-days · over-15-days | `Tour.durationDays` (bucketed) ✅ |
| **type** | authentic · modern · boutique | no direct field (tag/category) |

**Takeaway:** our P1 schema already covers 4 of Lily's 5 tour facets — the filterable `/tours` listing
is well-supported by existing data (`Destination`, `TourCategory`, `TravellerType`, `durationDays`).

### Content model + scale

- **Two tour post types:** `/project/{slug}` = single/short tours (enquiry-led, listed on landing
  pages) · `/product/{slug}` = **31** multi-day packages (WooCommerce → real `/shop /cart /checkout
  /my-account`, online booking). *We currently model one `Tour` concept — decide whether to mirror the
  split or treat "package" as a long-duration tour.*
- **Blog is huge:** ~**928** posts across 5 sitemaps (heavy SEO play) + **45** blog categories.
  Confirms blog/content (our P6) is a first-class, high-volume surface for them — ours is editorial
  (agency-authored), so we won't match volume, but the **hub + categories + sidebar** pattern applies.
- **43** team members (people-heavy trust). Multilingual (EN + Chinese).

### Implications for our build (updates the P3 plan)

1. **Add a region-landing layer** (the user's ask): `/destinations` overview → **region page** (N/C/S)
   → tour detail. The landing template = our existing `/destinations/[slug]` shell (hero + intro +
   tours + value-props + enquiry) — reuse it for regions *and* destination/theme landings.
2. **Tours listing with facet filters** (`/tours`): build the filter sidebar around our existing facets
   (destination · category · traveller-type · duration). This is the "booking tier".
3. **Tour detail** (`/tours/[slug]`): itinerary (day-by-day + meal codes) + includes/excludes + related
   — maps to `Tour` (itinerary, included/excluded, departures, policies, faqs).
4. **Defer** blog (P6) + online-checkout/account (later P3/P4) — but the IA slots exist.
