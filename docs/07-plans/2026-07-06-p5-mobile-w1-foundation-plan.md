# P5 Mobile W1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the untouched `apps/mobile` Expo scaffold into a routed, themed app whose Home tab renders real featured tours from the deployed API, with the first real `@tourism/mobile-ui` primitives and an RN-consumable tokens theme.

**Architecture:** Expo Router file-based shell (`src/app/(tabs)/…`) on the existing Expo SDK 54 scaffold; `@tourism/tokens` gains an oklch→hex conversion so `@tourism/mobile-ui` can theme via `ThemeProvider`/`useTheme`; the app talks to the API through `@tourism/core`'s `createApiClient` + TanStack Query. Copy lives in `@tourism/i18n` (`messages.mobile.*`).

**Tech Stack:** Expo SDK 54 · expo-router · React Native 0.81 StyleSheet · TanStack Query v5 · openapi-fetch client from `@tourism/core` · Style Dictionary + culori (tokens) · jest-expo + @testing-library/react-native.

**Spec:** `docs/06-specs/2026-07-06-p5-mobile-w1-foundation-design.md`

## Global Constraints

- Branch `feat/mobile-w1-foundation` in the worktree `.claude/worktrees/mobile-w1-foundation` — never run git in the main checkout (a parallel session owns it).
- All commands from the worktree repo root unless the step says otherwise. Package manager is **pnpm 11** (`pnpm nx …`, `pnpm expo …`).
- **Expo Go-compatible deps only** — no custom native modules, no `eas init`.
- **No hex colors in app/lib code** — colors come only from the generated theme (`@tourism/tokens/theme`). The tokens build script is the single place raw color math is allowed.
- **User-facing copy only via `@tourism/i18n`** (`messages.mobile.*`), EN-only.
- **Conventional Commits, no AI attribution** (repo disables it — do NOT add Co-Authored-By).
- Straight quotes in copy files; do not reformat lines a task doesn't name.
- Module boundaries: `scope:mobile` may import only `scope:mobile` + `scope:shared` (`@tourism/ui` is web-scoped — never import it).
- Mobile `build` target is an EAS cloud build — **excluded** from local verification; the gate for mobile is `lint` + `typecheck` + `test`.
- Expo SDK 54 / expo-router are post-training: if a config step behaves unexpectedly, read the live docs (Expo MCP `read_documentation` / context7) before improvising.

---

### Task 1: Tokens — RN-consumable theme (oklch → hex, rem → dp)

**Files:**
- Create: `libs/shared/tokens/style-dictionary/rn-convert.js`
- Create: `libs/shared/tokens/src/lib/rn-convert.spec.ts`
- Modify: `libs/shared/tokens/style-dictionary/build.mjs` (rn-theme format + emit `theme.d.ts`)
- Modify: `libs/shared/tokens/package.json` (culori devDependency)
- Generated (commit them): `libs/shared/tokens/generated/theme.js`, `libs/shared/tokens/generated/theme.d.ts`

**Interfaces:**
- Consumes: existing `tourism/rn-theme` Style Dictionary format in `build.mjs`.
- Produces: `@tourism/tokens/theme` now exports `theme: { colors: { light: Record<string,string>; dark: Record<string,string> }; radius: { base: number } }` with **hex** color strings and a **number** radius (dp). Task 4 imports it.

- [ ] **Step 1: Add culori**

Run: `pnpm add -D culori --filter @tourism/tokens`
Expected: `libs/shared/tokens/package.json` devDependencies gains `culori`.

- [ ] **Step 2: Write the failing test**

Create `libs/shared/tokens/src/lib/rn-convert.spec.ts`:

```ts
import { remToDp, toRnColor } from '../../style-dictionary/rn-convert.js';

describe('toRnColor', () => {
  it('converts pure black and white exactly', () => {
    expect(toRnColor('oklch(0 0 0)')).toBe('#000000');
    expect(toRnColor('oklch(1 0 0)')).toBe('#ffffff');
  });

  it('emits 8-digit hex when the color has alpha', () => {
    expect(toRnColor('oklch(0 0 0 / 0.5)')).toBe('#00000080');
    expect(toRnColor('oklch(1 0 0 / 10%)')).toMatch(/^#ffffff[0-9a-f]{2}$/);
  });

  it('keeps the emerald primary green-dominant', () => {
    const hex = toRnColor('oklch(0.42 0.08 155)');
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(
      (c) => parseInt(c, 16),
    );
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('throws on unparseable input', () => {
    expect(() => toRnColor('not-a-color')).toThrow(/unparseable/);
  });
});

describe('remToDp', () => {
  it('converts at the 16px root', () => {
    expect(remToDp('0.375rem')).toBe(6);
    expect(remToDp('1rem')).toBe(16);
  });

  it('throws on non-rem input', () => {
    expect(() => remToDp('12px')).toThrow(/expected rem/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm nx test @tourism/tokens`
Expected: FAIL — cannot find module `../../style-dictionary/rn-convert.js`.

- [ ] **Step 4: Implement the converter**

Create `libs/shared/tokens/style-dictionary/rn-convert.js` (package is `"type": "module"`, so `.js` is ESM):

