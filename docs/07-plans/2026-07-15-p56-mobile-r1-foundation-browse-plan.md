# P5.6 R1 — "Foundation + Browse" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (repo precedent: execute inline, no worktrees). Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Ship the "Nexora Dark Heritage" foundation — retuned dark tokens,
forced dark theme, `ScrimImage`/`FloatingTabBar`/media-card primitives — and
restyle Home + Explore to the Navel-inspired image-forward language.

**Architecture:** All colors flow `tokens.mjs (darkValue)` → Style Dictionary
build → `@tourism/tokens/theme` → `buildTheme('dark')` → `useTheme()`. R1
retunes the dark ramp at the source, pins the app to dark, and introduces
presentation primitives in `@tourism/mobile-ui`; screens then compose them.
**Zero data-layer changes** — hooks, query keys, VMs untouched.

**Tech Stack:** Style Dictionary (culori oklch→hex) · Expo SDK 54 / RN 0.81 ·
expo-linear-gradient · expo-router Tabs custom `tabBar` · reanimated 4 (existing).

**Spec:** `docs/06-specs/2026-07-15-p56-mobile-navel-redesign-design.md`

## STATUS

- **State:** EXECUTED (2026-07-15) — all 8 tasks done inline, full gate green
  (lint + typecheck + test ×9 · build ×6 excl. mobile). Awaiting the user's
  on-device look pass (Task 8 Steps 1+4) before merge.
- **Branch:** `feat/mobile-r1-dark-foundation` (7 commits, on top of `main`
  which still holds 4 unpushed commits from earlier today).
- **Tests:** mobile-ui **34 → 43** (+2 theme · +3 ScrimImage · +1 card ·
  +1 button · +2 FloatingTabBar); mobile **153** (unchanged — 1 assertion
  rewritten: tour-card summary is gone by design); all other baselines intact.
