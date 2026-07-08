# P5.5 Mobile — App-native UX pass (umbrella design)

- **Date:** 2026-07-08
- **Status:** Draft — pending user review
- **Scope:** 3 waves (N1 Feel · N2 Patterns · N3 IA & Home), each its own
  branch + plan, executed in order N1 → N2 → N3.
- **Context:** P5 W1–W4 shipped the full feature set ("Brand 100% +
  Structure native"), but the UX/UI audit (2026-07-08, reported in-session)
  found the *insides* of most screens still think like a website. This phase
  re-works structure and feel WITHOUT touching the data layer or the API.
- **Prerequisite debt:** the W4 **on-device payment pass** is still owed —
  run it before or alongside N1, because N2 rebuilds the booking screens it
  verifies.

## Locked direction (user decisions, 2026-07-08)

1. **5 tabs:** Home · Explore · **Trips** · Saved · Account — bookings get
   their own tab (Airbnb/Booking convention) instead of hiding two levels
   deep in Account.
2. **Home drops the full-bleed hero** → search-first, patterned after real
   mobile apps (reference gathering in N3; no Figma MCP connected in-session
   — use GitHub/web references, plug Figma in later if the user connects it).
3. **Booking = full Airbnb-style stepped flow** (not just a sheet band-aid).
4. **Wave order N1 → N2 → N3** (feel first: cheapest, most visible).
5. **New deps approved:** `@gorhom/bottom-sheet` + `react-native-reanimated`
   (+ `react-native-gesture-handler`, required by bottom-sheet). All are
   Expo Go-compatible.

## Design principles (carried from the audit)

- **Task-first test:** every element must serve the task of someone holding
  a phone; web conversion furniture (why-strips, CTA bands, marketing hero)
  is removed, not restyled.
- **Material-first:** Android is the test platform — ripple, bottom sheets,
  native headers; iOS parity via the same primitives (no platform forks
  unless a convention demands it).
- **Brand stays 100%:** Fraunces/Geist, Emerald Heritage tokens, no hex.
  Native structure ≠ losing identity — e.g. stack headers styled with
  `headerTitleStyle.fontFamily`.
- **Zero backend/data-layer changes.** `lib/booking.ts`, query keys, and the
  126-test data-layer suite stay as-is; waves only re-shape presentation.

---

## Wave N1 — Feel (touch, motion, system chrome)

No structural changes; every screen keeps its layout. ~2–3 sessions.

1. **Native stack headers** — flip `headerShown: true` for stack screens
   (book · bookings list · booking detail · saved-from-account is a tab, so
   n/a), styled: Fraunces title via `headerTitleStyle`, themed background,
   no shadow. Remove the hand-rolled back-arrow headers those screens carry.
   **Tour detail + gallery keep the overlay** (image-first screens, correct
   as-is). Result screen: `headerShown: false` stays (full-bleed status
   moment, no back affordance wanted mid-verify).
2. **Ripple** — Android pressed feedback via `android_ripple` on every
   Pressable surface (mobile-ui Button/Chip/Accordion trigger + app-side
   MenuRow, cards, rows); keep the opacity fallback for iOS.
3. **Haptics** — `expo-haptics` at meaningful moments only: heart toggle
   (selection), booking PAID confirmation (notification success), destructive
   confirms (warning). No haptics on plain navigation.
4. **Motion** — `react-native-reanimated`: skeleton→content crossfade
   (entering `FadeIn`), accordion expand/collapse (layout transition), chip
   select state, result-screen success checkmark scale-in. Small, systemic,
   no choreography.
5. **Images** — `expo-image` `placeholder` (blurhash/thumbhash or tinted) +
   `transition` on hero/gallery/cards; kills the white pop-in.
6. **Shadows** — Card's legacy `shadow*`/`elevation` → `boxShadow` (RN 0.81
   supports it; per current Expo guidance).
7. **Forms & keyboard** — `autoComplete`/`textContentType` on auth + booking
   contact fields (Android autofill + password managers), `returnKeyType`
   chaining, keyboard avoidance on screens with sticky footers,
   `<Text selectable>` on booking codes.