```js
// oklch token strings → RN-consumable values. The ONLY place raw color math lives.
import { formatHex, formatHex8, parse } from 'culori';

/** 'oklch(0.42 0.08 155)' → '#rrggbb'; with alpha → '#rrggbbaa'. */
export function toRnColor(oklchString) {
  const color = parse(oklchString);
  if (!color) {
    throw new Error(`@tourism/tokens rn-theme: unparseable color "${oklchString}"`);
  }
  return color.alpha !== undefined && color.alpha < 1
    ? formatHex8(color)
    : formatHex(color);
}

/** '0.375rem' → 6 (dp at the 16px web root). */
export function remToDp(remString) {
  const match = /^(-?\d*\.?\d+)rem$/.exec(remString.trim());
  if (!match) {
    throw new Error(`@tourism/tokens rn-theme: expected rem value, got "${remString}"`);
  }
  return Math.round(parseFloat(match[1]) * 16);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test @tourism/tokens`
Expected: PASS (existing `tokens.spec.ts` + new `rn-convert.spec.ts`).

- [ ] **Step 6: Wire the converter into the rn-theme format + emit a d.ts**

In `libs/shared/tokens/style-dictionary/build.mjs`:

(a) Add to the imports at the top:

```js
import { remToDp, toRnColor } from './rn-convert.js';
```

(b) Replace the whole `tourism/rn-theme` `registerFormat` block (the one headed by the "React Native theme stub" comment) with:

```js
// React Native theme — hex colors + dp radius, consumed by @tourism/mobile-ui.
StyleDictionary.registerFormat({
  name: 'tourism/rn-theme',
  format: ({ dictionary }) => {
    const colors = dictionary.allTokens.filter((t) => t.path[0] === 'color');
    const radius = dictionary.allTokens.find((t) => t.path[0] === 'radius');
    const key = (t) => t.path.slice(1).join('-');
    const entries = (pick) =>
      colors.map((t) => `      '${key(t)}': '${toRnColor(pick(t))}',`).join('\n');

    return [
      '// GENERATED by @tourism/tokens (Style Dictionary). Do not edit by hand.',
      '// RN theme — hex colors (converted from oklch) + dp radius.',
      'export const theme = {',
      '  colors: {',
      '    light: {',
      entries((t) => t.original.value),
      '    },',
      '    dark: {',
      entries((t) => t.original.darkValue),
      '    },',
      '  },',
      `  radius: { base: ${remToDp(radius.original.value)} },`,
      '};',
      '',
      'export default theme;',
      '',
    ].join('\n');
  },
});

// Type surface for the generated theme.js (emitted together so they stay in lockstep).
StyleDictionary.registerFormat({
  name: 'tourism/rn-theme-dts',
  format: () =>
    [
      '// GENERATED by @tourism/tokens (Style Dictionary). Do not edit by hand.',
      'export interface RnTheme {',
      '  colors: {',
      '    light: Record<string, string>;',
      '    dark: Record<string, string>;',
      '  };',
      '  radius: { base: number };',
      '}',
      'export declare const theme: RnTheme;',
      'export default theme;',
      '',
    ].join('\n'),
});
```

(c) In the `files` array of the `tailwind` platform, add the d.ts next to `theme.js`:

```js
      files: [
        { destination: 'tokens.css', format: 'tourism/tailwind-css' },
        { destination: 'theme.js', format: 'tourism/rn-theme' },
        { destination: 'theme.d.ts', format: 'tourism/rn-theme-dts' },
      ],
```

- [ ] **Step 7: Regenerate + eyeball**

Run: `pnpm nx run @tourism/tokens:tokens`
Expected: `generated/theme.js` now contains only `'#rrggbb'`/`'#rrggbbaa'` strings and `radius: { base: 6 }`; `generated/theme.d.ts` exists; `generated/tokens.css` is **unchanged** (`git diff --stat libs/shared/tokens/generated` shows no tokens.css change).

- [ ] **Step 8: Full-lib check + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=@tourism/tokens`
Expected: all PASS.

```bash
git add libs/shared/tokens pnpm-lock.yaml
git commit -m "feat(tokens): RN theme emits hex colors + dp radius (oklch converted at build)"
```

---

### Task 2: i18n — `messages.mobile.*` copy section

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts`

**Interfaces:**
- Produces: `messages.mobile.tabs.{home,explore,saved,account}`, `messages.mobile.home.{greeting,subtitle,featuredTitle,slowServer,error,retry,empty,from,durationDays(n)}`, `messages.mobile.placeholders.{explore,saved,account}` — Tasks 3, 8, 9 read exactly these keys.

- [ ] **Step 1: Add the section**

In `libs/shared/i18n/src/lib/messages.ts`, add a new top-level key immediately **before the closing `} as const`** of the `messages` object (keep a trailing comma on the previous last section):

