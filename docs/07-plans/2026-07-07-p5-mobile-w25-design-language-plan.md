# P5 Mobile W2.5 — Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (this wave runs **inline** at the user's request — no implementation subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the Expo app with the web's Nexora design language — Fraunces + Geist fonts, hero + scrim, badge/rating/compare-at card anatomy, section rhythm — per the approved spec [2026-07-07-p5-mobile-w25-design-language-design.md](../06-specs/2026-07-07-p5-mobile-w25-design-language-design.md). Pure look & feel; no behaviour/data changes beyond VM fields the visuals need.

**Architecture:** Fonts wire into the theme once (`fontFamily` per typography variant) so `AppText` re-brands every screen automatically. Two new primitives (`Badge`, `Skeleton`) + Card shadow land in `@tourism/mobile-ui`; product composites (`SectionHeading`, redesigned `TourCard`, `DestinationCard`, `TourBadges`) stay in the app. Home is rebuilt as 5 sections; Explore/Detail/Modal/tab-bar get language polish.

**Tech Stack:** expo-font + `@expo-google-fonts/{fraunces,geist}` · expo-splash-screen · Ionicons (`@expo/vector-icons`, already a dep) · RN `Animated` (Skeleton).

## Global Constraints

- Branch `feat/mobile-w25-design-language`, main checkout, inline execution. Never touch `origin/nghia`.
- **Expo Go-compatible only.** New deps allowed this wave: `expo-font`, `expo-splash-screen` (via `npx expo install`), `@expo-google-fonts/fraunces`, `@expo-google-fonts/geist`. **No `expo-linear-gradient`** (scrims use the alpha-carrying `overlay` token / plain Views).
- **No hex colors** anywhere — the `overlay` token already carries alpha (`#00000080`); `on-media`, `success/warning/info/rating` all exist in the theme.
- **Custom fonts on Android ignore `fontWeight`** — always switch the family (`Geist_600SemiBold`), never synthetic-bold. This plan sweeps every existing `fontWeight:` usage in mobile code.
- All copy via `@tourism/i18n` — web sections `hero.*`, `featuredTours.*`, `destinations.*`, `features.*` are reused as-is; only `mobile.home.cta*` keys are new.
- TDD on pure logic (VM mappers, `initialExploreState`); component tests for new primitives/composites; **all 59 existing tests (mobile 33 + mobile-ui 26) must stay green** (fixtures gain the new required `badges: []` field where the VM type demands it).
- Gate = lint + typecheck + test (mobile `build` = EAS cloud, excluded). Conventional Commits, straight quotes.

---

### Task 1: Fonts foundation — theme `fontFamily` + root-layout loading + weight sweep

**Files:**

- Modify: `libs/mobile/ui/src/lib/theme.ts`
- Modify: `libs/mobile/ui/src/lib/theme.spec.ts`
- Modify: `libs/mobile/ui/src/lib/button.tsx`, `libs/mobile/ui/src/lib/chip.tsx`, `libs/mobile/ui/src/lib/text-field.tsx`, `libs/mobile/ui/src/lib/accordion.tsx` (fontWeight → fontFamily)
- Modify: `apps/mobile/src/app/_layout.tsx` (font loading + splash gate)
- Modify: `apps/mobile/package.json` (new deps via CLI)

**Interfaces:**

- Produces: `TypographyVariant { fontSize, lineHeight, fontFamily }` (fontWeight **removed**); `Theme.fontFamilies: { heading, headingBold, sans, sansMedium, sansSemiBold }`; exported `fontFamilies` const. Every later task styles bold text with `theme.fontFamilies.sansSemiBold`.

- [ ] **Step 1: Install the deps**

From `apps/mobile`:

```bash
npx expo install expo-font expo-splash-screen
pnpm add @expo-google-fonts/fraunces @expo-google-fonts/geist
```

Expected: `package.json` gains `expo-font ~14.x`, `expo-splash-screen ~31.x` (SDK-54-pinned), `@expo-google-fonts/fraunces ^0.4.1`, `@expo-google-fonts/geist ^0.4.2`.

- [ ] **Step 2: Failing theme spec**

Append to `libs/mobile/ui/src/lib/theme.spec.ts` (inside `describe('buildTheme')`):

```ts
  it('maps typography variants to the brand font families', () => {
    const { typography, fontFamilies } = buildTheme('light');
    expect(typography.display.fontFamily).toBe('Fraunces_700Bold');
    expect(typography.title.fontFamily).toBe('Fraunces_600SemiBold');
    expect(typography.body.fontFamily).toBe('Geist_400Regular');
    expect(typography.caption.fontFamily).toBe('Geist_500Medium');
    expect(fontFamilies.sansSemiBold).toBe('Geist_600SemiBold');
  });
```

Run: `pnpm nx test mobile-ui --testPathPatterns=theme`
Expected: FAIL — `fontFamily`/`fontFamilies` undefined.

- [ ] **Step 3: Implement the theme change**

Replace `libs/mobile/ui/src/lib/theme.ts` with:

```ts
import { theme as tokens } from '@tourism/tokens/theme';

export type ColorScheme = 'light' | 'dark';

export interface TypographyVariant {
  fontSize: number;
  lineHeight: number;
  /** Exact loaded font name — custom fonts on Android ignore fontWeight. */
  fontFamily: string;
}

export interface FontFamilies {
  heading: string;
  headingBold: string;
  sans: string;
  sansMedium: string;
  sansSemiBold: string;
}

/** PostScript names as registered by @expo-google-fonts (loaded in the app's root layout). */
export const fontFamilies: FontFamilies = {
  heading: 'Fraunces_600SemiBold',
  headingBold: 'Fraunces_700Bold',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemiBold: 'Geist_600SemiBold',
};

export interface Theme {
  scheme: ColorScheme;
  /** Token colors (hex), keyed like the web CSS vars: background, foreground, primary, … */
  colors: Record<string, string>;
  radius: { sm: number; md: number; lg: number; xl: number };
  /** 4dp grid: spacing(4) = 16. */
  spacing: (steps: number) => number;
  fontFamilies: FontFamilies;
  typography: {
    display: TypographyVariant;
    title: TypographyVariant;
    body: TypographyVariant;
    caption: TypographyVariant;
  };
}

export function buildTheme(scheme: ColorScheme): Theme {
  const base = tokens.radius.base;
  return {
    scheme,
    colors: tokens.colors[scheme],
    radius: {
      sm: Math.round(base * 0.5),
      md: base,
      lg: Math.round(base * 1.5),
      xl: base * 2,
    },
    spacing: (steps) => steps * 4,
    fontFamilies,
    typography: {
      display: { fontSize: 28, lineHeight: 34, fontFamily: fontFamilies.headingBold },
      title: { fontSize: 20, lineHeight: 26, fontFamily: fontFamilies.heading },
      body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamilies.sans },
      caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamilies.sansMedium },
    },
  };
}
```