- **Deviations from plan:**
  - `@react-navigation/bottom-tabs` is NOT resolvable anywhere in the
    workspace (it lives inside expo-router's dep tree) → FloatingTabBar
    declares a minimal structural `FloatingTabBarProps` instead of importing
    the real type (adding the package risked duplicating react-navigation —
    the same class of bug as the 2026-07-15 worklets incident).
  - JSX inside `jest.mock` factories crashes babel-plugin-jest-hoist →
    expo-image/expo-linear-gradient mocks live in mobile-ui's
    `src/test-setup.ts` using `React.createElement` (mirrors the app's own
    expo-image mock).
  - Token generation runs via `nx run @tourism/tokens:tokens` (the `build`
    target only compiles the TS stub) — plan Step 3 said `build`.
  - Home's SearchPill already existed as a stadium pill — only the surface
    color moved to `secondary`.
- **RESUME STATE:** hand to the user — `expo start --clear` + on-device look
  (dark everywhere · pill nav · Home/Explore media language · scrim
  legibility vs 5-6 real photos; booking flow still old-skin = EXPECTED, R2
  scope). Tune `scrim`/`media-tint` token alphas if a photo fails, then
  rebase + `--ff-only` merge on approval + docs sweep. Next: R2 plan
  (detail + money-path skin + confirmations, w/ adversarial review).

## Global Constraints

- **Presentation layer ONLY** — `src/lib/*` (booking, auth, queries), i18n
  keys, routes: read-only. If a task seems to need a data change, STOP.
- **No hex in components** — colors only via `useTheme()`; new color values
  enter ONLY in `libs/shared/tokens/style-dictionary/tokens.mjs`.
- **Dark values changed here also define web's dark ramp** — web never sets
  `.dark`, so this is inert for deployed web; still, keep values brand-sane.
- Straight quotes · Conventional Commits · no unrelated-line reformatting.
- mobile-ui rule: every RN-native dep used by the lib = **peer + dev dep**
  in `libs/mobile/ui/package.json` (module-boundaries + jest need this).
- Custom fonts on Android ignore `fontWeight` — always switch `fontFamily`.
- After metro/babel/token changes, dev loop needs `expo start --clear`.
- Jest: mock factories may only reference `mock*`-prefixed outer vars;
  `jest.clearAllMocks()` does not restore implementations.

---

### Task 1: Retune the dark token ramp + media-scrim tokens

**Files:**
- Modify: `libs/shared/tokens/style-dictionary/tokens.mjs`
- Test: `libs/shared/tokens/src/lib/tokens.spec.ts` (existing suite must stay green)

**Interfaces:**
- Produces: `theme.colors` dark keys consumed via `useTheme()` everywhere;
  two NEW keys: `media-tint`, `scrim` (both schemes).

- [ ] **Step 1: Replace the dark values** in `tokens.mjs` — edit ONLY the
  second argument of `c(light, dark)` for these keys (light values untouched):

```js
background: c('oklch(0.985 0.006 95)', 'oklch(0.24 0.025 165)'),
foreground: c('oklch(0.23 0.012 155)', 'oklch(0.94 0.015 90)'),
card: c('oklch(0.995 0.004 95)', 'oklch(0.28 0.025 165)'),
'card-foreground': c('oklch(0.23 0.012 155)', 'oklch(0.94 0.015 90)'),
popover: c('oklch(0.995 0.004 95)', 'oklch(0.28 0.025 165)'),
'popover-foreground': c('oklch(0.23 0.012 155)', 'oklch(0.94 0.015 90)'),
// Dark CTA goes BRASS (Navel amber ≈ our brass accent); light stays emerald.
primary: c('oklch(0.42 0.08 155)', 'oklch(0.75 0.11 80)'),
'primary-foreground': c('oklch(0.98 0.01 95)', 'oklch(0.24 0.03 160)'),
secondary: c('oklch(0.93 0.012 120)', 'oklch(0.31 0.022 165)'),
'secondary-foreground': c('oklch(0.3 0.02 155)', 'oklch(0.94 0.015 90)'),
muted: c('oklch(0.95 0.008 105)', 'oklch(0.31 0.022 165)'),
'muted-foreground': c('oklch(0.5 0.015 150)', 'oklch(0.72 0.02 150)'),
accent: c('oklch(0.93 0.014 130)', 'oklch(0.33 0.024 165)'),
'accent-foreground': c('oklch(0.3 0.02 155)', 'oklch(0.94 0.015 90)'),
border: c('oklch(0.9 0.01 120)', 'oklch(1 0 0 / 12%)'),
input: c('oklch(0.9 0.01 120)', 'oklch(1 0 0 / 16%)'),
ring: c('oklch(0.55 0.07 155)', 'oklch(0.72 0.1 80)'),
sidebar: c('oklch(0.97 0.008 110)', 'oklch(0.26 0.025 165)'),
```

- [ ] **Step 2: Add the two media tokens** (new lines inside `color`, after
  `overlay`) — used by `ScrimImage` in Task 3:

```js
// P5.6: uniform photo treatment — bottom scrim + full-bleed grade tint.
scrim: c('oklch(0.15 0.03 170 / 0.75)', 'oklch(0.13 0.03 170 / 0.8)'),
'media-tint': c('oklch(0.35 0.05 180 / 0.1)', 'oklch(0.3 0.05 180 / 0.16)'),
```

- [ ] **Step 3: Rebuild generated outputs**

Run: `pnpm nx build @tourism/tokens`
Expected: `libs/shared/tokens/generated/theme.js` + `tokens.css` regenerate;
build green (rn-convert already handles `/ NN%` alpha → hex8, proven by the
existing dark `border`).

- [ ] **Step 4: Verify suites still pass**

Run: `pnpm nx test @tourism/tokens && pnpm nx test mobile-ui`
Expected: 7 + 34 pass. If a spec asserts a specific dark hex, update the
assertion to the regenerated value (assertions must track tokens, not pin them).

- [ ] **Step 5: Commit**

```bash
git add libs/shared/tokens
git commit -m "feat(tokens): Nexora Dark Heritage dark ramp + scrim/media-tint tokens (P5.6 R1)"
```

---

### Task 2: Force dark scheme + `hero` type variant

**Files:**
- Modify: `libs/mobile/ui/src/lib/theme-provider.tsx`
- Modify: `libs/mobile/ui/src/lib/theme.ts`
- Modify: `apps/mobile/src/app/_layout.tsx` (2 lines)
- Test: `libs/mobile/ui/src/lib/theme-provider.spec.tsx`

**Interfaces:**
- Produces: `<ThemeProvider scheme="dark">` override prop;
  `theme.typography.hero` = `{ fontSize: 40, lineHeight: 46, fontFamily: headingBold }`.
- Existing `typography.display` (28pt) is UNCHANGED — `hero` is opt-in.

- [ ] **Step 1: Write the failing tests** (append to `theme-provider.spec.tsx`):

```tsx
test('ThemeProvider scheme prop overrides the OS color scheme', () => {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue('light');
  render(
    <ThemeProvider scheme="dark">
      <SchemeProbe />
    </ThemeProvider>,
  );
  expect(screen.getByText('dark')).toBeOnTheScreen();
});

test('buildTheme exposes the hero display variant', () => {
  const t = buildTheme('dark');
  expect(t.typography.hero).toEqual({
    fontSize: 40,
    lineHeight: 46,
    fontFamily: t.fontFamilies.headingBold,
  });
});
```

(`SchemeProbe` = the existing probe component in this spec that renders
`useTheme().scheme` as text; reuse it. Import `buildTheme` from `./theme`.)

- [ ] **Step 2: Run to verify failure**

Run: `pnpm nx test mobile-ui --testPathPatterns theme-provider`
Expected: FAIL (`scheme` prop ignored · `hero` undefined).

- [ ] **Step 3: Implement** — `theme-provider.tsx`:

```tsx
export function ThemeProvider({
  children,
  scheme,
}: {
  children: ReactNode;
  scheme?: ColorScheme;
}) {
  const osScheme = useColorScheme();
  const resolved = scheme ?? (osScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(resolved), [resolved]);
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
```

(import `type ColorScheme` from `./theme`.) In `theme.ts`, extend the
`typography` object and its interface:

```ts
typography: {
  display: TypographyVariant;
  hero: TypographyVariant;   // P5.6: one per screen, Navel-scale statement
  title: TypographyVariant;
  body: TypographyVariant;
  caption: TypographyVariant;
};
// in buildTheme():
hero: { fontSize: 40, lineHeight: 46, fontFamily: fontFamilies.headingBold },
```

- [ ] **Step 4: Pin the app to dark** — `apps/mobile/src/app/_layout.tsx`:
  `<ThemeProvider>` → `<ThemeProvider scheme="dark">` and
  `<StatusBar style="auto" />` → `<StatusBar style="light" />`.

- [ ] **Step 5: Run tests**

Run: `pnpm nx test mobile-ui && pnpm nx test @tourism/mobile`
Expected: all green (mobile specs render inside ThemeProvider w/o the prop —
unchanged default path).

- [ ] **Step 6: Commit**

```bash
git add libs/mobile/ui apps/mobile/src/app/_layout.tsx
git commit -m "feat(mobile-ui): forced-scheme ThemeProvider + hero type variant; app pins dark (P5.6 R1)"
```

---

### Task 3: `ScrimImage` primitive

**Files:**
- Create: `libs/mobile/ui/src/lib/scrim-image.tsx`
- Test: `libs/mobile/ui/src/lib/scrim-image.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts` (export)
- Modify: `libs/mobile/ui/package.json` (+ `expo-image`, `expo-linear-gradient`
  as **peer + dev**, versions copied from `apps/mobile/package.json`)

**Interfaces:**
- Produces: `ScrimImage({ uri, alt, aspectRatio?, radius?, tint?, scrim?, children? })`
  — image with brand grade-tint + bottom scrim; `children` render ON the
  image (absolute, bottom-aligned). Default `aspectRatio` 4/3, `radius`
  `theme.radius.xl`, `tint`/`scrim` default true.

- [ ] **Step 1: Install deps.** `expo-linear-gradient` may be absent from the
  app: run `pnpm exec expo install expo-linear-gradient` from `apps/mobile`
  (skip if already in its package.json; `expo-image` already is). Then add
  BOTH to `libs/mobile/ui/package.json` `peerDependencies` + `devDependencies`
  with the same version ranges as `apps/mobile/package.json`, and
  `pnpm install`.

- [ ] **Step 2: Write the failing test** (`scrim-image.spec.tsx`):

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ScrimImage } from './scrim-image';
import { ThemeProvider } from './theme-provider';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: object) => <View testID="scrim-img" {...props} /> };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => <View testID="scrim-grad" {...props} />,
  };
});