```ts
  // Mobile app (P5, customer-facing Expo app).
  mobile: {
    tabs: {
      home: 'Home',
      explore: 'Explore',
      saved: 'Saved',
      account: 'Account',
    },
    home: {
      greeting: 'Where to next?',
      subtitle: 'Handcrafted journeys across Vietnam',
      featuredTitle: 'Featured tours',
      slowServer: 'Waking the server — the first load can take up to a minute…',
      error: "Couldn't load tours. Check your connection and try again.",
      retry: 'Try again',
      empty: 'No tours to show yet — check back soon.',
      from: 'From',
      durationDays: (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`,
    },
    placeholders: {
      explore: 'Browse all tours and destinations — coming in the next update.',
      saved: 'Your saved tours will live here. Sign-in arrives in a later update.',
      account: 'Manage your profile and bookings here soon.',
    },
  },
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=@tourism/i18n`
Expected: PASS.

```bash
git add libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(i18n): mobile copy section (tabs, home, placeholders)"
```

---

### Task 3: Expo Router shell — deps, entry, tabs, placeholders

**Files:**
- Modify: `apps/mobile/package.json` (deps + `main`)
- Modify: `apps/mobile/app.json` (name/scheme/plugin)
- Modify: `apps/mobile/metro.config.js` (source-condition resolution)
- Modify: `apps/mobile/jest.config.cts` (moduleNameMapper + transformIgnorePatterns)
- Delete: `apps/mobile/index.js`, `apps/mobile/src/app/App.tsx`, `apps/mobile/src/app/App.spec.tsx`
- Create: `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/app/(tabs)/_layout.tsx`, `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/app/(tabs)/explore.tsx`, `apps/mobile/src/app/(tabs)/saved.tsx`, `apps/mobile/src/app/(tabs)/account.tsx`
- Test: `apps/mobile/src/app/(tabs)/explore.spec.tsx`

**Interfaces:**
- Consumes: `messages.mobile.*` (Task 2).
- Produces: the routed shell. Task 7 rewrites `_layout.tsx` (providers); Task 8 rewrites `(tabs)/index.tsx` (real Home); Task 9 restyles the other tabs. Placeholder screens deliberately use **plain RN components with no colors** (theme arrives in Tasks 4-7).

- [ ] **Step 1: Install dependencies**

From `apps/mobile/` (the `expo install` command picks SDK-54-compatible versions — do not pin by hand):

```bash
cd apps/mobile
pnpm expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-image @expo/vector-icons
pnpm add @tanstack/react-query
pnpm add @tourism/core@workspace:* @tourism/i18n@workspace:* @tourism/tokens@workspace:*
cd ../..
```

Expected: all land in `apps/mobile/package.json` dependencies; lockfile updates; no build-script approval prompts (if one appears, STOP and surface it — `allowBuilds` lives in `pnpm-workspace.yaml`).

- [ ] **Step 2: Switch the entry point to expo-router**

In `apps/mobile/package.json` add the `main` field (top level, next to `"name"`):

```json
  "main": "expo-router/entry",
```

Delete `apps/mobile/index.js`.

- [ ] **Step 3: App config**

In `apps/mobile/app.json` set the display name, a real deep-link scheme, and the router plugin — change only these keys:

```json
    "name": "Nexora",
    "scheme": "nexora",