- [ ] **Step 4: Sweep `fontWeight` out of the lib components**

In `button.tsx`, the label `<AppText …>` style becomes:

```tsx
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          color: primary ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
```

In `chip.tsx`, the label style becomes:

```tsx
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          color: selected ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
```

In `text-field.tsx`, the label `<AppText variant="caption" style={{ fontWeight: '600' }}>` becomes `style={{ fontFamily: theme.fontFamilies.sansSemiBold }}`.

In `accordion.tsx`, the title `<AppText variant="body" style={{ fontWeight: '600', flex: 1 }}>` becomes `style={{ fontFamily: theme.fontFamilies.sansSemiBold, flex: 1 }}`.

- [ ] **Step 5: Load fonts in the root layout**

In `apps/mobile/src/app/_layout.tsx`: add imports + the loading gate (rest of the file — ThemedStack etc. — unchanged):

```tsx
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import * as SplashScreen from 'expo-splash-screen';
```

Above `RootLayout`: `SplashScreen.preventAutoHideAsync();`

`RootLayout` becomes:

```tsx
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // splash stays visible

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <ThemedStack />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

(`useEffect` is already imported in this file.)

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p mobile-ui @tourism/mobile`
Expected: all green (existing specs assert `fontSize`/colors, not `fontWeight`).

```bash
git add libs/mobile/ui/src/lib/theme.ts libs/mobile/ui/src/lib/theme.spec.ts libs/mobile/ui/src/lib/button.tsx libs/mobile/ui/src/lib/chip.tsx libs/mobile/ui/src/lib/text-field.tsx libs/mobile/ui/src/lib/accordion.tsx apps/mobile/src/app/_layout.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile): Fraunces + Geist brand fonts wired through the theme"
```

---

### Task 2: `Badge` primitive

**Files:**

- Create: `libs/mobile/ui/src/lib/badge.tsx`
- Test: `libs/mobile/ui/src/lib/badge.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**

- Produces: `Badge({ label, tone?: BadgeTone })`, `type BadgeTone = 'primary' | 'success' | 'warning' | 'info' | 'rating'` (default `'primary'`; `rating` uses plain `foreground` text like web).

- [ ] **Step 1: Failing spec**

`libs/mobile/ui/src/lib/badge.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Badge } from './badge';

test('renders the label on the tone background', () => {
  render(
    <ThemeProvider>
      <Badge label="Best value" tone="success" testID="badge" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Best value')).toBeOnTheScreen();
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['success']);
});