function renderIt(ui: React.ReactElement) {
  return render(<ThemeProvider scheme="dark">{ui}</ThemeProvider>);
}

test('renders image, tint, scrim and bottom-aligned children', () => {
  renderIt(
    <ScrimImage uri="https://x/img.jpg" alt="Halong Bay">
      <Text>Halong Bay</Text>
    </ScrimImage>,
  );
  expect(screen.getByTestId('scrim-img')).toBeOnTheScreen();
  expect(screen.getByTestId('scrim-grad')).toBeOnTheScreen();
  expect(screen.getByText('Halong Bay')).toBeOnTheScreen();
  expect(screen.getByLabelText('Halong Bay', { exact: false })).toBeTruthy();
});

test('tint={false} drops the grade overlay', () => {
  renderIt(<ScrimImage uri="https://x/img.jpg" alt="a" tint={false} />);
  expect(screen.queryByTestId('scrim-tint')).toBeNull();
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm nx test mobile-ui --testPathPatterns scrim-image`
Expected: FAIL ("Cannot find module './scrim-image'").

- [ ] **Step 4: Implement** (`scrim-image.tsx`):

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme-provider';

export interface ScrimImageProps {
  uri: string | undefined;
  alt: string;
  /** width/height, e.g. 4/3 (default) or 3/4 for tall hero cards. */
  aspectRatio?: number;
  radius?: number;
  /** Brand grade tint layer (uniform "color grade" over any photo). */
  tint?: boolean;
  /** Bottom legibility gradient under the children. */
  scrim?: boolean;
  /** Rendered on the image, bottom-aligned. */
  children?: ReactNode;
}

export function ScrimImage({
  uri,
  alt,
  aspectRatio = 4 / 3,
  radius,
  tint = true,
  scrim = true,
  children,
}: ScrimImageProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={alt}
      style={{
        aspectRatio,
        borderRadius: radius ?? theme.radius.xl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: theme.colors['muted'],
      }}
    >
      <Image
        source={uri ? { uri } : undefined}
        alt={alt}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
      />
      {tint ? (
        <View
          testID="scrim-tint"
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: theme.colors['media-tint'],
          }}
        />
      ) : null}
      {scrim ? (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', theme.colors['scrim']]}
          locations={[0.45, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      {children ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: theme.spacing(4),
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
```

Export from `libs/mobile/ui/src/index.ts`:
`export * from './lib/scrim-image';`

- [ ] **Step 5: Run tests** — `pnpm nx test mobile-ui` → all green
  (34 + 2 new). Also `pnpm nx lint mobile-ui typecheck mobile-ui`.

- [ ] **Step 6: Commit**

```bash
git add libs/mobile/ui apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(mobile-ui): ScrimImage primitive - uniform photo grade + legibility scrim (P5.6 R1)"
```

---

### Task 4: `Card` media variant + `Button` two-tier readiness state

**Files:**
- Modify: `libs/mobile/ui/src/lib/card.tsx`
- Modify: `libs/mobile/ui/src/lib/button.tsx`
- Test: `libs/mobile/ui/src/lib/card.spec.tsx`, `button.spec.tsx` (append)

**Interfaces:**
- Produces: `<Card variant="media">` — borderless, radius `xl`, no
  background flash behind photos. `<Button ready={false}>` — muted
  primary; `ready` defaults `true` (all existing call sites unchanged).

- [ ] **Step 1: Failing tests** — append:

```tsx
// card.spec.tsx
test('media variant drops the border and uses xl radius', () => {
  renderWithTheme(<Card variant="media" testID="card" />);
  const style = StyleSheet.flatten(screen.getByTestId('card').props.style);
  expect(style.borderWidth).toBe(0);
});

// button.spec.tsx
test('ready={false} renders the resting (muted) treatment', () => {
  renderWithTheme(<Button ready={false} onPress={jest.fn()}>Next</Button>);
  // resting still pressable (it is a validity AFFORDANCE, not disabled)
  expect(screen.getByRole('button')).not.toBeDisabled();
});
```

(match each spec file's existing render helper/name conventions.)

- [ ] **Step 2: Verify failure** — `pnpm nx test mobile-ui --testPathPatterns "card|button"` → FAIL.

- [ ] **Step 3: Implement.** `card.tsx`:

```tsx
export function Card({
  style,
  variant = 'surface',
  ...rest
}: ViewProps & { variant?: 'surface' | 'media' }) {
  const theme = useTheme();
  const media = variant === 'media';
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors['card'],
          borderRadius: media ? theme.radius.xl : theme.radius.lg,
          borderCurve: 'continuous',
          borderWidth: media ? 0 : 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
          boxShadow: media ? undefined : '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}
    />
  );
}
```

`button.tsx`: add `ready?: boolean` (default `true`) to the props; in the
style resolution for the `primary` variant, when `!ready` swap
`backgroundColor` to `theme.colors['secondary']` and text color to
`theme.colors['muted-foreground']` (keep `onPress` active — form submit
still runs validation and shows field errors). Follow the file's existing
variant-style structure; do not restructure it.

- [ ] **Step 4: Run** — `pnpm nx test mobile-ui` → green.

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui
git commit -m "feat(mobile-ui): Card media variant + Button two-tier readiness state (P5.6 R1)"
```

---

### Task 5: `FloatingTabBar` + wiring

**Files:**
- Create: `libs/mobile/ui/src/lib/floating-tab-bar.tsx`
- Test: `libs/mobile/ui/src/lib/floating-tab-bar.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts` (export)
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `useTheme()`; `react-native-safe-area-context` `useSafeAreaInsets`
  (already a mobile-ui peer+dev dep for AppSheet).
- Produces: `FloatingTabBar(props: BottomTabBarProps)` — drop-in for the
  expo-router/react-navigation `tabBar` render prop. Icon-only floating pill;
  active tab = brass rounded-square capsule; a11y labels from `options.title`.
- **Layout contract:** the bar overlays content → tabs `sceneStyle` MUST add
  `paddingBottom: 96` so lists scroll clear of it.

- [ ] **Step 1: Failing test** (`floating-tab-bar.spec.tsx`) — render with a
  minimal fake `BottomTabBarProps` (2 routes, `state.index = 0`, descriptors
  providing `title` + `tabBarIcon`), assert: both tab buttons present by
  a11y label, active one has `accessibilityState.selected === true`, and
  pressing the inactive one calls `navigation.navigate` with its route name.
  Mock `useSafeAreaInsets` → `{ bottom: 0 }` via
  `jest.mock('react-native-safe-area-context', ...)` (see AppSheet's spec for
  the repo's existing mock shape).

```tsx
test('renders tabs, marks active, navigates on press', () => {
  const navigate = jest.fn();
  renderWithTheme(<FloatingTabBar {...makeProps({ navigate })} />);
  expect(
    screen.getByLabelText('Home').props.accessibilityState.selected,
  ).toBe(true);
  fireEvent.press(screen.getByLabelText('Explore'));
  expect(navigate).toHaveBeenCalledWith('explore');
});
```

- [ ] **Step 2: Verify failure** — `pnpm nx test mobile-ui --testPathPatterns floating-tab-bar` → FAIL.

- [ ] **Step 3: Implement** (`floating-tab-bar.tsx`):

```tsx
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from './theme-provider';

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: theme.spacing(5),
        right: theme.spacing(5),
        bottom: insets.bottom + theme.spacing(3),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors['card'],
        borderRadius: 999,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: theme.colors['border'],
        paddingHorizontal: theme.spacing(2),
        paddingVertical: theme.spacing(2),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused
          ? theme.colors['primary-foreground']
          : theme.colors['muted-foreground'];
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={options.title ?? route.name}
            accessibilityState={{ selected: focused }}
            android_ripple={{
              color: theme.colors['accent'],
              borderless: true,
            }}
            onPress={() => {
              if (!focused) navigation.navigate(route.name);
            }}
            style={{
              width: 52,
              height: 52,
              borderRadius: theme.radius.lg,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused
                ? theme.colors['primary']
                : 'transparent',
            }}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
          </Pressable>
        );
      })}
    </View>
  );
}
```

Export from `index.ts`. Note: `@react-navigation/bottom-tabs` types resolve
via expo-router's dependency — if the import fails module-boundaries/types,
add it to mobile-ui peer+dev (same version the app resolves).

- [ ] **Step 4: Wire into `(tabs)/_layout.tsx`:** add
  `tabBar={(props) => <FloatingTabBar {...props} />}` on `<Tabs>`, extend
  `sceneStyle` to `{ backgroundColor: theme.colors['background'], paddingBottom: 96 }`,
  and delete the now-dead `tabBarActiveTintColor` / `tabBarInactiveTintColor`
  / `tabBarLabelStyle` / `tabBarStyle` screenOptions. Keep every
  `Tabs.Screen` `title` + `tabBarIcon` exactly as-is (FloatingTabBar consumes
  them).

- [ ] **Step 5: Run** — `pnpm nx test mobile-ui @tourism/mobile` (tab-layout
  has no dedicated spec — typecheck covers wiring):
  `pnpm nx typecheck @tourism/mobile` → green.

- [ ] **Step 6: Commit**

```bash
git add libs/mobile/ui apps/mobile/src/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): floating pill tab bar w/ brass active capsule (P5.6 R1)"
```

---

### Task 6: Home restyle (image-forward, Navel rhythm)

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/components/tour-card.tsx`
- Modify: `apps/mobile/src/components/destination-card.tsx`
- Modify: `apps/mobile/src/components/saved-mini-card.tsx`
- Modify: `apps/mobile/src/components/upcoming-trip-card.tsx`
- Test: existing specs for these components + `src/__tests__/home.spec.tsx` —
  adjust ONLY broken assertions (text/testIDs must keep passing).