Testing: mobile-ui primitive specs extend (ripple props, animated presence);
jest needs `react-native-reanimated/mock` in test-setup. Existing screen
specs must stay green (headers change = update queries only).

## Wave N2 — Patterns (sheets, stepped booking, disclosure)

~3–4 sessions. Depends on N1's deps + header baseline.

1. **Bottom-sheet infra** — `@gorhom/bottom-sheet` provider + a themed
   `AppSheet` wrapper in `@tourism/mobile-ui` (background/handle/typography
   from tokens).
2. **Explore filter sheet** — collapse the 3 chip rails into: 1 compact
   applied-filters row + a Filter button (badge = active count) opening a
   sheet with all facets + live "Show N results" CTA. Search bar gains a
   clear button; result count shown.
3. **Stepped booking flow (Airbnb-style)** — replaces the single long form:
   - **Step 0 (sheet, from tour detail):** departure picker + travellers
     steppers + live total → "Continue".
   - **Step 1 (screen):** contact details (prefilled) + special requests.
   - **Step 2 (screen):** payment method + order summary → "Confirm & pay"
     → existing createBooking→checkout→result pipeline **unchanged**.
   - Progress affordance across steps; state lives in a small in-memory
     store (context) so back edits nothing server-side; abandoning discards.
4. **Enquiry → sheet** (currently a full modal screen).
5. **Progressive disclosure on detail** — itinerary/FAQ accordions → first
   items + "Show all" push screens (`tours/[slug]/itinerary`, `/reviews`);
   reviews section gains "See all".

Testing: sheet interactions via mocked bottom-sheet in RNTL; stepped-flow
state machine = pure logic → TDD; booking pipeline specs unchanged (same
payload builder + mutations).

## Wave N3 — IA & Home (5 tabs, task-first Home)

~2–3 sessions. Last because it depends on N2's sheet/search patterns.

1. **5 tabs** — add **Trips** (bookings list moves out of Account; booking
   detail stays a stack screen). Account keeps profile/settings/legal/sign
   out (+ a link back to Trips for muscle memory, one release).
2. **Home task-first rebuild** — structure (final layout decided against
   references gathered at design time): greeting + prominent search field
   (→ Explore autofocus) · contextual row when signed in (next upcoming
   trip card → Trips detail; recent saved rail) · featured tours shelf ·
   destinations rail. **Removed:** full-bleed hero, why-strip, CTA band.
3. **Reference step** — before layouting, collect 3–5 real patterns
   (GitHub open-source travel apps, Mobbin-style web refs; Figma MCP if the
   user has connected one by then) and confirm the pick with the user.

Testing: tab layout spec + Home states; Trips tab reuses the bookings list
spec nearly verbatim.

## Out of scope (unchanged backlog)

Native payment SDKs · maps · push notifications · "Browse by experience"
section · dark-mode splash/adaptive-icon assets · in-app theme toggle ·
store builds (EAS). Data layer, API, and web/admin untouched.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Reanimated/gesture-handler break jest | `react-native-reanimated/mock` + gesture-handler jest setup in `test-setup.ts`; land deps in N1 with the mock wired before any usage. |
| Header flip breaks existing screen specs | Specs assert content, not chrome — update queries only; do headers as N1 task 1 so later tasks build on green. |
| Stepped flow regresses the verified money path | The N2 flow re-uses `buildCreateBookingPayload`/`createBooking`/`startCheckout` verbatim; adversarial re-review of the step state machine before merge (money-path rule). |
| Sheet lib version drift with SDK 54 | Install via `pnpm exec expo install` where possible; pin exact versions; verify in Expo Go before building on top. |
| W4 payment debt compounds | Run the deferred on-device payment pass before merging N2. |

## Process

Per wave: spec addendum if scope shifts → plan (`docs/07-plans/`) → inline
execution (standing rule) → `/gate` → on-device pass → user merge approval →
docs sweep. N1 branch: `feat/mobile-n1-feel` (this spec lands there).