test('rating tone keeps foreground text (web parity)', () => {
  render(
    <ThemeProvider>
      <Badge label="Popular" tone="rating" />
    </ThemeProvider>,
  );
  const text = screen.getByText('Popular');
  expect(StyleSheet.flatten(text.props.style).color).toBe(tokens.colors.light['foreground']);
});
```

Run: `pnpm nx test mobile-ui --testPathPatterns=badge` → FAIL (`Cannot find module './badge'`).

- [ ] **Step 2: Implement**

`libs/mobile/ui/src/lib/badge.tsx`:

```tsx
import { Text, View, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'info' | 'rating';

export interface BadgeProps extends ViewProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'primary', style, ...rest }: BadgeProps) {
  const theme = useTheme();
  // Web parity: the amber "rating" badge keeps dark foreground text.
  const color =
    tone === 'rating' ? theme.colors['foreground'] : theme.colors[`${tone}-foreground`];
  return (
    <View
      {...rest}
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: theme.colors[tone],
          borderRadius: 999,
          paddingHorizontal: theme.spacing(2),
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <Text style={{ color, fontSize: 11, lineHeight: 14, fontFamily: theme.fontFamilies.sansSemiBold }}>
        {label}
      </Text>
    </View>
  );
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { Badge } from './lib/badge';
export type { BadgeProps, BadgeTone } from './lib/badge';
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx test mobile-ui --testPathPatterns=badge` → PASS (2).

```bash
git add libs/mobile/ui/src/lib/badge.tsx libs/mobile/ui/src/lib/badge.spec.tsx libs/mobile/ui/src/index.ts
git commit -m "feat(mobile-ui): Badge primitive with web tone map"
```

---

### Task 3: `Skeleton` primitive + Card shadow

**Files:**

- Create: `libs/mobile/ui/src/lib/skeleton.tsx`
- Test: `libs/mobile/ui/src/lib/skeleton.spec.tsx`
- Modify: `libs/mobile/ui/src/lib/card.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**

- Produces: `Skeleton({ width?, height?, borderRadius?, style? })` — pulsing muted block. `Card` unchanged API, gains resting shadow.

- [ ] **Step 1: Failing spec**

`libs/mobile/ui/src/lib/skeleton.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Skeleton } from './skeleton';

test('renders a themed muted block', () => {
  render(
    <ThemeProvider>
      <Skeleton width={240} height={130} testID="skeleton" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('skeleton').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['muted']);
  expect(flattened.width).toBe(240);
});
```

Run: `pnpm nx test mobile-ui --testPathPatterns=skeleton` → FAIL.

- [ ] **Step 2: Implement**

`libs/mobile/ui/src/lib/skeleton.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

/** Loading placeholder with a soft opacity pulse (native driver — Expo Go safe). */
export function Skeleton({ width, height, borderRadius, style, ...rest }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      {...rest}
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? theme.radius.md,
          backgroundColor: theme.colors['muted'],
          opacity,
        },
        style,
      ]}
    />
  );
}
```

Card (`card.tsx`) style object gains (after `overflow: 'hidden'`; Android-first — iOS clips shadows under `overflow: hidden`, acceptable this phase):

```tsx
          shadowColor: theme.colors['foreground'],
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
```

Append to `index.ts`:

```ts
export { Skeleton } from './lib/skeleton';
export type { SkeletonProps } from './lib/skeleton';
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p mobile-ui` → green (existing card.spec asserts style merge, unaffected).

```bash
git add libs/mobile/ui/src/lib/skeleton.tsx libs/mobile/ui/src/lib/skeleton.spec.tsx libs/mobile/ui/src/lib/card.tsx libs/mobile/ui/src/index.ts
git commit -m "feat(mobile-ui): Skeleton pulse primitive + Card resting shadow"
```

---

### Task 4: VM extensions — badges, seats, toursCount (TDD)

**Files:**

- Modify: `apps/mobile/src/lib/tours.ts` + `tours.spec.ts`
- Modify: `apps/mobile/src/lib/destinations.ts` + `destinations.spec.ts`
- Modify: `apps/mobile/src/lib/tour-detail.ts` + `tour-detail.spec.ts`
- Modify (fixtures only): `apps/mobile/src/__tests__/home.spec.tsx`, `explore.spec.tsx`, `tour-detail-screen.spec.tsx`, `apps/mobile/src/lib/explore-state.spec.ts`

**Interfaces:**

- Produces: `type TourBadge = TourSummaryDto['badges'][number]`; `TourCardVm` gains `badges: TourBadge[]` + `nextDepartureSeatsLeft?: number`; `DestinationChipVm` gains `toursCount: number`; `TourDetailVm` gains `badges: string[]`.

- [ ] **Step 1: Failing specs**

`tours.spec.ts` — extend the main dto fixture with `badges: ['POPULAR'], nextDepartureSeatsLeft: 4,` and the main assertion with:

```ts
      badges: ['POPULAR'],
      nextDepartureSeatsLeft: 4,
```

Add a case to the nulls test: `badges: null → []`, `nextDepartureSeatsLeft: null → undefined` (extend the third test's fixture with `badges: null, nextDepartureSeatsLeft: null` and assert `vm.badges` `toEqual([])`, `vm.nextDepartureSeatsLeft` `toBeUndefined()`).

`destinations.spec.ts` — first test's expected object gains `toursCount: 3`.

`tour-detail.spec.ts` — main `toMatchObject` gains `badges: ['POPULAR'],`.

Run: `pnpm nx test @tourism/mobile --testPathPatterns='tours|destinations|tour-detail'`
Expected: FAIL on the new fields.

- [ ] **Step 2: Implement the mappers**

`tours.ts`: add `export type TourBadge = TourSummaryDto['badges'][number];`, extend the interface:

```ts
  badges: TourBadge[];
  nextDepartureSeatsLeft?: number;
```

and the mapper:

```ts
    badges: dto.badges ?? [],
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft ?? undefined,
```

`destinations.ts`: interface gains `toursCount: number;`, mapper gains `toursCount: dto.toursCount ?? 0,`.

`tour-detail.ts`: `TourDetailVm` gains `badges: string[];`, mapper gains `badges: dto.badges ?? [],`.

- [ ] **Step 3: Update fixtures so typecheck stays green**

- `home.spec.tsx` vm: add `badges: [],`
- `explore.spec.tsx` `tour()` base: add `badges: [],`
- `explore-state.spec.ts` `tour()` base: add `badges: [],`
- `tour-detail-screen.spec.tsx` vm: add `badges: ['POPULAR'],`

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → all green.

```bash
git add apps/mobile/src/lib/tours.ts apps/mobile/src/lib/tours.spec.ts apps/mobile/src/lib/destinations.ts apps/mobile/src/lib/destinations.spec.ts apps/mobile/src/lib/tour-detail.ts apps/mobile/src/lib/tour-detail.spec.ts apps/mobile/src/__tests__/home.spec.tsx apps/mobile/src/__tests__/explore.spec.tsx apps/mobile/src/__tests__/tour-detail-screen.spec.tsx apps/mobile/src/lib/explore-state.spec.ts
git commit -m "feat(mobile): VM badges + seats-left + toursCount (TDD)"
```

---

### Task 5: `SectionHeading` + `TourBadges` + redesigned `TourCard` + `DestinationCard`

**Files:**

- Create: `apps/mobile/src/components/section-heading.tsx`
- Create: `apps/mobile/src/components/tour-badges.tsx`
- Create: `apps/mobile/src/components/destination-card.tsx`
- Modify: `apps/mobile/src/components/tour-card.tsx` (full redesign)
- Test: `apps/mobile/src/__tests__/tour-card.spec.tsx` (new)

**Interfaces:**

- Consumes: `Badge`/`BadgeTone`/`Skeleton` (T2/T3), `TourBadge`/VM fields (T4), `theme.fontFamilies` (T1).
- Produces: `SectionHeading({ eyebrow?, title, subtitle? })` · `TourBadges({ badges })` (overlay row, maps enum → tone + i18n label) · `DestinationCard({ destination, onPress })` (140×180 image tile) · `TourCard` (same props as W2: `{ tour, variant?, onPress? }`).

- [ ] **Step 1: SectionHeading**

`apps/mobile/src/components/section-heading.tsx`:

```tsx
import { View } from 'react-native';
import { AppText, useTheme } from '@tourism/mobile-ui';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1), marginBottom: theme.spacing(3) }}>
      {eyebrow ? (
        <AppText
          variant="caption"
          style={{
            color: theme.colors['primary'],
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontFamily: theme.fontFamilies.sansSemiBold,
          }}
        >
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="title">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" muted>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: TourBadges (shared overlay row)**

`apps/mobile/src/components/tour-badges.tsx`:

```tsx
import { View } from 'react-native';
import { messages } from '@tourism/i18n';
import { Badge, useTheme, type BadgeTone } from '@tourism/mobile-ui';
import type { TourBadge } from '../lib/tours';

/** Web parity tone map (apps/web tour-card badgeClass). */
const TONE: Record<TourBadge, BadgeTone> = {
  BEST_VALUE: 'success',
  LIMITED_OFFER: 'warning',
  EXCLUSIVE: 'primary',
  NEW: 'info',
  POPULAR: 'rating',
};

export function TourBadges({ badges }: { badges: TourBadge[] }) {
  const theme = useTheme();
  if (badges.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) }}>
      {badges.map((badge) => (
        <Badge key={badge} label={messages.featuredTours.badges[badge]} tone={TONE[badge]} />
      ))}
    </View>
  );
}
```

- [ ] **Step 3: TourCard redesign**

Replace `apps/mobile/src/components/tour-card.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';
import { TourBadges } from './tour-badges';