```

and extend `plugins`:

```json
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
```

(The splash `backgroundColor` hex pre-exists in generated config — leave it.)

- [ ] **Step 4: Metro resolves workspace TS source**

In `apps/mobile/metro.config.js`, on the config object passed to `withNxMetro`, add the `@tourism/source` exports condition so Metro loads `libs/shared/*` TypeScript directly (no dist build needed):

```js
customConfig.resolver.unstable_conditionNames = [
  '@tourism/source',
  'react-native',
  'require',
  'import',
];
```

(Adapt to the file's actual shape — the key point is `resolver.unstable_conditionNames` with `'@tourism/source'` first.)

- [ ] **Step 5: Jest resolves workspace source + transforms it**

In `apps/mobile/jest.config.cts` add to the exported object:

```ts
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
    '^@tourism/core$': '<rootDir>/../../libs/shared/core/src/index.ts',
    '^@tourism/i18n$': '<rootDir>/../../libs/shared/i18n/src/index.ts',
    '^@tourism/tokens/theme$':
      '<rootDir>/../../libs/shared/tokens/generated/theme.js',
    '^@tourism/mobile-ui$': '<rootDir>/../../libs/mobile/ui/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(-google-fonts)?|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack)/)',
  ],
```

(`moduleNameMapper` extends the existing `'[.]svg$'`-only map — keep the svg line. The mobile-ui mapping is used from Task 7 on.)

- [ ] **Step 6: Root layout + tabs + placeholder screens**

Delete `apps/mobile/src/app/App.tsx` and `apps/mobile/src/app/App.spec.tsx`.

Create `apps/mobile/src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
```

Create `apps/mobile/src/app/(tabs)/_layout.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { messages } from '@tourism/i18n';

const t = messages.mobile.tabs;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t.explore,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t.saved,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t.account,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

Create `apps/mobile/src/app/(tabs)/index.tsx` (temporary — Task 8 replaces it):

```tsx
import { Text, View } from 'react-native';
import { messages } from '@tourism/i18n';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{messages.mobile.home.greeting}</Text>
    </View>
  );
}
```

Create `apps/mobile/src/app/(tabs)/explore.tsx`:

```tsx
import { Text, View } from 'react-native';
import { messages } from '@tourism/i18n';

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text>{messages.mobile.placeholders.explore}</Text>
    </View>
  );
}
```

Create `(tabs)/saved.tsx` and `(tabs)/account.tsx` identically but with `messages.mobile.placeholders.saved` / `messages.mobile.placeholders.account` and component names `SavedScreen` / `AccountScreen`.

- [ ] **Step 7: Write the smoke test**

Create `apps/mobile/src/app/(tabs)/explore.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import ExploreScreen from './explore';

test('explore placeholder renders its copy', () => {
  render(<ExploreScreen />);
  expect(screen.getByText(/coming in the next update/i)).toBeOnTheScreen();
});
```

- [ ] **Step 8: Verify**

Run: `pnpm nx run-many -t lint typecheck test --projects=@tourism/mobile`
Expected: PASS (1 test). If jest chokes on an untransformed ESM module, the failing module belongs in the `transformIgnorePatterns` allowlist from Step 5 — add it there, don't ad-hoc mock.

- [ ] **Step 9: Boot check on the dev machine**

Run: `pnpm nx start @tourism/mobile` (leave running just long enough to see the QR + "Metro waiting").
Expected: Metro bundles without redbox errors. Full phone check happens in Task 10 — kill the server after confirming it boots.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile pnpm-lock.yaml
git commit -m "feat(mobile): expo-router shell — 4-tab layout + placeholder screens"
```

---

### Task 4: mobile-ui — theme adapter + ThemeProvider/useTheme

**Files:**
- Modify: `libs/mobile/ui/package.json` (deps)
- Modify: `libs/mobile/ui/jest.config.cts` (moduleNameMapper)
- Delete: `libs/mobile/ui/src/lib/mobile-ui.tsx`, `libs/mobile/ui/src/lib/mobile-ui.spec.tsx`
- Create: `libs/mobile/ui/src/lib/theme.ts`, `libs/mobile/ui/src/lib/theme.spec.ts`, `libs/mobile/ui/src/lib/theme-provider.tsx`, `libs/mobile/ui/src/lib/theme-provider.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Consumes: `@tourism/tokens/theme` (Task 1's hex theme).
- Produces (Tasks 5-9 rely on these exact names):
  - `buildTheme(scheme: 'light' | 'dark'): Theme`
  - `interface Theme { scheme; colors: Record<string, string>; radius: { sm; md; lg; xl: number }; spacing(steps: number): number; typography: { display; title; body; caption } }`
  - `<ThemeProvider>{children}</ThemeProvider>` and `useTheme(): Theme`

- [ ] **Step 1: Wire deps + jest**

In `libs/mobile/ui/package.json` add:

```json
  "dependencies": {
    "@tourism/tokens": "workspace:*"
  },
```

In `libs/mobile/ui/jest.config.cts` add to the exported object (keep the existing svg mapping):

```ts
  moduleNameMapper: {
    '[.]svg$': '@nx/expo/plugins/jest/svg-mock',
    '^@tourism/tokens/theme$':
      '<rootDir>/../../shared/tokens/generated/theme.js',
  },
```

Run `pnpm install` (links the workspace dep).

- [ ] **Step 2: Write the failing theme test**

Create `libs/mobile/ui/src/lib/theme.spec.ts`:

```ts
import { buildTheme } from './theme';

describe('buildTheme', () => {
  it('exposes hex token colors per scheme', () => {
    const light = buildTheme('light');
    const dark = buildTheme('dark');
    expect(light.colors['background']).toMatch(/^#[0-9a-f]{6,8}$/);
    expect(dark.colors['background']).toMatch(/^#[0-9a-f]{6,8}$/);
    expect(light.colors['background']).not.toBe(dark.colors['background']);
  });

  it('derives the radius scale from the base dp', () => {
    const { radius } = buildTheme('light');
    expect(radius.md).toBe(6);
    expect(radius.sm).toBe(3);
    expect(radius.lg).toBe(9);
    expect(radius.xl).toBe(12);
  });

  it('spaces on a 4dp grid', () => {
    expect(buildTheme('light').spacing(4)).toBe(16);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm nx test mobile-ui`
Expected: FAIL — `./theme` not found.

- [ ] **Step 4: Implement the theme adapter**

Create `libs/mobile/ui/src/lib/theme.ts`:

```ts
import { theme as tokens } from '@tourism/tokens/theme';

export type ColorScheme = 'light' | 'dark';

export interface TypographyVariant {
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  lineHeight: number;
}

export interface Theme {
  scheme: ColorScheme;
  /** Token colors (hex), keyed like the web CSS vars: background, foreground, primary, … */
  colors: Record<string, string>;
  radius: { sm: number; md: number; lg: number; xl: number };
  /** 4dp grid: spacing(4) = 16. */
  spacing: (steps: number) => number;
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
    typography: {
      display: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
      title: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm nx test mobile-ui`
Expected: theme.spec PASS (the old `mobile-ui.spec.tsx` still passes; it is deleted in Step 6).

- [ ] **Step 6: Provider + hook (test-first)**

Delete `libs/mobile/ui/src/lib/mobile-ui.tsx` and `libs/mobile/ui/src/lib/mobile-ui.spec.tsx`.

Create `libs/mobile/ui/src/lib/theme-provider.spec.tsx`:

```tsx
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './theme-provider';

function Probe() {
  const theme = useTheme();
  return <Text>{theme.colors['primary']}</Text>;
}

test('useTheme returns the token theme inside the provider', () => {
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(/^#[0-9a-f]{6,8}$/)).toBeOnTheScreen();
});

test('useTheme throws outside the provider', () => {
  expect(() => render(<Probe />)).toThrow(/inside <ThemeProvider>/);
});
```

Run `pnpm nx test mobile-ui` → FAIL (`./theme-provider` missing). Then create `libs/mobile/ui/src/lib/theme-provider.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { buildTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(
    () => buildTheme(scheme === 'dark' ? 'dark' : 'light'),
    [scheme],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
```

Replace the contents of `libs/mobile/ui/src/index.ts`:

```ts
export { buildTheme } from './lib/theme';
export type { ColorScheme, Theme, TypographyVariant } from './lib/theme';
export { ThemeProvider, useTheme } from './lib/theme-provider';
```

- [ ] **Step 7: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=mobile-ui`
Expected: PASS.

```bash
git add libs/mobile/ui pnpm-lock.yaml
git commit -m "feat(mobile-ui): tokens theme adapter + ThemeProvider/useTheme"
```

---

### Task 5: mobile-ui — AppText, Screen, Spinner

**Files:**
- Create: `libs/mobile/ui/src/lib/app-text.tsx` (+ `app-text.spec.tsx`), `libs/mobile/ui/src/lib/screen.tsx` (+ `screen.spec.tsx`), `libs/mobile/ui/src/lib/spinner.tsx` (+ `spinner.spec.tsx`)
- Modify: `libs/mobile/ui/package.json`, `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Consumes: `useTheme()` (Task 4).
- Produces: `<AppText variant? muted?>`, `<Screen scroll? scrollProps? testID?>`, `<Spinner size?>` — used by Tasks 8-9.

- [ ] **Step 1: Add safe-area dep**

`react-native-safe-area-context` is already installed in `apps/mobile` (Task 3). Add it to `libs/mobile/ui/package.json` as a peer (match the version range `apps/mobile/package.json` got from `expo install`) and as a devDependency for tests:

```json
  "peerDependencies": {
    "react": "^19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "<same range as apps/mobile>"
  },
  "devDependencies": {
    "react-native-safe-area-context": "<same range as apps/mobile>"
  },
```

Run `pnpm install`.

- [ ] **Step 2: Failing tests**

Create `libs/mobile/ui/src/lib/app-text.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { AppText } from './app-text';

test('renders children with the variant typography', () => {
  render(
    <ThemeProvider>
      <AppText variant="title">Hello</AppText>
    </ThemeProvider>,
  );
  const node = screen.getByText('Hello');
  expect(node.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ fontSize: 20 })]),
  );
});
```

Create `libs/mobile/ui/src/lib/screen.spec.tsx`:

```tsx
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Screen } from './screen';

