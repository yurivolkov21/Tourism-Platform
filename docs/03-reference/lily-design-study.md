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