const t = messages.featuredTours;
const tm = messages.mobile;

export interface TourCardProps {
  tour: TourCardVm;
  /** 'shelf' = 260-wide horizontal-rail card (Home). 'list' = full-width row (Explore). */
  variant?: 'shelf' | 'list';
  onPress?: () => void;
}

function price(currency: string, amount: number) {
  return `${currency === 'USD' ? '$' : `${currency} `}${amount.toLocaleString('en-US')}`;
}

export function TourCard({ tour, variant = 'shelf', onPress }: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  const lowSeats = tour.nextDepartureSeatsLeft != null && tour.nextDepartureSeatsLeft <= 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={list ? undefined : { width: 260 }}>
        <View>
          <Image
            source={tour.image ? { uri: tour.image } : undefined}
            style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: theme.colors['muted'] }}
            contentFit="cover"
            accessibilityLabel={tour.title}
          />
          <View style={{ position: 'absolute', top: theme.spacing(2), left: theme.spacing(2) }}>
            <TourBadges badges={tour.badges} />
          </View>
        </View>
        <View style={{ padding: theme.spacing(3), gap: theme.spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons
                name="location-outline"
                size={13}
                color={theme.colors['muted-foreground']}
              />
              <AppText variant="caption" muted>
                {tour.destination}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
              <Ionicons name="time-outline" size={13} color={theme.colors['muted-foreground']} />
              <AppText variant="caption" muted>
                {tm.home.durationDays(tour.durationDays)}
              </AppText>
            </View>
          </View>

          <AppText
            numberOfLines={2}
            style={{
              fontFamily: theme.fontFamilies.sansSemiBold,
              fontSize: 17,
              lineHeight: 24,
              minHeight: 48,
              color: theme.colors['foreground'],
            }}
          >
            {tour.title}
          </AppText>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing(2),
            }}
          >
            {tour.reviewCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                <Ionicons name="star" size={14} color={theme.colors['rating']} />
                <AppText variant="caption">{tour.rating.toFixed(1)}</AppText>
                <AppText variant="caption" muted>
                  ({tour.reviewCount} {t.reviewsLabel})
                </AppText>
              </View>
            ) : (
              <View />
            )}
            {list && lowSeats && tour.nextDepartureSeatsLeft != null ? (
              <Badge
                tone="warning"
                label={tm.tourDetail.seatsLeft(tour.nextDepartureSeatsLeft)}
              />
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="caption" muted>
              {t.from}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                fontSize: 18,
                lineHeight: 24,
                color: theme.colors['foreground'],
              }}
            >
              {price(tour.currency, tour.basePrice)}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {price(tour.currency, tour.compareAtPrice)}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 4: DestinationCard**

`apps/mobile/src/components/destination-card.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';
import type { DestinationChipVm } from '../lib/destinations';

export function DestinationCard({
  destination,
  onPress,
}: {
  destination: DestinationChipVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={destination.name}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          width: 140,
          height: 180,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
          backgroundColor: theme.colors['muted'],
        }}
      >
        <Image
          source={destination.image ? { uri: destination.image } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={destination.name}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors['overlay'],
            padding: theme.spacing(2),
            gap: 2,
          }}
        >
          <AppText
            variant="body"
            style={{ fontFamily: theme.fontFamilies.sansSemiBold, color: theme.colors['on-media'] }}
          >
            {destination.name}
          </AppText>
          {destination.toursCount > 0 ? (
            <AppText variant="caption" style={{ color: theme.colors['on-media'], opacity: 0.85 }}>
              {destination.toursCount} {messages.destinations.toursLabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 5: TourCard component test**

`apps/mobile/src/__tests__/tour-card.spec.tsx`:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { TourCard } from '../components/tour-card';
import type { TourCardVm } from '../lib/tours';

const vm: TourCardVm = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 3,
  basePrice: 450,
  compareAtPrice: 520,
  currency: 'USD',
  rating: 4.9,
  reviewCount: 214,
  badges: ['POPULAR', 'BEST_VALUE'],
  nextDepartureSeatsLeft: 3,
};

function renderCard(variant: 'shelf' | 'list') {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <TourCard tour={vm} variant={variant} onPress={jest.fn()} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders badges, rating and compare-at price', () => {
  renderCard('shelf');
  expect(screen.getByText('Popular')).toBeOnTheScreen();
  expect(screen.getByText('Best value')).toBeOnTheScreen();
  expect(screen.getByText('4.9')).toBeOnTheScreen();
  expect(screen.getByText('$450')).toBeOnTheScreen();
  expect(screen.getByText('$520')).toBeOnTheScreen();
});

test('list variant shows the low-seats badge', () => {
  renderCard('list');
  expect(screen.getByText('3 seats left')).toBeOnTheScreen();
});

test('shelf variant hides the low-seats badge', () => {
  renderCard('shelf');
  expect(screen.queryByText('3 seats left')).not.toBeOnTheScreen();
});
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add apps/mobile/src/components/section-heading.tsx apps/mobile/src/components/tour-badges.tsx apps/mobile/src/components/destination-card.tsx apps/mobile/src/components/tour-card.tsx apps/mobile/src/__tests__/tour-card.spec.tsx
git commit -m "feat(mobile): web-parity TourCard + SectionHeading + DestinationCard"
```

