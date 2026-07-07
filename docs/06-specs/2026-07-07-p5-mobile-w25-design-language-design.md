# P5 mobile — Wave 2.5: Mobile Design Language (Nexora look for the Expo app)

- **Date:** 2026-07-07
- **Phase:** P5 (mobile), inserted wave between W2 (browse & detail, merged
  2026-07-07) and W3 (auth & account). Pure **look & feel** — no behaviour or
  data changes.
- **Scope:** `apps/mobile` (every existing screen restyled) · `libs/mobile/ui`
  (fonts wired into the theme + 2 new primitives + Card polish) ·
  `@tourism/i18n` (a few `mobile.*` additions; web sections reused as-is).
  **No backend changes. No new native modules** (Expo Go constraint holds).
- **Why now (user decision 2026-07-07):** the W1/W2 skeleton uses the right
  tokens but none of the brand's design language — fonts, hero, badges,
  section rhythm. Doing the design pass before W3/W4 means those waves are
  born styled instead of needing a second pass.
- **Process:** branch `feat/mobile-w25-design-language`, main checkout,
  executed **inline** (no implementation subagents).

## Locked decisions (brainstorming 2026-07-07)

1. **Same design language, native patterns.** Port the web's DNA (Fraunces +
   Geist, hero + scrim, card badge/rating/compare-at anatomy, pill chips,
   eyebrow-heading section rhythm) but keep app-native structure: tab bar (no
   web navbar/footer), sticky CTAs, pull-to-refresh, press states.
2. **Full existing surface**: Home · Explore · Tour detail · Enquiry modal ·
   tab bar · Saved/Account placeholders. W3/W4 inherit the language.
3. **Fonts = Fraunces + Geist, full set**, via `expo-font` +
   `@expo-google-fonts/fraunces` + `@expo-google-fonts/geist` (verified on
   npm: 0.4.1 / 0.4.2). Splash holds until fonts load.
4. **Home = 5 curated sections**: Hero (image + scrim + search pill →
   Explore) · Featured tours shelf · Destinations rail (tap → Explore with
   the destination filter preset) · Why-Nexora strip · CTA band. (Web's
   TechCloud/blog/testimonials etc. are deliberately not ported.)

## Verified facts (2026-07-07)

- Web typography: `Geist` (`--font-sans`) + `Fraunces` (`--font-heading`) via
  `next/font/google` (`apps/web/src/app/layout.tsx:18-19`); h1/headings render
  Fraunces, body Geist.
- Web hero (`components/marketing/hero.tsx`): full-bleed curated Unsplash
  Vietnam image (`photo-1634951412593-b2cdca1ae519`) · `bg-overlay/50` scrim ·
  eyebrow pill (Badge + text, `bg-background/10` + border) · bold Fraunces
  headline · subtitle · rounded-full search pill posting to `/tours`.
- Web tour card (`components/tours/tour-card.tsx`): image `aspect-(--aspect-card)`
  with **badge overlay top-left** (tone map: BEST_VALUE→success,
  LIMITED_OFFER→warning, EXCLUSIVE→primary, NEW→info, POPULAR→rating) · meta
  row with MapPin/Clock icons · `text-lg font-semibold` title clamped to 2
  lines with reserved height · star (rating tone, filled) + `4.9` + `(214
  reviews)` + availability · footer "From" caption + price + compare-at
  strikethrough.
- Shared i18n already has everything the new sections need: `messages.hero.*`
  (eyebrow/title/subtitle/search) · `messages.featuredTours.*` (heading,
  subtitle, from/daysLabel/reviewsLabel + **`badges` labels for all 5 enum
  values**) · `messages.destinations.heading/subtitle/toursLabel` ·
  `messages.features.*` ("Why travel with us", `items[]` of title+description).
  EN-only catalog is platform-agnostic — mobile imports the same sections.
- Mobile theme (`libs/mobile/ui/src/lib/theme.ts`): `typography` variants have
  `fontSize/fontWeight/lineHeight` only — **no `fontFamily`** (system Roboto
  today). Colors already carry the web palette incl. `success/warning/info/
  rating/overlay` families (tokens `rn-theme` emits every CSS var).
- `TourCardVm` (`apps/mobile/src/lib/tours.ts`) has no `badges` field;
  `TourSummaryDto.badges` exists (enum array) — mapper extension needed.
- Explore's filter state is local `useState` (`defaultExploreState`) — a
  route-param preset needs an initializer that reads `useLocalSearchParams`.
- Tab bar (`(tabs)/_layout.tsx`) uses outline Ionicons only, no focused
  variant; labels default font.
- Expo Go: `expo-font` + `@expo-google-fonts/*` + `expo-splash-screen` are all
  Go-compatible; no dev-client needed.

## Design

### 1. Typography foundation (`libs/mobile/ui` + root layout)