test('wraps children in a themed safe container', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText('Body')).toBeOnTheScreen();
  expect(screen.getByTestId('screen')).toBeOnTheScreen();
});
```

Create `libs/mobile/ui/src/lib/spinner.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Spinner } from './spinner';

test('renders an activity indicator', () => {
  render(
    <ThemeProvider>
      <Spinner testID="spinner" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('spinner')).toBeOnTheScreen();
});
```

Run: `pnpm nx test mobile-ui` → FAIL (modules missing).

- [ ] **Step 3: Implement**

Create `libs/mobile/ui/src/lib/app-text.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';
import { useTheme } from './theme-provider';
import type { Theme } from './theme';

export interface AppTextProps extends TextProps {
  variant?: keyof Theme['typography'];
  /** Muted foreground (secondary copy). */
  muted?: boolean;
}

export function AppText({ variant = 'body', muted, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.typography[variant],
        { color: muted ? theme.colors['muted-foreground'] : theme.colors['foreground'] },
        style,
      ]}
    />
  );
}
```

Create `libs/mobile/ui/src/lib/screen.tsx`:

```tsx
import type { ComponentProps } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme-provider';

export interface ScreenProps extends ViewProps {
  /** Render children in a ScrollView (default true — most screens scroll). */
  scroll?: boolean;
  /** Extra props forwarded to the ScrollView (e.g. refreshControl). */
  scrollProps?: ComponentProps<typeof ScrollView>;
}

export function Screen({ scroll = true, scrollProps, children, style, ...rest }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const outer = {
    flex: 1,
    backgroundColor: theme.colors['background'],
    paddingTop: insets.top,
  };
  if (!scroll) {
    return (
      <View {...rest} style={[outer, { paddingHorizontal: theme.spacing(4) }, style]}>
        {children}
      </View>
    );
  }
  return (
    <View {...rest} style={[outer, style]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingBottom: theme.spacing(6),
        }}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}
```

Create `libs/mobile/ui/src/lib/spinner.tsx`:

```tsx
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import { useTheme } from './theme-provider';

export function Spinner(props: ActivityIndicatorProps) {
  const theme = useTheme();
  return <ActivityIndicator color={theme.colors['primary']} {...props} />;
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { AppText } from './lib/app-text';
export type { AppTextProps } from './lib/app-text';
export { Screen } from './lib/screen';
export type { ScreenProps } from './lib/screen';
export { Spinner } from './lib/spinner';
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=mobile-ui`
Expected: PASS.

```bash
git add libs/mobile/ui pnpm-lock.yaml
git commit -m "feat(mobile-ui): AppText, Screen, Spinner primitives"
```

---

### Task 6: mobile-ui — Button, Card

**Files:**
- Create: `libs/mobile/ui/src/lib/button.tsx` (+ `button.spec.tsx`), `libs/mobile/ui/src/lib/card.tsx` (+ `card.spec.tsx`)
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Produces: `<Button label onPress variant?="primary"|"outline" disabled? loading?>`, `<Card>` — used by Task 8.

- [ ] **Step 1: Failing tests**

Create `libs/mobile/ui/src/lib/button.spec.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Button } from './button';

test('fires onPress', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={onPress} />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Book now' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('disabled blocks presses', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={onPress} disabled loading testID="btn" />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByTestId('btn'));
  expect(onPress).not.toHaveBeenCalled();
});
```

Create `libs/mobile/ui/src/lib/card.spec.tsx`:

```tsx
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Card } from './card';