---

### Task 6: Home rebuild — hero + 5 sections

**Files:**

- Modify: `libs/shared/i18n/src/lib/messages.ts` (add `mobile.home.cta*`)
- Modify: `apps/mobile/src/app/(tabs)/index.tsx` (full rebuild)
- Modify: `apps/mobile/src/__tests__/home.spec.tsx`

**Interfaces:**

- Consumes: `SectionHeading`/`TourCard`/`DestinationCard` (T5), `Badge`/`Skeleton` (T2/T3), `fetchFeaturedTours`/`fetchDestinations` (existing), `messages.hero/featuredTours/destinations/features`.
- Produces: routes `/explore?focusSearch=1` (search pill) and `/explore?destination=<name>` (destination tiles) — Task 7 consumes these params.

- [ ] **Step 1: i18n additions**

In `messages.ts`, inside `mobile.home` (after `durationDays`):

```ts
      ctaTitle: 'Dreaming of Vietnam?',
      ctaSubtitle: 'Tell us your dates and wishes — we will craft the journey.',
      ctaButton: 'Start exploring',
```

- [ ] **Step 2: Rebuild the Home screen**

Replace `apps/mobile/src/app/(tabs)/index.tsx`:

```tsx
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { DestinationCard } from '../../components/destination-card';
import { SectionHeading } from '../../components/section-heading';
import { TourCard } from '../../components/tour-card';
import { fetchDestinations } from '../../lib/destinations';
import { fetchFeaturedTours } from '../../lib/tours';

const t = messages.mobile.home;
const hero = messages.hero;
const featured = messages.featuredTours;
const dest = messages.destinations;
const features = messages.features;

// Same curated Vietnam hero as the web home (shared brand chrome).
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1634951412593-b2cdca1ae519?w=1200&q=70&auto=format&fit=crop';

const WHY_ICONS = ['map-outline', 'shield-checkmark-outline', 'people-outline'] as const;

function Hero() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: 420 }}>
      <Image
        source={{ uri: HERO_IMAGE }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={hero.imageAlt}
      />
      {/* overlay token carries its own alpha (#…80) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors['overlay'] }]} />
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          padding: theme.spacing(4),
          paddingTop: insets.top + theme.spacing(4),
          gap: theme.spacing(3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
          <Badge label={hero.eyebrowBadge} />
          <AppText variant="caption" style={{ color: theme.colors['on-media'], opacity: 0.9 }}>
            {hero.eyebrowText}
          </AppText>
        </View>
        <AppText
          variant="display"
          style={{ color: theme.colors['on-media'], fontSize: 30, lineHeight: 36 }}
        >
          {hero.titleLead} {hero.titleAccent} {hero.titleTail}
        </AppText>
        <AppText variant="body" style={{ color: theme.colors['on-media'], opacity: 0.85 }}>
          {hero.subtitle}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hero.searchPlaceholder}
          onPress={() => router.push('/explore?focusSearch=1')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(2),
            backgroundColor: theme.colors['background'],
            borderRadius: 999,
            paddingLeft: theme.spacing(4),
            paddingRight: theme.spacing(1),
            paddingVertical: theme.spacing(1),
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="search-outline" size={16} color={theme.colors['muted-foreground']} />
          <AppText variant="body" muted style={{ flex: 1 }}>
            {hero.searchPlaceholder}
          </AppText>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors['primary'],
            }}
          >
            <Ionicons name="search" size={18} color={theme.colors['primary-foreground']} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: theme.spacing(4) }}>{children}</View>;
}

export default function HomeScreen() {
  const theme = useTheme();
  const toursQ = useQuery({ queryKey: ['tours', 'featured'], queryFn: fetchFeaturedTours });
  const destQ = useQuery({ queryKey: ['destinations'], queryFn: fetchDestinations });

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing(8), gap: theme.spacing(6) }}
        refreshControl={
          <RefreshControl
            refreshing={toursQ.isRefetching}
            onRefresh={() => {
              toursQ.refetch();
              destQ.refetch();
            }}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
      >
        <Hero />

        <Section>
          <SectionHeading
            eyebrow={hero.eyebrowBadge}
            title={featured.heading}
            subtitle={featured.subtitle}
          />
          {toursQ.isPending ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} width={260} height={300} borderRadius={theme.radius.lg} />
              ))}
            </View>
          ) : toursQ.isError ? (
            <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(4) }}>
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => toursQ.refetch()} />
            </View>
          ) : toursQ.data && toursQ.data.length > 0 ? (
            <FlatList
              horizontal
              data={toursQ.data}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => (
                <TourCard tour={item} onPress={() => router.push(`/tours/${item.slug}`)} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {t.empty}
            </AppText>
          )}
        </Section>

        {destQ.data && destQ.data.length > 0 ? (
          <Section>
            <SectionHeading title={dest.heading} subtitle={dest.subtitle} />
            <FlatList
              horizontal
              data={destQ.data}
              keyExtractor={(d) => d.slug}
              renderItem={({ item }) => (
                <DestinationCard
                  destination={item}
                  onPress={() =>
                    router.push({ pathname: '/explore', params: { destination: item.name } })
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
              showsHorizontalScrollIndicator={false}
            />
          </Section>
        ) : null}

        <Section>
          <SectionHeading title={features.heading} subtitle={features.subtitle} />
          <View style={{ gap: theme.spacing(4) }}>
            {features.items.slice(0, 3).map((item, i) => (
              <View
                key={item.title}
                style={{ flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors['secondary'],
                  }}
                >
                  <Ionicons name={WHY_ICONS[i]} size={20} color={theme.colors['primary']} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    variant="body"
                    style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
                  >
                    {item.title}
                  </AppText>
                  <AppText variant="caption" muted>
                    {item.description}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section>
          <View
            style={{
              backgroundColor: theme.colors['primary'],
              borderRadius: theme.radius.xl,
              padding: theme.spacing(5),
              gap: theme.spacing(3),
            }}
          >
            <AppText variant="title" style={{ color: theme.colors['primary-foreground'] }}>
              {t.ctaTitle}
            </AppText>
            <AppText
              variant="body"
              style={{ color: theme.colors['primary-foreground'], opacity: 0.85 }}
            >
              {t.ctaSubtitle}
            </AppText>
            <Button
              variant="outline"
              label={t.ctaButton}
              onPress={() => router.push('/explore')}
              style={{ backgroundColor: theme.colors['background'], borderColor: 'transparent' }}
            />
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}
```