**Interfaces:**
- Consumes: `ScrimImage`, `Card variant="media"`, `theme.typography.hero`.
- Produces: no API changes — every component keeps its exact props; only
  internal JSX/styles change. Data hooks, navigation handlers, i18n keys
  stay byte-identical.

- [ ] **Step 1: Card internals.** In each of the four card components: wrap
  the image in `ScrimImage` (alt from the existing VM field), move
  title/location INTO the ScrimImage children slot (`on-media` color,
  `fontFamilies.headingBold` for titles), overlay the existing
  rating/duration badges on the TOP of the image (absolute,
  `top/left/right: theme.spacing(3)`), switch the wrapper to
  `<Card variant="media">`, and delete the below-image text block except
  price (price row stays below the image on `card` background). Do NOT
  change heart-button behavior (N1 haptic) — reposition only.
- [ ] **Step 2: Home screen** (`index.tsx`): greeting adopts
  `theme.typography.hero` (2 lines max — `numberOfLines={2}`); the search
  affordance becomes a stadium pill (`borderRadius: 999`,
  `backgroundColor: theme.colors['secondary']`, search icon +
  muted placeholder text, trailing filter glyph) — SAME onPress (router
  push to Explore w/ autofocus param, untouched); horizontal rails get
  `snapToInterval` + card width `0.82 * window width` so the next card
  peeks (~15%); section headings stay `SectionHeading` (title-size, cream).