test('renders children on a themed surface', () => {
  render(
    <ThemeProvider>
      <Card testID="card">
        <Text>Inside</Text>
      </Card>
    </ThemeProvider>,
  );
  expect(screen.getByText('Inside')).toBeOnTheScreen();
});
```

Run: `pnpm nx test mobile-ui` → FAIL.

- [ ] **Step 2: Implement**

Create `libs/mobile/ui/src/lib/button.tsx`:

```tsx
import { Pressable, type PressableProps } from 'react-native';
import { AppText } from './app-text';
import { Spinner } from './spinner';
import { useTheme } from './theme-provider';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'outline';
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing(2),
        minHeight: 44,
        paddingHorizontal: theme.spacing(5),
        borderRadius: theme.radius.md,
        backgroundColor: primary ? theme.colors['primary'] : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: theme.colors['border'],
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? <Spinner size="small" /> : null}
      <AppText
        variant="body"
        style={{
          fontWeight: '600',
          color: primary ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
```

Create `libs/mobile/ui/src/lib/card.tsx`:

```tsx
import { View, type ViewProps } from 'react-native';
import { useTheme } from './theme-provider';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors['card'],
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors['border'],
          overflow: 'hidden',
        },
        style,
      ]}
    />
  );
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { Button } from './lib/button';
export type { ButtonProps } from './lib/button';
export { Card } from './lib/card';
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=mobile-ui`
Expected: PASS.

```bash
git add libs/mobile/ui
git commit -m "feat(mobile-ui): Button + Card primitives"
```

---

### Task 7: App wiring — env, API client, providers

**Files:**
- Create: `apps/mobile/.env`, `apps/mobile/src/lib/env.ts` (+ `env.spec.ts`), `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/package.json` (add `@tourism/mobile-ui`), `apps/mobile/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `createApiClient` from `@tourism/core`; `ThemeProvider` from `@tourism/mobile-ui`.
- Produces: `resolveApiBaseUrl(raw: string | undefined): string`, `API_BASE_URL: string` (from `src/lib/env.ts`), `getApiClient(): ApiClient` (from `src/lib/api.ts`) — Task 8 imports `getApiClient`.

- [ ] **Step 1: Add the mobile-ui dep**

```bash
cd apps/mobile && pnpm add @tourism/mobile-ui@workspace:* && cd ../..
```

- [ ] **Step 2: Failing env test**

Create `apps/mobile/src/lib/env.spec.ts`:

```ts
import { resolveApiBaseUrl } from './env';

describe('resolveApiBaseUrl', () => {
  it('accepts an https origin and strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('accepts a LAN http origin', () => {
    expect(resolveApiBaseUrl('http://192.168.1.20:3000')).toBe('http://192.168.1.20:3000');
  });

  it('throws a setup-pointing error when missing or malformed', () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
    expect(() => resolveApiBaseUrl('not-a-url')).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });
});
```

Run: `pnpm nx test @tourism/mobile` → FAIL (`./env` missing).

- [ ] **Step 3: Implement env + api + .env**

Create `apps/mobile/src/lib/env.ts`:

```ts
/** Validates the API origin once at startup — fails loud instead of silent fetch errors. */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, '');
  if (!value || !/^https?:\/\/.+/.test(value)) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is missing or not an http(s) origin — set it in apps/mobile/.env',
    );
  }
  return value;
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
```

Create `apps/mobile/src/lib/api.ts`:

```ts
import { createApiClient, type ApiClient } from '@tourism/core';
import { API_BASE_URL } from './env';

let client: ApiClient | undefined;

/** App-wide typed API client (no auth token in W1 — getToken arrives with W3 auth). */
export function getApiClient(): ApiClient {
  client ??= createApiClient({ baseUrl: API_BASE_URL });
  return client;
}
```

Create `apps/mobile/.env` (committed — `EXPO_PUBLIC_*` is public by definition):

```env
# API origin (no /api/v1 suffix — the client adds route paths).
# LAN debugging: point at your PC, e.g. http://192.168.1.20:3000 (phone + PC on the same Wi-Fi).
EXPO_PUBLIC_API_BASE_URL=https://tourism-api-pqwr.onrender.com
```

If the root `.gitignore` (or an app-level one) ignores `.env`, add an exception `!apps/mobile/.env` — this file must be committed.

- [ ] **Step 4: Providers in the root layout**

Replace `apps/mobile/src/app/_layout.tsx` with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@tourism/mobile-ui';

const queryClient = new QueryClient({
  // Render free tier cold-starts (~30s): keep retrying a bit before erroring.
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60_000 } },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=@tourism/mobile`
Expected: PASS (env spec + explore smoke test).

```bash
git add apps/mobile pnpm-lock.yaml
git commit -m "feat(mobile): env-validated API client + theme/query providers"
```

---

### Task 8: Home — tour view-model, TourCard, real-data screen

**Files:**
- Create: `apps/mobile/src/lib/tours.ts` (+ `tours.spec.ts`), `apps/mobile/src/components/tour-card.tsx`
- Rewrite: `apps/mobile/src/app/(tabs)/index.tsx`
- Test: `apps/mobile/src/app/(tabs)/index.spec.tsx`

**Interfaces:**
- Consumes: `getApiClient()` (Task 7), `Screen`/`AppText`/`Card`/`Button`/`Spinner`/`useTheme` (Tasks 4-6), `messages.mobile.home` (Task 2).
- Produces: `toTourCardVm(dto: TourSummaryDto): TourCardVm`, `fetchFeaturedTours(): Promise<TourCardVm[]>`, `<TourCard tour={TourCardVm}>`.

- [ ] **Step 1: Failing view-model test**

Create `apps/mobile/src/lib/tours.spec.ts`:

```ts
import { toTourCardVm, type TourSummaryDto } from './tours';

const dto = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  durationDays: 3,
  basePrice: '450',
  currency: 'USD',
  destinations: [
    { isPrimary: false, destination: { name: 'Hanoi' } },
    { isPrimary: true, destination: { name: 'Ha Long' } },
  ],
  media: [
    { role: 'gallery', url: 'https://img.test/g.jpg' },
    { role: 'hero', url: 'https://img.test/h.jpg' },
  ],
} as unknown as TourSummaryDto;