- New deps (app): `expo-font`, `expo-splash-screen` (via `npx expo install`),
  `@expo-google-fonts/fraunces`, `@expo-google-fonts/geist` (pnpm add, exact
  static font files).
- Theme (`theme.ts`): `TypographyVariant` gains `fontFamily: string`; a
  `fonts` constant maps roles → PostScript names:
  - `display` → `Fraunces_700Bold` (28/34) · `title` → `Fraunces_600SemiBold`
    (20/26) · `body` → `Geist_400Regular` (15/22) · `caption` →
    `Geist_500Medium` (12/16).
  - `buildTheme` also exposes `theme.fontFamilies = { heading, headingBold,
    sans, sansMedium, sansSemiBold }` for one-off uses (Button/Chip labels →
    `Geist_600SemiBold`, prices/bold body → `Geist_600SemiBold`).
  - RN needs the **exact loaded font name per weight** — `fontWeight` styles
    stop mattering for custom fonts; components that bolded via
    `fontWeight: '600'` switch to the proper family (AppText handles the
    variants; Button/Chip/price rows set `fontFamily` explicitly).
- `AppText` applies `fontFamily` from the variant automatically → every
  existing screen re-brands without per-screen edits.
- Root `_layout.tsx`: `useFonts({ Fraunces_600SemiBold, Fraunces_700Bold,
  Geist_400Regular, Geist_500Medium, Geist_600SemiBold })` +
  `SplashScreen.preventAutoHideAsync()` / `hideAsync()` when loaded — no
  unstyled-text flash.

### 2. New/updated primitives (`@tourism/mobile-ui`)

- **`Badge`** (new): small pill, `tone: 'primary' | 'success' | 'warning' |
  'info' | 'rating'` (default `primary`), themed bg + `*-foreground` text
  (`rating` uses `foreground` like web), Geist SemiBold caption. Test: tone →
  color mapping + renders label.
- **`Skeleton`** (new): themed `muted` block with a looping opacity pulse
  (`Animated.loop`, `useNativeDriver: true` — Go-safe); props
  `width/height/borderRadius/style`. Test: renders with testID (animation not
  asserted).
- **`Card`**: adds a soft shadow (iOS `shadow*` + Android `elevation: 2`,
  shadow color from `foreground` at low opacity) — matches web's resting card
  depth. Existing tests keep passing (style merge preserved).
- Primitives stay product-agnostic; composites live in the app.

### 3. App-level shared components (`apps/mobile/src/components/`)

- **`SectionHeading`**: eyebrow caption (uppercase, muted, Geist Medium,
  letter-spacing) + Fraunces title + optional subtitle — the section rhythm
  from web (`featuredTours.heading/subtitle` etc.).
- **`TourCard` redesign** (both variants):
  - image ratio 4:3 (`aspectRatio: 4/3` instead of fixed heights), badge
    overlay top-left (`Badge` per VM badge, web tone map);
  - meta row: `location-outline` + destination · `time-outline` + duration
    (Ionicons, muted, 14);
  - title: Geist SemiBold 17/24, 2-line clamp with reserved `minHeight` (web's
    equal-height trick);
  - rating row: filled `star` icon in `rating` color + `4.9` +
    `(214 reviews)`; list variant adds a seats-left `Badge` (warning tone)
    when `nextDepartureSeatsLeft ≤ 5` — **requires `nextDepartureSeatsLeft`
    on the VM** (mapper extension alongside `badges`);
  - footer: "From" caption + price (Geist SemiBold 18) + compare-at
    strikethrough caption.
  - `TourCardVm` gains `badges: TourBadgeKey[]` + `nextDepartureSeatsLeft?:
    number` (`toTourCardVm` maps `dto.badges ?? []`, seats; TDD).
- **`DestinationCard`**: 140×180 rounded image, bottom gradient scrim
  (no `expo-linear-gradient` — a semi-transparent `overlay` View band is
  enough and dependency-free), name in Geist SemiBold on media + tours count
  caption when available.

### 4. Home rebuild (`(tabs)/index.tsx`)

Order: **Hero → Featured → Destinations → Why → CTA** (single scroll, existing
pull-to-refresh keeps working; hero is full-bleed so the screen switches to a
`Screen scroll={false}` + own ScrollView with zero top padding, like detail).

1. **Hero** (~52% of screen height): full-bleed `expo-image` (same curated
   Unsplash URL as web, documented as shared brand-chrome) · `overlay`-token
   scrim at 50% · eyebrow pill (`Badge` + `hero.eyebrowText` on
   translucent pill) · `hero.titleLead/Accent/Tail` as one Fraunces Bold
   headline (30/36, `primary-foreground`-on-media color) · `hero.subtitle`
   (Geist, 85% opacity) · **search pill**: rounded-full `background` row with
   search icon + `hero.searchPlaceholder` (muted) + primary round CTA — a
   `Pressable` that routes to `/explore` (real input lives there; param
   `focusSearch=1` triggers autofocus).