- [ ] **Step 3: Run + fix assertions** —
  `pnpm nx test @tourism/mobile --testPathPatterns "home|tour-card|destination-card|saved-mini|upcoming"`
  → adjust only assertions that referenced removed layout text (e.g. a
  description line that moved onto the image); behavior assertions
  (navigation, wishlist toggle, upcoming selection) must pass UNCHANGED.
- [ ] **Step 4: Full project check** — `pnpm nx lint @tourism/mobile typecheck @tourism/mobile test @tourism/mobile` → green.
- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): image-forward Home - hero greeting, search pill, peeking media rails (P5.6 R1)"
```

---

### Task 7: Explore restyle

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/src/components/filter-sheet.tsx` (token pass only)
- Test: `src/__tests__/explore*.spec.tsx` + filter-sheet spec — same
  assertion-only policy as Task 6.

**Interfaces:**
- Consumes: the Task-6 `tour-card.tsx` (already media-style — Explore reuses it
  full-width), `Chip` filter-pill variant.

- [ ] **Step 1:** Results header becomes a count chip (existing i18n count
  string rendered inside a `Chip` on `secondary`); list cards render
  full-width (no horizontal padding shrink), 20dp vertical gaps; keep
  FlatList props (keyExtractor, onEndReached, refreshControl) untouched.