describe('toTourCardVm', () => {
  it('picks the primary destination and hero image', () => {
    const vm = toTourCardVm(dto);
    expect(vm).toEqual({
      slug: 'ha-long-cruise',
      title: 'Ha Long Bay Cruise',
      destination: 'Ha Long',
      durationDays: 3,
      price: 450,
      currency: 'USD',
      image: 'https://img.test/h.jpg',
    });
  });

  it('falls back to first destination/media when no primary/hero', () => {
    const bare = {
      ...dto,
      destinations: [{ isPrimary: false, destination: { name: 'Hanoi' } }],
      media: [{ role: 'gallery', url: 'https://img.test/g.jpg' }],
    } as unknown as TourSummaryDto;
    const vm = toTourCardVm(bare);
    expect(vm.destination).toBe('Hanoi');
    expect(vm.image).toBe('https://img.test/g.jpg');
  });
});
```

Run: `pnpm nx test @tourism/mobile` → FAIL.

- [ ] **Step 2: Implement `tours.ts`**

Create `apps/mobile/src/lib/tours.ts` (mirrors `apps/web/src/lib/api/tours.ts`'s adapter, trimmed to what the mobile card renders):

```ts
import type { components } from '@tourism/core';
import { getApiClient } from './api';

export type TourSummaryDto = components['schemas']['TourSummaryDto'];

export interface TourCardVm {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  price: number;
  currency: string;
  image?: string;
}

export function toTourCardVm(dto: TourSummaryDto): TourCardVm {
  const primary = dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    durationDays: dto.durationDays,
    price: Number(dto.basePrice),
    currency: dto.currency,
    image: hero?.url,
  };
}

/** Featured tours for the Home shelf — same query shape the web home uses. */
export async function fetchFeaturedTours(): Promise<TourCardVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { featured: true, pageSize: 8 } },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCardVm);
}
```

Run: `pnpm nx test @tourism/mobile` → view-model tests PASS.

- [ ] **Step 3: TourCard component**

Create `apps/mobile/src/components/tour-card.tsx`:

```tsx
import { View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';

const t = messages.mobile.home;

export function TourCard({ tour }: { tour: TourCardVm }) {
  const theme = useTheme();
  return (
    <Card style={{ width: 240 }}>
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{ width: '100%', height: 130, backgroundColor: theme.colors['muted'] }}
        contentFit="cover"
        accessibilityLabel={tour.title}
      />
      <View style={{ padding: theme.spacing(3), gap: theme.spacing(1) }}>
        <AppText variant="caption" muted>
          {tour.destination} · {t.durationDays(tour.durationDays)}
        </AppText>
        <AppText variant="title" numberOfLines={2}>
          {tour.title}
        </AppText>
        <AppText variant="body">
          {t.from} {tour.currency === 'USD' ? '$' : ''}{tour.price}
        </AppText>
      </View>
    </Card>
  );
}
```

- [ ] **Step 4: Failing Home state tests**

Create `apps/mobile/src/app/(tabs)/index.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from './index';
import { fetchFeaturedTours } from '../../lib/tours';

jest.mock('../../lib/tours', () => ({
  ...jest.requireActual('../../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));

const mockFetch = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  price: 450,
  currency: 'USD',
  image: 'https://img.test/h.jpg',
};

test('renders featured tours on success', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
});

test('renders the error state with retry', async () => {
  mockFetch.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});

test('renders the empty state', async () => {
  mockFetch.mockResolvedValueOnce([]);
  renderHome();
  expect(await screen.findByText(/no tours to show yet/i)).toBeOnTheScreen();
});
```

Run: `pnpm nx test @tourism/mobile` → FAIL (Home still the Task-3 placeholder).

- [ ] **Step 5: Implement the Home screen**

Replace `apps/mobile/src/app/(tabs)/index.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Card, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import { TourCard } from '../../components/tour-card';
import { fetchFeaturedTours } from '../../lib/tours';

const brand = messages.brand;
const t = messages.mobile.home;

/** After ~3s of loading, explain the Render cold start so it doesn't read as broken. */
function SlowServerHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <AppText variant="caption" muted style={{ textAlign: 'center' }}>
      {t.slowServer}
    </AppText>
  );
}

function SkeletonShelf() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          style={{ width: 240, height: 220, backgroundColor: theme.colors['muted'] }}
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['tours', 'featured'],
    queryFn: fetchFeaturedTours,
  });

  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        ),
      }}
    >
      <View style={{ gap: theme.spacing(2), paddingVertical: theme.spacing(4) }}>
        <AppText variant="display">{brand.name}</AppText>
        <AppText variant="title">{t.greeting}</AppText>
        <AppText variant="body" muted>
          {t.subtitle}
        </AppText>
      </View>

      <AppText variant="title" style={{ marginBottom: theme.spacing(3) }}>
        {t.featuredTitle}
      </AppText>

      {isPending ? (
        <View style={{ gap: theme.spacing(3) }}>
          <SkeletonShelf />
          <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
            <Spinner />
            <SlowServerHint />
          </View>
        </View>
      ) : isError ? (
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing(3),
            paddingVertical: theme.spacing(6),
          }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.error}
          </AppText>
          <Button label={t.retry} onPress={() => refetch()} />
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => <TourCard tour={item} />}
          ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
          showsHorizontalScrollIndicator={false}
        />
      ) : (
        <AppText
          variant="body"
          muted
          style={{ textAlign: 'center', paddingVertical: theme.spacing(6) }}
        >
          {t.empty}
        </AppText>
      )}
    </Screen>
  );
}
```

Note: a horizontal `FlatList` inside `Screen`'s vertical ScrollView is fine (axes differ). If jest warns about nested VirtualizedLists, it's cross-axis and safe to ignore.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm nx test @tourism/mobile`
Expected: PASS (env + tours + explore + 3 Home state tests).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): Home with real featured tours (loading/error/empty + pull-to-refresh)"
```

---

### Task 9: Placeholder tabs on the design system + themed tab bar

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`, `(tabs)/explore.tsx`, `(tabs)/saved.tsx`, `(tabs)/account.tsx`, `(tabs)/explore.spec.tsx`