2. **Featured tours**: `SectionHeading(featuredTours.heading, subtitle)` +
   existing horizontal shelf with the redesigned cards.
3. **Destinations**: `SectionHeading(destinations.heading, subtitle)` +
   horizontal rail of `DestinationCard` (reuses W2 `fetchDestinations`; adds
   nothing to the API) — tap routes to `/explore?destination=<name>`.
4. **Why Nexora**: `SectionHeading(features.heading)` + first 3
   `features.items` as icon rows (Ionicons `map-outline`,
   `shield-checkmark-outline`, `people-outline`) with title + description.
5. **CTA band**: primary-bg rounded Card — Fraunces title
   (`enquiryCta`-style copy: new `mobile.home.ctaTitle/ctaSubtitle/ctaButton`
   keys) + inverted Button → `/explore`.

The old text-only greeting header is replaced by the hero. `StatusBar` stays
`auto`; the hero renders under the (translucent) status bar like detail's
gallery.

### 5. Explore / Detail / Modal polish (`(tabs)/explore.tsx`, `tours/[slug]/*`)

- **Explore**: title block becomes `SectionHeading`; search `TextField` gets a
  leading search icon (TextField gains optional `leading?: ReactNode` slot —
  small additive prop, test updated); reads route params:
  `destination` presets the filter chip state, `focusSearch` autofocuses the
  input. A pure `initialExploreState(params, defaultState)` helper (TDD) maps
  params → `ExploreState` so the screen stays thin.
- **Detail**: title → Fraunces display; facts row icon-ified (`time-outline`,
  `people-outline`, `walk-outline`); rating line uses the filled star icon;
  section headings via `SectionHeading` (no eyebrow); badges from the detail
  DTO render as `Badge`s over the gallery (VM already has none — detail VM
  gains `badges` in its mapper, TDD); seats-left line gets a warning `Badge`
  when ≤ 5. Sticky bar: price switches to Geist SemiBold; behaviour unchanged.
- **Enquiry modal**: heading → Fraunces title + tour name caption; field
  spacing/labels inherit TextField; success state gets the filled
  `checkmark-circle` Ionicon in `success` color instead of the text tick.

### 6. Tab bar + placeholders

- Tab bar: `tabBarIcon` uses focused ? filled : outline Ionicons (`home`,
  `compass`, `heart`, `person-circle`); `tabBarLabelStyle` → Geist Medium 11;
  active tint `primary` (unchanged), subtle `borderTopWidth` retained.
- Saved/Account placeholders: large outline icon (48, muted) + Fraunces title
  + body copy centered — consistent "coming soon" look.

### 7. Testing & gate

- **TDD (pure):** `toTourCardVm` badges + seats mapping ·
  `toTourDetailVm` badges · `initialExploreState(params)` · Badge tone map
  (as a component test asserting styles).
- **Component tests:** Badge · Skeleton · TourCard (badge overlay + compare-at
  + rating row) · Home (hero copy renders, search pill navigates — mocked
  router; featured shelf still renders) · Explore (destination param presets
  the chip; existing 4 tests keep passing) · tab layout untested (config-only).
- **All 59 existing tests must stay green** (AppText/theme changes are
  additive; home/explore specs updated where copy changed).
- Gate: lint + typecheck + test for `@tourism/mobile`, `mobile-ui`,
  `@tourism/i18n` + `nx affected` (web/admin untouched). On-device: Expo Go,
  **light AND dark**, against the device-polish checklist in memory
  (indicators, pressed states, keyboard, RefreshControl, transitions).

### 8. Out of scope

- Splash screen / adaptive-icon dark-mode assets (needs design files, not
  code) · scroll-reveal animations (web `Reveal`) · testimonials/blog/
  TechCloud sections · any data/behaviour change · W3/W4 screens ·
  `expo-linear-gradient` (avoided by design).

### 9. Risks / notes

- **Custom fonts change text metrics** — the 2-line clamp heights and pill
  paddings need on-device eyeballing; keep `minHeight`s tied to `lineHeight`
  constants, not magic numbers.
- **`fontWeight` + custom fonts don't mix on Android** — always switch family,
  never rely on synthetic bolding (`Geist_600SemiBold`, not
  `fontFamily: Geist + fontWeight: '600'`).
- Font loading adds a beat to cold start — held behind the splash, and Expo Go
  caches after first load.
- The hero image is a remote Unsplash URL (same as web) — offline-first is not
  a goal this phase; `expo-image` caches it after first view.
- Straight quotes rule + no-hex rule hold everywhere (all new colors come from
  the theme).