- [ ] **Step 2:** `filter-sheet.tsx`: colors/radii audit only — surfaces to
  `secondary`, chips to the filter-pill variant, apply button
  `ready={draftChanged}` (the sheet's existing draft-state boolean). No
  draft-logic edits.
- [ ] **Step 3:** Run explore + filter suites, fix layout-only assertions;
  then `pnpm nx lint @tourism/mobile typecheck @tourism/mobile test @tourism/mobile` → green.
- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): Explore media list + count chip + filter sheet reskin (P5.6 R1)"
```

---

### Task 8: Scrim validation + gate + STATUS + hand-off

- [ ] **Step 1: On-device scrim check (user):** `expo start --clear`, view
  Home/Explore against 5–6 REAL tour photos (bright sky, dark forest, busy
  market...). Pass = every title legible, no photo crushed to black. If a
  photo fails, tune ONLY the two token values from Task 1 Step 2
  (`scrim` alpha 0.7–0.85, `media-tint` alpha 0.08–0.2) and rebuild tokens.
- [ ] **Step 2: Full gate** — kill orphaned node first, then
  `pnpm nx run-many -t lint typecheck test` and
  `pnpm nx run-many -t build --exclude=@tourism/mobile`. Expected: green;
  record new counts (mobile-ui 34 → ~38).
- [ ] **Step 3:** Update this STATUS (state · counts · deviations) + commit
  `docs(plan): P5.6 R1 STATUS`.
- [ ] **Step 4:** Hand to the user for the on-device look pass (R1 scope:
  dark everywhere · pill nav · Home/Explore new language; booking flow still
  old-skin = EXPECTED until R2). **Merge only on user approval** (rebase +
  `--ff-only`), then the standing docs sweep.

---

## Self-review notes

- Spec coverage: R1 items (dark tokens · forced dark · ScrimImage ·
  FloatingTabBar · Card media · Home · Explore · scrim validation) all have
  tasks; `StickyCTABar`/`GlowBadge` are R2 scope by design.
- Two-tier Button lands in Task 4 but its first real consumer is the Task 7
  filter sheet (`ready={draftChanged}`) — intentional, primitives-first.
- Types: `ColorScheme` import (Task 2), `ScrimImageProps.uri: string | undefined`
  matches VM image fields that may be absent; `BottomTabBarProps` source
  noted with a fallback instruction (Task 5).