(Note: the W1 `SlowServerHint`/`SkeletonShelf` are replaced by `Skeleton`; the cold-start hint copy moves to Explore only — Home's skeleton is enough visual feedback.)

- [ ] **Step 3: Update the home spec**

Replace `apps/mobile/src/__tests__/home.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from '../app/(tabs)/index';
import { fetchDestinations } from '../lib/destinations';
import { fetchFeaturedTours } from '../lib/tours';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));

jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));

import { router } from 'expo-router';

const mockFetch = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <HomeScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const vm = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 3,
  basePrice: 450,
  currency: 'USD',
  rating: 4.8,
  reviewCount: 12,
  badges: [],
  image: 'https://img.test/h.jpg',
};

beforeEach(() => {
  mockDests.mockResolvedValue([]);
});

test('renders the hero headline and featured tours', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText(/timeless journeys/i)).toBeOnTheScreen();
});

test('search pill routes to Explore with focusSearch', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: /where would you like to go/i }));
  expect(router.push).toHaveBeenCalledWith('/explore?focusSearch=1');
});

test('destination tile routes to Explore with the destination preset', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  mockDests.mockResolvedValue([{ slug: 'ha-long', name: 'Ha Long', toursCount: 3 }]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: 'Ha Long' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/explore',
    params: { destination: 'Ha Long' },
  });
});

test('renders the error state with retry', async () => {
  mockFetch.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile @tourism/i18n` → green.

```bash
git add libs/shared/i18n/src/lib/messages.ts "apps/mobile/src/app/(tabs)/index.tsx" apps/mobile/src/__tests__/home.spec.tsx
git commit -m "feat(mobile): Home rebuilt - hero, featured, destinations, why, CTA"
```

---

### Task 7: Explore polish — SectionHeading, search icon, route-param presets

**Files:**

- Modify: `libs/mobile/ui/src/lib/text-field.tsx` + `text-field.spec.tsx` (`leading` slot)
- Modify: `apps/mobile/src/lib/explore-state.ts` + `explore-state.spec.ts` (`initialExploreState`)
- Modify: `apps/mobile/src/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/src/__tests__/explore.spec.tsx`

**Interfaces:**

- Consumes: Home's `/explore?destination=<name>` + `/explore?focusSearch=1` (T6).
- Produces: `TextField({ leading?: ReactNode, … })`; `initialExploreState(params: { destination?: string | string[] }): ExploreState`.

- [ ] **Step 1: Failing tests**

Append to `text-field.spec.tsx`:

```tsx
import { Text } from 'react-native';

test('renders the leading slot', () => {
  render(
    <ThemeProvider>
      <TextField label="Search" leading={<Text>go</Text>} />
    </ThemeProvider>,
  );
  expect(screen.getByText('go')).toBeOnTheScreen();
});
```

Append to `explore-state.spec.ts`:

```ts
import { initialExploreState } from './explore-state';

test('initialExploreState presets the destination from route params', () => {
  expect(initialExploreState({ destination: 'Ha Long' })).toEqual({
    ...defaultExploreState,
    destination: 'Ha Long',
  });
  expect(initialExploreState({})).toEqual(defaultExploreState);
  expect(initialExploreState({ destination: ['A', 'B'] })).toEqual(defaultExploreState);
});
```

Run: `pnpm nx run-many -t test -p mobile-ui @tourism/mobile --testPathPatterns='text-field|explore-state'` → FAIL.

- [ ] **Step 2: Implement `TextField.leading`**

Replace the input part of `text-field.tsx` (label + error rendering unchanged) — the bordered box becomes a row container so the icon sits inside it:

```tsx
export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Error copy shown under the field; also colors the border. */
  error?: string;
  /** Leading adornment inside the field (e.g. a search icon). */
  leading?: ReactNode;
}

export function TextField({ label, error, leading, multiline, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label ? (
        <AppText variant="caption" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: theme.spacing(2),
          minHeight: multiline ? 100 : 44,
          borderWidth: 1,
          borderColor: error ? theme.colors['destructive'] : theme.colors['border'],
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing(3),
          paddingVertical: multiline ? theme.spacing(2) : 0,
          backgroundColor: theme.colors['background'],
        }}
      >
        {leading}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors['muted-foreground']}
          multiline={multiline}
          {...rest}
          style={[
            {
              flex: 1,
              color: theme.colors['foreground'],
              textAlignVertical: multiline ? 'top' : 'center',
              fontSize: theme.typography.body.fontSize,
              fontFamily: theme.fontFamilies.sans,
              paddingVertical: 0,
            },
            style,
          ]}
        />
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
```

(`import { type ReactNode } from 'react';` joins the imports. The `accessibilityLabel` still comes from `label`, so the enquiry-modal specs keep passing; the field keeps its 44dp min height.)

- [ ] **Step 3: Implement `initialExploreState`**

Append to `explore-state.ts`:

```ts
/** Route-param → initial filter state (Home's destination tiles / search pill deep-link). */
export function initialExploreState(params: {
  destination?: string | string[];
}): ExploreState {
  const destination =
    typeof params.destination === 'string' && params.destination !== ''
      ? params.destination
      : undefined;
  return { ...defaultExploreState, destination };
}
```

- [ ] **Step 4: Wire the Explore screen**

In `explore.tsx`:

- imports gain `useLocalSearchParams` (from `expo-router`), `Ionicons` (from `@expo/vector-icons`), `SectionHeading` (from `../../components/section-heading`), `initialExploreState` (from `../../lib/explore-state`);
- state init becomes:

```tsx
  const params = useLocalSearchParams<{ destination?: string; focusSearch?: string }>();
  const [state, setState] = useState<ExploreState>(() => initialExploreState(params));
```

- the header's title block `<AppText variant="display">{t.title}</AppText>` becomes `<SectionHeading title={t.title} />` (keep the search field below it);
- the search `TextField` gains:

```tsx
        leading={
          <Ionicons name="search-outline" size={16} color={theme.colors['muted-foreground']} />
        }
        autoFocus={params.focusSearch === '1'}
```

- [ ] **Step 5: Explore spec — param preset test**

In `explore.spec.tsx`, make the router mock param-driven and add a test:

```tsx
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
```

(add `beforeEach(() => { mockParams = {}; })` after the mocks), then:

```tsx
test('destination route param presets the filter', async () => {
  mockParams = { destination: 'Ha Long' };
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.queryByText('Hanoi Street Food')).not.toBeOnTheScreen();
  expect(screen.getByText('1 tour')).toBeOnTheScreen();
});
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p mobile-ui @tourism/mobile` → green.

```bash
git add libs/mobile/ui/src/lib/text-field.tsx libs/mobile/ui/src/lib/text-field.spec.tsx apps/mobile/src/lib/explore-state.ts apps/mobile/src/lib/explore-state.spec.ts "apps/mobile/src/app/(tabs)/explore.tsx" apps/mobile/src/__tests__/explore.spec.tsx
git commit -m "feat(mobile): Explore polish - search icon, section heading, route-param presets"
```

---

### Task 8: Detail + enquiry-modal polish

**Files:**

- Modify: `apps/mobile/src/app/tours/[slug]/index.tsx`
- Modify: `apps/mobile/src/app/tours/[slug]/enquiry.tsx`
- Modify: `apps/mobile/src/__tests__/tour-detail-screen.spec.tsx` (badge assertion)

**Interfaces:**

- Consumes: `TourBadges` (T5 — detail VM `badges` from T4), `Badge`, `theme.fontFamilies`.

- [ ] **Step 1: Detail screen polish**

In `tours/[slug]/index.tsx`:

1. imports gain `Ionicons` (from `@expo/vector-icons`) and `TourBadges` (from `../../../components/tour-badges`); the `Badge` import joins the `@tourism/mobile-ui` line. `TourBadges` needs the enum type — the detail VM's `badges: string[]` is cast at the call site: `badges={tour.badges as TourBadge[]}` with `import type { TourBadge } from '../../../lib/tours';`
2. wrap the gallery to host the badges overlay:

```tsx
        <View>
          <GalleryPager images={tour.gallery} title={tour.title} />
          <View
            style={{
              position: 'absolute',
              top: insets.top + theme.spacing(2),
              right: theme.spacing(4),
            }}
          >
            <TourBadges badges={tour.badges as TourBadge[]} />
          </View>
        </View>
```

(top-right, so it never collides with the back overlay top-left.)
3. replace the joined `facts` string + rating caption block with icon rows:

```tsx
            {tour.reviewCount > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                <Ionicons name="star" size={14} color={theme.colors['rating']} />
                <AppText variant="caption">{tour.rating.toFixed(1)}</AppText>
                <AppText variant="caption" muted>
                  ({tour.reviewCount} {messages.featuredTours.reviewsLabel})
                </AppText>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(3) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                <Ionicons name="time-outline" size={13} color={theme.colors['muted-foreground']} />
                <AppText variant="caption" muted>
                  {th.durationDays(tour.durationDays)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                <Ionicons name="people-outline" size={13} color={theme.colors['muted-foreground']} />
                <AppText variant="caption" muted>
                  {t.maxGroup(tour.maxGroupSize)}
                </AppText>
              </View>
              {tour.difficulty ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) }}>
                  <Ionicons name="walk-outline" size={13} color={theme.colors['muted-foreground']} />
                  <AppText variant="caption" muted>
                    {tour.difficulty}
                  </AppText>
                </View>
              ) : null}
            </View>
```

(the old `reviewsLine`/`facts` const + usages are deleted; `const facts = …` removed.)
4. the next-departure line: keep the text but swap the seats suffix for a warning badge when low:

```tsx
            {tour.nextDepartureDate ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), flexWrap: 'wrap' }}>
                <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                  {t.nextDeparture(tour.nextDepartureDate)}
                </AppText>
                {tour.nextDepartureSeatsLeft != null ? (
                  tour.nextDepartureSeatsLeft <= 5 ? (
                    <Badge tone="warning" label={t.seatsLeft(tour.nextDepartureSeatsLeft)} />
                  ) : (
                    <AppText variant="caption" muted>
                      {t.seatsLeft(tour.nextDepartureSeatsLeft)}
                    </AppText>
                  )
                ) : null}
              </View>
            ) : null}
```

5. `fontWeight: '600'` sweep in this file: the policy title AppText and the reviews' star row are already `AppText`; replace every remaining `style={{ fontWeight: '600' }}` with `style={{ fontFamily: theme.fontFamilies.sansSemiBold }}`; the sticky-bar price `<AppText variant="title">` becomes:

```tsx
            <AppText style={{ fontFamily: theme.fontFamilies.sansSemiBold, fontSize: 18, lineHeight: 24, color: theme.colors['foreground'] }}>
```

6. the review stars line `{'★'.repeat(review.rating)}` stays (string stars read fine at caption size).

- [ ] **Step 2: Enquiry modal polish**

In `tours/[slug]/enquiry.tsx`: the success `✓` AppText becomes:

```tsx
          <Ionicons name="checkmark-circle" size={56} color={theme.colors['success']} />
```

(imports gain `Ionicons`.) Everything else inherits Task 1 fonts + Task 7 TextField.

- [ ] **Step 3: Spec assertion**

`tour-detail-screen.spec.tsx` (fixture already has `badges: ['POPULAR']` from T4): in the first test add:

```tsx
  expect(screen.getByText('Popular')).toBeOnTheScreen();
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add "apps/mobile/src/app/tours/[slug]/index.tsx" "apps/mobile/src/app/tours/[slug]/enquiry.tsx" apps/mobile/src/__tests__/tour-detail-screen.spec.tsx
git commit -m "feat(mobile): detail + enquiry polish - icon facts, gallery badges, seats badge"
```

---

### Task 9: Tab bar + Saved/Account placeholders

**Files:**

- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/app/(tabs)/saved.tsx`, `apps/mobile/src/app/(tabs)/account.tsx`

- [ ] **Step 1: Tab bar — filled active icons + Geist labels**

In `(tabs)/_layout.tsx`, `screenOptions` gains:

```tsx
        tabBarLabelStyle: { fontFamily: theme.fontFamilies.sansMedium, fontSize: 11 },
```

and each `tabBarIcon` switches on `focused` (example for Home; repeat for `compass`, `heart`, `person-circle`):

```tsx
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
```

- [ ] **Step 2: Placeholders**

`saved.tsx` body becomes (account.tsx identical with `person-circle-outline` + its copy):

```tsx
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
      >
        <Ionicons name="heart-outline" size={48} color={theme.colors['muted-foreground']} />
        <AppText variant="title">{messages.mobile.tabs.saved}</AppText>
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {messages.mobile.placeholders.saved}
        </AppText>
      </View>
```

(imports gain `Ionicons`.)

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile` → green.

```bash
git add "apps/mobile/src/app/(tabs)/_layout.tsx" "apps/mobile/src/app/(tabs)/saved.tsx" "apps/mobile/src/app/(tabs)/account.tsx"
git commit -m "feat(mobile): themed tab bar with filled active icons + styled placeholders"
```

---

### Task 10: Gate, on-device verification (light + dark), STATUS

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile mobile-ui @tourism/i18n`
Expected: green.

Run: `pnpm nx affected -t lint typecheck test --base=main`
Expected: green (i18n additive → web/admin suites untouched-but-run).

- [ ] **Step 2: On-device (Expo Go, restart the dev server — new deps)**

From `apps/mobile`: `pnpm exec expo start --clear`. Checklist, in **both light and dark** (toggle the OS theme):

1. Splash → fonts land (Fraunces headline visible on Home hero, no system-font flash).
2. Home: hero image + scrim + eyebrow + search pill → tapping it opens Explore with the keyboard up; featured cards show badges/rating/compare-at; destination tile opens Explore pre-filtered (chip selected, list narrowed); why-strip + CTA render; pull-to-refresh themed.
3. Explore: search icon in the field; headings Fraunces; list cards show the low-seats badge where applicable.
4. Detail: badges over the gallery (top-right), icon facts row, seats badge, Fraunces sections, sticky bar price Geist SemiBold.
5. Enquiry: success shows the green check icon, auto-closes.
6. Tab bar: active tab icon is filled; labels Geist.
7. Device-polish checklist (memory): no scroll-indicator flashes, pressed states everywhere, no white flash on push/pop, keyboard-friendly taps.

- [ ] **Step 3: STATUS + hand off to review**

Append `## STATUS` (tasks + hashes + on-device result). Then user review → rebase + `--ff-only` merge (user confirms) → docs sweep (roadmap P5 row, CLAUDE.md mobile + mobile-ui rows, HANDOFF, test baselines).

---

## STATUS

- [x] Task 1 — fonts foundation (`68e2bdd`): theme `fontFamily` per variant +
      `fontFamilies`, root-layout `useFonts` + splash gate, `fontWeight` swept
      from all lib components; deps expo-font ~14.0.12 · expo-splash-screen
      ~31.0.13 · @expo-google-fonts/{fraunces ^0.4.1, geist ^0.4.2}
- [x] Task 2 — Badge (`707dbbe`)
- [x] Task 3 — Skeleton + Card shadow (`74ac102`)
- [x] Task 4 — VM badges/seats/toursCount (`7f7ff4c` + fixture fixup `682e6cd`)
- [x] Task 5 — SectionHeading + TourBadges + TourCard redesign +
      DestinationCard (`85c656e`). Execution finding: RNTL `byRole` name
      matching also scans a button's DESCENDANT text — a "1 day" chip collides
      with a 1-day tour card. Facet chips + destination tiles now carry
      `testID`s and tests press by testID.
- [x] Task 6 — Home rebuilt (`2fd0443`): hero (centred copy like web) +
      featured + destinations rail + why + CTA; `mobile.home.cta*` i18n keys
- [x] Task 7 — Explore polish (`8d6dedb`): TextField `leading` slot +
      `initialExploreState` (TDD) + autofocus from `focusSearch=1`
- [x] Task 8 — detail + modal polish (`05f7005`): gallery badges (top-right),
      icon facts, low-seats warning Badge, success check icon; zero
      `fontWeight` left in `apps/mobile/src`
- [x] Task 9 — tab bar filled active icons + styled placeholders (`b45a102`)
- [x] Task 10 — gate green (2026-07-07): mobile **39** · mobile-ui **31** ·
      i18n 1; `nx affected -t lint typecheck test --base=main` green across all
      9 projects (note: the session's `pnpm add`s wiped the generated Prisma
      client — `npx prisma generate` from `apps/api` restored it; CI does this
      every run). **On-device Expo Go check: DONE by the user (2026-07-07)** —
      brand fonts/hero/cards confirmed; feedback round produced the
      **locked equal-height TourCard rows** fix (`67b8bbf`: meta 1L · title 2L
      reserved · summary 2L on list · rating always · price 1L, web parity)
      and a locked direction decision: **"Brand 100% + Structure native"**
      (bottom tabs stay, no navbar/hamburger/footer/TechCloud; "Browse by
      experience" categories section goes to the backlog). User closed the
      wave; future visual adjustments ride later waves.