**Interfaces:**
- Consumes: `Screen`, `AppText`, `useTheme` (Tasks 4-5).

- [ ] **Step 1: Themed tab bar**

In `apps/mobile/src/app/(tabs)/_layout.tsx`, use the theme for tab colors — add the import and replace `screenOptions`:

```tsx
import { useTheme } from '@tourism/mobile-ui';
```

```tsx
  const theme = useTheme();
  // inside <Tabs …>:
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors['primary'],
        tabBarInactiveTintColor: theme.colors['muted-foreground'],
        tabBarStyle: {
          backgroundColor: theme.colors['background'],
          borderTopColor: theme.colors['border'],
        },
      }}
```

(The component body now calls `useTheme()`, so `TabsLayout` must render inside `ThemeProvider` — it does, via the root layout.)

- [ ] **Step 2: Placeholder screens on primitives**

Replace `apps/mobile/src/app/(tabs)/explore.tsx` with:

```tsx
import { View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, Screen, useTheme } from '@tourism/mobile-ui';

export default function ExploreScreen() {
  const theme = useTheme();
  return (
    <Screen scroll={false}>
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(2) }}
      >
        <AppText variant="title">{messages.mobile.tabs.explore}</AppText>
        <AppText variant="body" muted style={{ textAlign: 'center' }}>
          {messages.mobile.placeholders.explore}
        </AppText>
      </View>
    </Screen>
  );
}
```

Apply the same shape to `saved.tsx` (`tabs.saved` + `placeholders.saved`, component `SavedScreen`) and `account.tsx` (`tabs.account` + `placeholders.account`, component `AccountScreen`).

- [ ] **Step 3: Fix the explore smoke test wrappers**

`explore.spec.tsx` now needs providers. Replace its contents with:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ExploreScreen from './explore';

test('explore placeholder renders its copy', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <ExploreScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText(/coming in the next update/i)).toBeOnTheScreen();
});
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test --projects=@tourism/mobile`
Expected: PASS.

```bash
git add apps/mobile
git commit -m "feat(mobile): themed tab bar + placeholder tabs on mobile-ui primitives"
```

---

### Task 10: Runbook, full gate, on-device verification

**Files:**
- Modify: `docs/05-runbooks/local-dev.md` (new "Mobile (Expo Go)" section)

- [ ] **Step 1: Runbook section**

Append to `docs/05-runbooks/local-dev.md`:

```markdown
## Mobile (Expo Go)

Dev loop is a **physical Android phone + Expo Go** (Windows host, no emulator needed).

1. Install "Expo Go" from the Play Store (once).
2. `pnpm nx start @tourism/mobile` → scan the QR with Expo Go (phone + PC on the same Wi-Fi).
3. The app calls the **deployed Render API** by default (`apps/mobile/.env` →
   `EXPO_PUBLIC_API_BASE_URL=https://tourism-api-pqwr.onrender.com`). First fetch after idle
   can take ~30s (free-tier cold start) — the Home screen shows a "waking the server" hint.
4. **Local-API debugging:** run `pnpm nx serve @tourism/api`, find your PC's LAN IP
   (`ipconfig` → IPv4), set `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:3000` in
   `apps/mobile/.env`, restart `nx start` (env vars are inlined at bundle time).
   Don't commit the LAN value — restore the Render URL before committing.
5. Mobile `build` = EAS cloud build → excluded from the local gate; for mobile run
   lint + typecheck + test.
```

- [ ] **Step 2: Full gate**

Run: `pnpm nx affected -t lint typecheck test --base=origin/main`
Expected: PASS across `@tourism/tokens`, `@tourism/i18n`, `mobile-ui`, `@tourism/mobile` **and** the ripple projects (web/admin re-test because i18n/tokens changed — they must stay green, proving the shared-lib edits are additive).

Then: `pnpm nx run-many -t build --projects=@tourism/web,@tourism/admin` (tokens/i18n consumers must still build).
Expected: PASS.

- [ ] **Step 3: Commit docs**

```bash
git add docs/05-runbooks/local-dev.md
git commit -m "docs(runbook): mobile Expo Go dev loop (QR, Render default, LAN override)"
```

- [ ] **Step 4: On-device verification (user, with Claude standing by)**

`pnpm nx start @tourism/mobile`, scan the QR on the phone, then walk this checklist:

1. 4 tabs render with icons + emerald active tint.
2. Home shows brand header, then skeleton → real featured tour cards (images load).
3. Pull-to-refresh spins and settles.
4. Airplane mode → pull-to-refresh → error state + "Try again"; disable airplane mode → retry recovers.
5. Phone dark mode → app follows (background/text/tab bar flip to the dark palette).

Record any failures; fix before merge. (Merge flow per repo rules: user reviews → rebase + `--ff-only` onto `main` → docs sweep — plan STATUS, roadmap P5 row → 🚧 W1 done, CLAUDE.md mobile row, HANDOFF next-action, test-count baselines.)

---

## STATUS

- [ ] Task 1 — tokens RN converter
- [ ] Task 2 — i18n mobile copy
- [ ] Task 3 — expo-router shell
- [ ] Task 4 — mobile-ui theme + provider
- [ ] Task 5 — AppText/Screen/Spinner
- [ ] Task 6 — Button/Card
- [ ] Task 7 — env + api + providers
- [ ] Task 8 — Home real data
- [ ] Task 9 — themed tabs + placeholders
- [ ] Task 10 — runbook + gate + on-device check
