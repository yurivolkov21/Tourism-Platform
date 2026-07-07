# P5 Mobile W2 — Browse & Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (this wave runs **inline** at the user's request — no implementation subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real Explore tab (search + destination/duration/price/sort filtering over all published tours), a full-parity tour-detail stack screen, and an enquiry modal — per the approved spec [2026-07-06-p5-mobile-w2-browse-detail-design.md](../06-specs/2026-07-06-p5-mobile-w2-browse-detail-design.md).

**Architecture:** Load-all + client-side (one `GET /tours?pageSize=100` query; `searchTours`/`filterTours`/`sortTours` from `@tourism/core` compose in a pure `applyExploreState`). Detail + enquiry are new expo-router routes over the tabs (`tours/[slug]/index` stack card, `tours/[slug]/enquiry` modal). Three new generic primitives land in `@tourism/mobile-ui`; product composites stay in the app. **No backend changes.**

**Tech Stack:** Expo SDK 54 / expo-router · TanStack Query · `@tourism/core` typed client + pure helpers · `@tourism/mobile-ui` + `@tourism/tokens` theme · `@tourism/i18n`.

## Global Constraints

- Branch `feat/mobile-w2-browse-detail`, main checkout (no worktree). Never touch `origin/nghia`.
- **Expo Go-compatible only** — no new native modules. W2 needs **zero new dependencies**.
- **No hex colors** in app/lib code — only `useTheme()` values. No hardcoded user-facing strings — all copy via `@tourism/i18n` `messages.mobile.*`.
- **TDD on pure logic** (mappers, `applyExploreState`, `validateEnquiry`): failing spec first, red → green.
- Mobile specs live **outside `src/app/`** (`src/__tests__/`, `src/lib/*.spec.ts`) — files in `src/app` become routes (W1 gotcha).
- Conventional Commits, no AI attribution. Straight quotes in all copy/code.
- The core client **throws `ApiRequestError`** (`.status`/`.code`) on any non-2xx — handle 404/429 with try/catch, not `{ error }` checks.
- Gate for mobile = **lint + typecheck + test** (mobile `build` = EAS cloud, excluded from local gate).
- Run all commands from repo root unless stated.

---

### Task 1: i18n copy (`mobile.explore` / `mobile.tourDetail` / `mobile.enquiry`)

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` (inside the `mobile` section, after `home`; delete `placeholders.explore` — the placeholder screen dies this wave; `placeholders.saved`/`account` stay)

**Interfaces:**
- Produces: `messages.mobile.explore` / `.tourDetail` / `.enquiry` — the exact keys every later task's copy references. Function messages take the shown parameter types.

- [ ] **Step 1: Add the three sections**

Inside `mobile: { ... }` in `messages.ts`, after the `home: { ... }` block, add:

```ts
    explore: {
      title: 'Explore tours',
      searchPlaceholder: 'Search tours or destinations',
      destinationsTitle: 'Destinations',
      resultsCount: (n: number) => `${n} ${n === 1 ? 'tour' : 'tours'}`,
      empty: 'No tours match your search.',
      clearFilters: 'Clear filters',
      error: "Couldn't load tours. Check your connection and try again.",
      retry: 'Try again',
      slowServer: 'Waking the server — the first load can take up to a minute…',
      duration: { '1': '1 day', '2-3': '2–3 days', '4+': '4+ days' },
      price: { '<100': 'Under $100', '100-300': '$100–300', '300+': 'Over $300' },
      sort: {
        popular: 'Popular',
        'price-asc': 'Price: low first',
        'price-desc': 'Price: high first',
        rating: 'Top rated',
      },
    },
    tourDetail: {
      overviewTitle: 'Overview',
      highlightsTitle: 'Highlights',
      itineraryTitle: 'Itinerary',
      includedTitle: "What's included",
      excludedTitle: "What's not included",
      reviewsTitle: 'Reviews',
      faqsTitle: 'FAQs',
      policiesTitle: 'Policies',
      dayLabel: (day: number) => `Day ${day}`,
      maxGroup: (n: number) => `Up to ${n} guests`,
      reviewsLine: (rating: number, count: number) =>
        `★ ${rating.toFixed(1)} (${count} ${count === 1 ? 'review' : 'reviews'})`,
      nextDeparture: (date: string) => `Next departure: ${date}`,
      seatsLeft: (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'} left`,
      from: 'From',
      inquireNow: 'Inquire now',
      notFound: "This tour isn't available anymore.",
      goBack: 'Go back',
      error: "Couldn't load this tour.",
      retry: 'Try again',
    },
    enquiry: {
      title: 'Inquire about this tour',
      nameLabel: 'Full name',
      emailLabel: 'Email',
      phoneLabel: 'Phone (optional)',
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us about your dates, group size and questions…',
      submit: 'Send enquiry',
      success: "Thanks! We'll get back to you within 24 hours.",
      errors: {
        nameRequired: 'Please enter your name.',
        emailInvalid: 'Please enter a valid email address.',
        messageRequired: 'Please write a short message.',
        generic: "Couldn't send your enquiry. Please try again.",
        rateLimited: 'Too many requests — please wait a minute and try again.',
      },
    },
```

Then delete the `explore:` line from `mobile.placeholders` (keep `saved` + `account`).

- [ ] **Step 2: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/i18n`
Expected: all green (the lib is a typed const object; typecheck is the real check).

```bash
git add libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(i18n): mobile W2 copy - explore, tour detail, enquiry"
```

---

### Task 2: `@tourism/mobile-ui` — `TextField`

**Files:**
- Create: `libs/mobile/ui/src/lib/text-field.tsx`
- Test: `libs/mobile/ui/src/lib/text-field.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Produces: `TextField({ label?, error?, multiline?, ...TextInputProps })` — labelled themed input; `error` string renders below in the destructive color and colors the border.

- [ ] **Step 1: Write the failing test**

`libs/mobile/ui/src/lib/text-field.spec.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { TextField } from './text-field';

test('renders label and forwards typing', async () => {
  const onChangeText = jest.fn();
  render(
    <ThemeProvider>
      <TextField label="Email" onChangeText={onChangeText} />
    </ThemeProvider>,
  );
  await userEvent.type(screen.getByLabelText('Email'), 'a');
  expect(onChangeText).toHaveBeenCalledWith('a');
});

test('renders the error message', () => {
  render(
    <ThemeProvider>
      <TextField label="Email" error="Please enter a valid email address." />
    </ThemeProvider>,
  );
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test mobile-ui --testPathPatterns=text-field`
Expected: FAIL — `Cannot find module './text-field'`.

- [ ] **Step 3: Implement**

`libs/mobile/ui/src/lib/text-field.tsx`:

```tsx
import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Error copy shown under the field; also colors the border. */
  error?: string;
}

export function TextField({ label, error, multiline, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label ? (
        <AppText variant="caption" style={{ fontWeight: '600' }}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors['muted-foreground']}
        multiline={multiline}
        {...rest}
        style={[
          {
            minHeight: multiline ? 100 : 44,
            borderWidth: 1,
            borderColor: error ? theme.colors['destructive'] : theme.colors['border'],
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing(3),
            paddingVertical: multiline ? theme.spacing(2) : 0,
            color: theme.colors['foreground'],
            backgroundColor: theme.colors['background'],
            textAlignVertical: multiline ? 'top' : 'center',
            fontSize: theme.typography.body.fontSize,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { TextField } from './lib/text-field';
export type { TextFieldProps } from './lib/text-field';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test mobile-ui --testPathPatterns=text-field`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui/src/lib/text-field.tsx libs/mobile/ui/src/lib/text-field.spec.tsx libs/mobile/ui/src/index.ts
git commit -m "feat(mobile-ui): TextField primitive"
```

---

### Task 3: `@tourism/mobile-ui` — `Chip`

**Files:**
- Create: `libs/mobile/ui/src/lib/chip.tsx`
- Test: `libs/mobile/ui/src/lib/chip.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Produces: `Chip({ label, selected?, imageUri?, ...PressableProps })` — selectable pill; sets `accessibilityState.selected`; optional small round leading image (RN `Image` — no expo dep in the lib).

- [ ] **Step 1: Write the failing test**

`libs/mobile/ui/src/lib/chip.spec.tsx`:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Chip } from './chip';

test('fires onPress and exposes selected state', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Chip label="2–3 days" selected onPress={onPress} />
    </ThemeProvider>,
  );
  const chip = screen.getByRole('button', { name: '2–3 days' });
  expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  await userEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('unselected by default', () => {
  render(
    <ThemeProvider>
      <Chip label="4+ days" onPress={jest.fn()} />
    </ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: '4+ days' }).props.accessibilityState).toMatchObject({
    selected: false,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test mobile-ui --testPathPatterns=chip`
Expected: FAIL — `Cannot find module './chip'`.

- [ ] **Step 3: Implement**

`libs/mobile/ui/src/lib/chip.tsx`:

```tsx
import { Image, Pressable, type PressableProps } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  selected?: boolean;
  /** Optional small round leading image (e.g. destination cover). */
  imageUri?: string;
}

export function Chip({ label, selected = false, imageUri, style, ...rest }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      {...rest}
      style={(state) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
          minHeight: 36,
          paddingHorizontal: theme.spacing(3),
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? theme.colors['primary'] : theme.colors['border'],
          backgroundColor: selected ? theme.colors['primary'] : 'transparent',
          opacity: state.pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors['muted'] }}
        />
      ) : null}
      <AppText
        variant="caption"
        style={{
          fontWeight: '600',
          color: selected ? theme.colors['primary-foreground'] : theme.colors['foreground'],
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { Chip } from './lib/chip';
export type { ChipProps } from './lib/chip';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test mobile-ui --testPathPatterns=chip`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui/src/lib/chip.tsx libs/mobile/ui/src/lib/chip.spec.tsx libs/mobile/ui/src/index.ts
git commit -m "feat(mobile-ui): Chip primitive"
```

---

### Task 4: `@tourism/mobile-ui` — `Accordion`

**Files:**
- Create: `libs/mobile/ui/src/lib/accordion.tsx`
- Test: `libs/mobile/ui/src/lib/accordion.spec.tsx`
- Modify: `libs/mobile/ui/src/index.ts`

**Interfaces:**
- Produces: `Accordion({ title, children, initiallyOpen? })` — self-contained expand/collapse (plain conditional render, no LayoutAnimation — Go-safe); header sets `accessibilityState.expanded`.

- [ ] **Step 1: Write the failing test**

`libs/mobile/ui/src/lib/accordion.spec.tsx`:

```tsx
import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Accordion } from './accordion';

test('content is hidden until the header is pressed, then toggles', async () => {
  render(
    <ThemeProvider>
      <Accordion title="Day 1: Hanoi">
        <Text>Old Quarter walking tour</Text>
      </Accordion>
    </ThemeProvider>,
  );
  expect(screen.queryByText('Old Quarter walking tour')).not.toBeOnTheScreen();
  const header = screen.getByRole('button', { name: 'Day 1: Hanoi' });
  expect(header.props.accessibilityState).toMatchObject({ expanded: false });
  await userEvent.press(header);
  expect(screen.getByText('Old Quarter walking tour')).toBeOnTheScreen();
  expect(header.props.accessibilityState).toMatchObject({ expanded: true });
  await userEvent.press(header);
  expect(screen.queryByText('Old Quarter walking tour')).not.toBeOnTheScreen();
});

test('initiallyOpen renders the content up front', () => {
  render(
    <ThemeProvider>
      <Accordion title="Day 1" initiallyOpen>
        <Text>Visible</Text>
      </Accordion>
    </ThemeProvider>,
  );
  expect(screen.getByText('Visible')).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test mobile-ui --testPathPatterns=accordion`
Expected: FAIL — `Cannot find module './accordion'`.

- [ ] **Step 3: Implement**

`libs/mobile/ui/src/lib/accordion.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './app-text';
import { useTheme } from './theme-provider';

export interface AccordionProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export function Accordion({ title, children, initiallyOpen = false }: AccordionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.md,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={(state) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(2),
          padding: theme.spacing(3),
          backgroundColor: state.pressed ? theme.colors['muted'] : 'transparent',
        })}
      >
        <AppText variant="body" style={{ fontWeight: '600', flex: 1 }}>
          {title}
        </AppText>
        <AppText variant="body" muted>
          {open ? '−' : '+'}
        </AppText>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: theme.spacing(3), paddingBottom: theme.spacing(3) }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
```

Append to `libs/mobile/ui/src/index.ts`:

```ts
export { Accordion } from './lib/accordion';
export type { AccordionProps } from './lib/accordion';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test mobile-ui --testPathPatterns=accordion`
Expected: PASS (2 tests).

- [ ] **Step 5: Full-lib check + commit**

Run: `pnpm nx run-many -t lint typecheck test -p mobile-ui`
Expected: green (19 W1 tests + 6 new).

```bash
git add libs/mobile/ui/src/lib/accordion.tsx libs/mobile/ui/src/lib/accordion.spec.tsx libs/mobile/ui/src/index.ts
git commit -m "feat(mobile-ui): Accordion primitive"
```

---

### Task 5: Extend `TourCardVm` + `fetchAllTours` + pressable two-variant `TourCard`

**Files:**
- Modify: `apps/mobile/src/lib/tours.ts`
- Modify: `apps/mobile/src/lib/tours.spec.ts`
- Modify: `apps/mobile/src/components/tour-card.tsx`
- Modify: `apps/mobile/src/app/(tabs)/index.tsx` (Home passes `onPress`)
- Modify: `apps/mobile/src/__tests__/home.spec.tsx` (vm fixture + router mock)

**Interfaces:**
- Consumes: `messages.mobile.home` (existing), `@tourism/core` types.
- Produces: `TourCardVm` = `{ slug, title, destination, durationDays, basePrice, compareAtPrice?, currency, rating, reviewCount, category?, categoryName?, image? }` — **structurally satisfies `FilterableTour` + `SearchableTour`** (`price` is renamed to `basePrice`). `fetchAllTours(): Promise<TourCardVm[]>`. `TourCard({ tour, variant?: 'shelf' | 'list', onPress? })`.

- [ ] **Step 1: Extend the mapper spec (failing first)**

In `apps/mobile/src/lib/tours.spec.ts`, extend the existing `toTourCardVm` fixture/assertions: give the DTO fixture `basePrice: '450.00'`, `compareAtPrice: '520.00'`, `averageRating: 4.8`, `reviewsCount: 12`, `category: { slug: 'cruise', name: 'Cruises' }` (shape per the existing fixture pattern in that spec) and assert the VM now carries:

```ts
expect(vm).toMatchObject({
  basePrice: 450,
  compareAtPrice: 520,
  rating: 4.8,
  reviewCount: 12,
  category: 'cruise',
  categoryName: 'Cruises',
});
```

Add a case: `compareAtPrice: null` → `compareAtPrice` is `undefined`; missing `category` → both category fields `undefined`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=tours`
Expected: FAIL — VM lacks the new fields (and `price` vs `basePrice` mismatch).

- [ ] **Step 3: Implement the VM + `fetchAllTours`**

Replace `TourCardVm`/`toTourCardVm` in `apps/mobile/src/lib/tours.ts` and add `fetchAllTours`:

```ts
export interface TourCardVm {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  category?: string;
  categoryName?: string;
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
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    category: dto.category?.slug,
    categoryName: dto.category?.name,
    image: hero?.url,
  };
}

/** Every published tour, one page (client-side filtering strategy — spec decision #2). */
export async function fetchAllTours(): Promise<TourCardVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours', {
    params: { query: { pageSize: 100 } },
  });
  const list = (data as unknown as { data: TourSummaryDto[] }).data ?? [];
  return list.map(toTourCardVm);
}
```

(`fetchFeaturedTours` stays as-is — it already maps through `toTourCardVm`.)

- [ ] **Step 4: Update `TourCard` to two variants + pressable**

Replace `apps/mobile/src/components/tour-card.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';

const t = messages.mobile.home;
const td = messages.mobile.tourDetail;

export interface TourCardProps {
  tour: TourCardVm;
  /** 'shelf' = 240-wide horizontal-rail card (Home). 'list' = full-width row (Explore). */
  variant?: 'shelf' | 'list';
  onPress?: () => void;
}

export function TourCard({ tour, variant = 'shelf', onPress }: TourCardProps) {
  const theme = useTheme();
  const list = variant === 'list';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={list ? undefined : { width: 240 }}>
        <Image
          source={tour.image ? { uri: tour.image } : undefined}
          style={{ width: '100%', height: list ? 170 : 130, backgroundColor: theme.colors['muted'] }}
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
          {list && tour.reviewCount > 0 ? (
            <AppText variant="caption" muted>
              {td.reviewsLine(tour.rating, tour.reviewCount)}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="body">
              {t.from} {tour.currency === 'USD' ? '$' : ''}
              {tour.basePrice}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {tour.currency === 'USD' ? '$' : ''}
                {tour.compareAtPrice}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 5: Home passes `onPress`; fix the home spec**

In `apps/mobile/src/app/(tabs)/index.tsx`: add `import { router } from 'expo-router';` and change the `renderItem`:

```tsx
renderItem={({ item }) => (
  <TourCard tour={item} onPress={() => router.push(`/tours/${item.slug}`)} />
)}
```

In `apps/mobile/src/__tests__/home.spec.tsx`: update the `vm` fixture (`price: 450` → `basePrice: 450, rating: 4.8, reviewCount: 12`) and add at the top (expo-router isn't rendered by the spec, so mock it):

```ts
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile`
Expected: all green (tours spec new assertions pass; home spec passes with the new fixture).

```bash
git add apps/mobile/src/lib/tours.ts apps/mobile/src/lib/tours.spec.ts apps/mobile/src/components/tour-card.tsx "apps/mobile/src/app/(tabs)/index.tsx" apps/mobile/src/__tests__/home.spec.tsx
git commit -m "feat(mobile): filterable TourCardVm, fetchAllTours, pressable two-variant TourCard"
```

---

### Task 6: `explore-state.ts` — pure search/filter/sort composition (TDD core)

**Files:**
- Create: `apps/mobile/src/lib/explore-state.ts`
- Test: `apps/mobile/src/lib/explore-state.spec.ts`

**Interfaces:**
- Consumes: `TourCardVm` (Task 5), `@tourism/core` `searchTours/filterTours/sortTours` + bucket types.
- Produces:

  ```ts
  interface ExploreState {
    query: string;
    destination?: string;            // destination NAME (filterTours matches names)
    durations: DurationBucket[];
    prices: PriceBucket[];
    sort: TourSort;
  }
  const defaultExploreState: ExploreState;
  applyExploreState(tours: readonly TourCardVm[], state: ExploreState): TourCardVm[];
  toggleBucket<T>(list: readonly T[], value: T): T[];
  hasActiveFilters(state: ExploreState): boolean;
  ```

- [ ] **Step 1: Write the failing spec**

`apps/mobile/src/lib/explore-state.spec.ts`:

```ts
import type { TourCardVm } from './tours';
import {
  applyExploreState,
  defaultExploreState,
  hasActiveFilters,
  toggleBucket,
} from './explore-state';

const tour = (over: Partial<TourCardVm>): TourCardVm => ({
  slug: 'x',
  title: 'X',
  destination: 'Hanoi',
  durationDays: 2,
  basePrice: 150,
  currency: 'USD',
  rating: 4.0,
  reviewCount: 10,
  ...over,
});

const tours: TourCardVm[] = [
  tour({ slug: 'a', title: 'Ha Long Bay Cruise', destination: 'Ha Long', durationDays: 3, basePrice: 450, rating: 4.9, reviewCount: 200 }),
  tour({ slug: 'b', title: 'Hanoi Street Food', destination: 'Hanoi', durationDays: 1, basePrice: 49, rating: 4.7, reviewCount: 320 }),
  tour({ slug: 'c', title: 'Sapa Trek', destination: 'Sapa', durationDays: 4, basePrice: 220, rating: 4.8, reviewCount: 90 }),
];

test('default state returns all tours sorted by popularity (reviewCount desc)', () => {
  expect(applyExploreState(tours, defaultExploreState).map((t) => t.slug)).toEqual(['b', 'a', 'c']);
});

test('query narrows accent-insensitively', () => {
  const state = { ...defaultExploreState, query: 'ha noi' };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['b']);
});

test('destination + duration + price facets AND together', () => {
  const state = {
    ...defaultExploreState,
    destination: 'Ha Long',
    durations: ['2-3' as const],
    prices: ['300+' as const],
  };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['a']);
});

test('sort price-asc orders by basePrice', () => {
  const state = { ...defaultExploreState, sort: 'price-asc' as const };
  expect(applyExploreState(tours, state).map((t) => t.slug)).toEqual(['b', 'c', 'a']);
});

test('toggleBucket adds then removes', () => {
  expect(toggleBucket(['1'], '2-3')).toEqual(['1', '2-3']);
  expect(toggleBucket(['1', '2-3'], '1')).toEqual(['2-3']);
});

test('hasActiveFilters is false for default, true for any facet', () => {
  expect(hasActiveFilters(defaultExploreState)).toBe(false);
  expect(hasActiveFilters({ ...defaultExploreState, query: 'x' })).toBe(true);
  expect(hasActiveFilters({ ...defaultExploreState, destination: 'Hanoi' })).toBe(true);
  expect(hasActiveFilters({ ...defaultExploreState, durations: ['1'] })).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=explore-state`
Expected: FAIL — `Cannot find module './explore-state'`.

- [ ] **Step 3: Implement**

`apps/mobile/src/lib/explore-state.ts`:

```ts
import {
  filterTours,
  searchTours,
  sortTours,
  type DurationBucket,
  type PriceBucket,
  type TourSort,
} from '@tourism/core';
import type { TourCardVm } from './tours';

/** Everything the Explore screen's filters know. `destination` holds the display NAME. */
export interface ExploreState {
  query: string;
  destination?: string;
  durations: DurationBucket[];
  prices: PriceBucket[];
  sort: TourSort;
}

export const defaultExploreState: ExploreState = {
  query: '',
  durations: [],
  prices: [],
  sort: 'popular',
};

/** Immutable multi-select toggle for bucket chips. */
export function toggleBucket<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasActiveFilters(state: ExploreState): boolean {
  return (
    state.query.trim() !== '' ||
    state.destination !== undefined ||
    state.durations.length > 0 ||
    state.prices.length > 0
  );
}

/** search → filter → sort, all pure `@tourism/core` helpers. */
export function applyExploreState(
  tours: readonly TourCardVm[],
  state: ExploreState,
): TourCardVm[] {
  const searched = searchTours(tours, state.query);
  const filtered = filterTours(searched, {
    destinations: state.destination ? [state.destination] : undefined,
    durations: state.durations.length > 0 ? state.durations : undefined,
    prices: state.prices.length > 0 ? state.prices : undefined,
  });
  return sortTours(filtered, state.sort);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=explore-state`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/explore-state.ts apps/mobile/src/lib/explore-state.spec.ts
git commit -m "feat(mobile): pure explore search/filter/sort state (TDD)"
```

---

### Task 7: `destinations.ts` — chips data

**Files:**
- Create: `apps/mobile/src/lib/destinations.ts`
- Test: `apps/mobile/src/lib/destinations.spec.ts`

**Interfaces:**
- Produces: `DestinationChipVm { slug, name, image? }`, `toDestinationChipVm(dto)`, `fetchDestinations(): Promise<DestinationChipVm[]>`.

- [ ] **Step 1: Failing mapper spec**

`apps/mobile/src/lib/destinations.spec.ts`:

```ts
import type { components } from '@tourism/core';
import { toDestinationChipVm } from './destinations';

type DestinationDto = components['schemas']['DestinationDto'];

const base: DestinationDto = {
  id: '1',
  slug: 'ha-long',
  name: 'Ha Long',
  country: 'Vietnam',
  region: 'Northern Vietnam',
  description: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  toursCount: 3,
  media: [
    { id: 'm2', url: 'https://img.test/gallery.jpg', role: 'gallery', alt: null, sortOrder: 1, publicId: 'g' },
    { id: 'm1', url: 'https://img.test/hero.jpg', role: 'hero', alt: null, sortOrder: 0, publicId: 'h' },
  ] as DestinationDto['media'],
};

test('prefers the hero image', () => {
  expect(toDestinationChipVm(base)).toEqual({
    slug: 'ha-long',
    name: 'Ha Long',
    image: 'https://img.test/hero.jpg',
  });
});

test('falls back to the first media, then undefined', () => {
  const noHero = { ...base, media: [base.media[0]] };
  expect(toDestinationChipVm(noHero).image).toBe('https://img.test/gallery.jpg');
  expect(toDestinationChipVm({ ...base, media: [] }).image).toBeUndefined();
});
```

(If `MediaItemDto` in the generated schema has more/fewer required fields than the fixture, match the fixture to the real type — the `as DestinationDto['media']` cast is the escape hatch either way.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=destinations`
Expected: FAIL — `Cannot find module './destinations'`.

- [ ] **Step 3: Implement**

`apps/mobile/src/lib/destinations.ts`:

```ts
import type { components } from '@tourism/core';
import { getApiClient } from './api';

type DestinationDto = components['schemas']['DestinationDto'];

export interface DestinationChipVm {
  slug: string;
  name: string;
  image?: string;
}

export function toDestinationChipVm(dto: DestinationDto): DestinationChipVm {
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return { slug: dto.slug, name: dto.name, image: hero?.url };
}

/** Active destinations for the Explore chips rail (same query shape web's overview uses). */
export async function fetchDestinations(): Promise<DestinationChipVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/destinations', {
    params: { query: { pageSize: 100 } },
  });
  const list = (data as unknown as { data: DestinationDto[] }).data ?? [];
  return list.map(toDestinationChipVm);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=destinations`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/destinations.ts apps/mobile/src/lib/destinations.spec.ts
git commit -m "feat(mobile): destinations chips data layer"
```

---

### Task 8: Explore screen

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/explore.tsx` (replace the placeholder)
- Modify: `apps/mobile/src/__tests__/explore.spec.tsx` (replace the placeholder test)

**Interfaces:**
- Consumes: `fetchAllTours` (T5), `applyExploreState`/`defaultExploreState`/`toggleBucket`/`hasActiveFilters` (T6), `fetchDestinations` (T7), `TextField`/`Chip` (T2/T3), `TourCard variant="list"` (T5), `messages.mobile.explore` (T1).
- Produces: the routable Explore tab; navigates to `/tours/<slug>`.

- [ ] **Step 1: Implement the screen**

Replace `apps/mobile/src/app/(tabs)/explore.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { DurationBucket, PriceBucket, TourSort } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, Button, Card, Chip, Screen, Spinner, TextField, useTheme } from '@tourism/mobile-ui';
import { TourCard } from '../../components/tour-card';
import { fetchDestinations } from '../../lib/destinations';
import {
  applyExploreState,
  defaultExploreState,
  hasActiveFilters,
  toggleBucket,
  type ExploreState,
} from '../../lib/explore-state';
import { fetchAllTours } from '../../lib/tours';

const t = messages.mobile.explore;

const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const PRICES: PriceBucket[] = ['<100', '100-300', '300+'];
const SORTS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

function ChipRow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) }}>{children}</View>
  );
}

function SkeletonList() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(3) }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} style={{ height: 240, backgroundColor: theme.colors['muted'] }} />
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const theme = useTheme();
  const [state, setState] = useState<ExploreState>(defaultExploreState);

  const toursQ = useQuery({ queryKey: ['tours', 'all'], queryFn: fetchAllTours });
  const destQ = useQuery({ queryKey: ['destinations'], queryFn: fetchDestinations });

  const results = useMemo(
    () => (toursQ.data ? applyExploreState(toursQ.data, state) : []),
    [toursQ.data, state],
  );

  const header = (
    <View style={{ gap: theme.spacing(3), paddingVertical: theme.spacing(4) }}>
      <AppText variant="display">{t.title}</AppText>
      <TextField
        placeholder={t.searchPlaceholder}
        accessibilityLabel={t.searchPlaceholder}
        value={state.query}
        onChangeText={(query) => setState((s) => ({ ...s, query }))}
        autoCorrect={false}
      />
      {destQ.data && destQ.data.length > 0 ? (
        <View style={{ gap: theme.spacing(2) }}>
          <AppText variant="title">{t.destinationsTitle}</AppText>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={destQ.data}
            keyExtractor={(d) => d.slug}
            renderItem={({ item }) => (
              <Chip
                label={item.name}
                imageUri={item.image}
                selected={state.destination === item.name}
                onPress={() =>
                  setState((s) => ({
                    ...s,
                    destination: s.destination === item.name ? undefined : item.name,
                  }))
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={{ width: theme.spacing(2) }} />}
          />
        </View>
      ) : null}
      <ChipRow>
        {DURATIONS.map((d) => (
          <Chip
            key={d}
            label={t.duration[d]}
            selected={state.durations.includes(d)}
            onPress={() => setState((s) => ({ ...s, durations: toggleBucket(s.durations, d) }))}
          />
        ))}
      </ChipRow>
      <ChipRow>
        {PRICES.map((p) => (
          <Chip
            key={p}
            label={t.price[p]}
            selected={state.prices.includes(p)}
            onPress={() => setState((s) => ({ ...s, prices: toggleBucket(s.prices, p) }))}
          />
        ))}
      </ChipRow>
      <ChipRow>
        {SORTS.map((sort) => (
          <Chip
            key={sort}
            label={t.sort[sort]}
            selected={state.sort === sort}
            onPress={() => setState((s) => ({ ...s, sort }))}
          />
        ))}
      </ChipRow>
      {toursQ.isSuccess ? (
        <AppText variant="caption" muted>
          {t.resultsCount(results.length)}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={toursQ.isSuccess ? results : []}
        keyExtractor={(tour) => tour.slug}
        renderItem={({ item }) => (
          <TourCard tour={item} variant="list" onPress={() => router.push(`/tours/${item.slug}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing(3) }} />}
        ListHeaderComponent={header}
        ListFooterComponent={<View style={{ height: theme.spacing(6) }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={toursQ.isRefetching} onRefresh={() => toursQ.refetch()} />
        }
        ListEmptyComponent={
          toursQ.isPending ? (
            <View style={{ gap: theme.spacing(3) }}>
              <SkeletonList />
              <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
                <Spinner />
                <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                  {t.slowServer}
                </AppText>
              </View>
            </View>
          ) : toursQ.isError ? (
            <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => toursQ.refetch()} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {t.empty}
              </AppText>
              {hasActiveFilters(state) ? (
                <Button
                  label={t.clearFilters}
                  variant="outline"
                  onPress={() => setState(defaultExploreState)}
                />
              ) : null}
            </View>
          )
        }
      />
    </Screen>
  );
}
```

Notes: the destinations rail hides itself if that query fails/returns empty (the tour list still works — graceful degradation). The W1 `SlowServerHint` delay is skipped here — Explore is usually visited after Home has warmed the server; a static hint inside the skeleton is enough.

- [ ] **Step 2: Replace the placeholder test**

Replace `apps/mobile/src/__tests__/explore.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ExploreScreen from '../app/(tabs)/explore';
import { fetchDestinations } from '../lib/destinations';
import { fetchAllTours, type TourCardVm } from '../lib/tours';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchAllTours: jest.fn(),
}));

jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));

const mockTours = fetchAllTours as jest.MockedFunction<typeof fetchAllTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;

const tour = (over: Partial<TourCardVm>): TourCardVm => ({
  slug: 'x',
  title: 'X',
  destination: 'Hanoi',
  durationDays: 2,
  basePrice: 150,
  currency: 'USD',
  rating: 4.0,
  reviewCount: 10,
  ...over,
});

const tours = [
  tour({ slug: 'a', title: 'Ha Long Bay Cruise', destination: 'Ha Long', durationDays: 3, basePrice: 450 }),
  tour({ slug: 'b', title: 'Hanoi Street Food', destination: 'Hanoi', durationDays: 1, basePrice: 49 }),
];

function renderExplore() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <ExploreScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders all tours on success', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([{ slug: 'ha-long', name: 'Ha Long' }]);
  renderExplore();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText('Hanoi Street Food')).toBeOnTheScreen();
  expect(screen.getByText('2 tours')).toBeOnTheScreen();
});

test('typing in search narrows the list', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.type(screen.getByLabelText('Search tours or destinations'), 'street food');
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  expect(screen.getByText('Hanoi Street Food')).toBeOnTheScreen();
});

test('duration chip filters, clear filters restores', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: '1 day' }));
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: '4+ days' }));
  await userEvent.press(screen.getByRole('button', { name: '1 day' }));
  // only 4+ selected now -> nothing matches -> empty state with clear
  expect(await screen.findByText('No tours match your search.')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
});

test('renders the error state with retry', async () => {
  mockTours.mockRejectedValueOnce(new Error('boom'));
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
```

- [ ] **Step 3: Run the app-project tests**

Run: `pnpm nx test @tourism/mobile`
Expected: all green (home + tours + explore-state + destinations + explore).

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/src/app/(tabs)/explore.tsx" apps/mobile/src/__tests__/explore.spec.tsx
git commit -m "feat(mobile): Explore tab - search, destination rail, facet chips, tour list"
```

---

### Task 9: `tour-detail.ts` — detail + reviews data layer

**Files:**
- Create: `apps/mobile/src/lib/tour-detail.ts`
- Test: `apps/mobile/src/lib/tour-detail.spec.ts`

**Interfaces:**
- Produces:

  ```ts
  interface TourDetailVm {
    id: string; slug: string; title: string; destination: string;
    durationDays: number; maxGroupSize: number; difficulty?: string;
    basePrice: number; compareAtPrice?: number; currency: string;
    rating: number; reviewCount: number;
    nextDepartureDate?: string;       // pre-formatted, e.g. "15 Aug 2026"
    nextDepartureSeatsLeft?: number;
    overview: string; gallery: string[]; highlights: string[];
    itinerary: { day: number; title: string; body: string }[];
    included: string[]; excluded: string[];
    faqs: { question: string; answer: string }[];
    policies: { kind: string; title: string; body: string }[];
  }
  formatDepartureDate(iso: string): string;
  toTourDetailVm(dto: TourDetailDto): TourDetailVm;
  fetchTourDetail(slug: string): Promise<TourDetailVm | null>;  // null on 404
  interface TourReviewVm { id: string; author: string; date: string; rating: number; quote: string }
  fetchTourReviews(slug: string): Promise<TourReviewVm[]>;
  ```

- [ ] **Step 1: Failing spec**

`apps/mobile/src/lib/tour-detail.spec.ts`:

```ts
import type { components } from '@tourism/core';
import { formatDepartureDate, toTourDetailVm } from './tour-detail';

type TourDetailDto = components['schemas']['TourDetailDto'];

const dto = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  summary: 'Two days among the karsts.',
  durationDays: 2,
  maxGroupSize: 16,
  basePrice: '450.00',
  compareAtPrice: '520.00',
  currency: 'USD',
  difficulty: 'easy',
  isPublished: true,
  isFeatured: true,
  highlights: ['Sunset kayaking'],
  suitableFor: ['FAMILY'],
  badges: ['POPULAR'],
  averageRating: 4.9,
  reviewsCount: 214,
  nextDepartureDate: '2026-08-15',
  nextDepartureSeatsLeft: 6,
  itinerary: [{ dayNumber: 1, title: 'Embark', description: 'Board at noon.' }],
  included: ['All meals'],
  excluded: ['Drinks'],
  faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
  policies: [{ kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' }],
  destinations: [
    { isPrimary: true, destination: { slug: 'ha-long', name: 'Ha Long' } },
  ],
  media: [
    { id: 'm1', url: 'https://img.test/hero.jpg', role: 'hero', alt: null, sortOrder: 0, publicId: 'h' },
    { id: 'm2', url: 'https://img.test/g1.jpg', role: 'gallery', alt: null, sortOrder: 1, publicId: 'g' },
  ],
} as unknown as TourDetailDto;

test('maps the full detail VM', () => {
  const vm = toTourDetailVm(dto);
  expect(vm).toMatchObject({
    id: 'uuid-1',
    slug: 'ha-long-cruise',
    destination: 'Ha Long',
    maxGroupSize: 16,
    difficulty: 'easy',
    basePrice: 450,
    compareAtPrice: 520,
    rating: 4.9,
    reviewCount: 214,
    nextDepartureDate: '15 Aug 2026',
    nextDepartureSeatsLeft: 6,
    overview: 'Two days among the karsts.',
    gallery: ['https://img.test/hero.jpg', 'https://img.test/g1.jpg'],
    highlights: ['Sunset kayaking'],
    itinerary: [{ day: 1, title: 'Embark', body: 'Board at noon.' }],
    included: ['All meals'],
    excluded: ['Drinks'],
    faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
    policies: [{ kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' }],
  });
});

test('nulls map to undefined / empty', () => {
  const vm = toTourDetailVm({
    ...dto,
    summary: null,
    difficulty: null,
    compareAtPrice: null,
    nextDepartureDate: null,
    nextDepartureSeatsLeft: null,
  } as unknown as TourDetailDto);
  expect(vm.overview).toBe('');
  expect(vm.difficulty).toBeUndefined();
  expect(vm.compareAtPrice).toBeUndefined();
  expect(vm.nextDepartureDate).toBeUndefined();
  expect(vm.nextDepartureSeatsLeft).toBeUndefined();
});

test('formatDepartureDate is graceful on garbage', () => {
  expect(formatDepartureDate('2026-08-15')).toBe('15 Aug 2026');
  expect(formatDepartureDate('not-a-date')).toBe('not-a-date');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=tour-detail`
Expected: FAIL — `Cannot find module './tour-detail'`.

- [ ] **Step 3: Implement**

`apps/mobile/src/lib/tour-detail.ts`:

```ts
import { ApiRequestError, type components } from '@tourism/core';
import { getApiClient } from './api';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

export interface TourDetailVm {
  id: string;
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  maxGroupSize: number;
  difficulty?: string;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  /** Pre-formatted for display, e.g. "15 Aug 2026". */
  nextDepartureDate?: string;
  nextDepartureSeatsLeft?: number;
  overview: string;
  gallery: string[];
  highlights: string[];
  itinerary: { day: number; title: string; body: string }[];
  included: string[];
  excluded: string[];
  faqs: { question: string; answer: string }[];
  policies: { kind: string; title: string; body: string }[];
}

/** "15 Aug 2026" from an ISO date; echoes the input when unparseable. */
export function formatDepartureDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

export function toTourDetailVm(dto: TourDetailDto): TourDetailVm {
  const primary = dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    durationDays: dto.durationDays,
    maxGroupSize: dto.maxGroupSize,
    difficulty: dto.difficulty ?? undefined,
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    nextDepartureDate: dto.nextDepartureDate ? formatDepartureDate(dto.nextDepartureDate) : undefined,
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft ?? undefined,
    overview: dto.summary ?? '',
    gallery: dto.media.map((m) => m.url),
    highlights: dto.highlights ?? [],
    itinerary: dto.itinerary.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      body: d.description ?? '',
    })),
    included: dto.included ?? [],
    excluded: dto.excluded ?? [],
    faqs: dto.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    policies: dto.policies.map((p) => ({ kind: p.kind, title: p.title, body: p.body })),
  };
}

/** Full detail VM, or null when the slug is unknown/unpublished (404). */
export async function fetchTourDetail(slug: string): Promise<TourDetailVm | null> {
  const api = getApiClient();
  try {
    const { data } = await api.GET('/api/v1/tours/{slug}', { params: { path: { slug } } });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    return dto ? toTourDetailVm(dto) : null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export interface TourReviewVm {
  id: string;
  author: string;
  date: string;
  rating: number;
  quote: string;
}

/** "May 2026" from an ISO timestamp (empty string on a bad value). */
function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** First approved reviews for the detail screen. */
export async function fetchTourReviews(slug: string): Promise<TourReviewVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours/{slug}/reviews', {
    params: { path: { slug }, query: { pageSize: 6 } },
  });
  const list = (data as unknown as { data: PublicReviewDto[] }).data ?? [];
  return list.map((r) => ({
    id: r.id,
    author: r.reviewer.fullName,
    date: formatReviewDate(r.createdAt),
    rating: r.rating,
    quote: r.body,
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=tour-detail`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/tour-detail.ts apps/mobile/src/lib/tour-detail.spec.ts
git commit -m "feat(mobile): tour detail + reviews data layer (TDD)"
```

---

### Task 10: Tour detail screen + gallery pager + route registration

**Files:**
- Create: `apps/mobile/src/components/gallery-pager.tsx`
- Create: `apps/mobile/src/app/tours/[slug]/index.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx` (register the two `tours/[slug]/*` screens — enquiry's file lands in Task 12, registering both now is harmless)
- Test: `apps/mobile/src/__tests__/tour-detail-screen.spec.tsx`

**Interfaces:**
- Consumes: `fetchTourDetail`/`fetchTourReviews`/`TourDetailVm` (T9), `Accordion` (T4), `messages.mobile.tourDetail` (T1).
- Produces: route `/tours/[slug]`; CTA pushes `/tours/<slug>/enquiry` (Task 12's route).

- [ ] **Step 1: GalleryPager component**

`apps/mobile/src/components/gallery-pager.tsx`:

```tsx
import { useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@tourism/mobile-ui';

/** Edge-to-edge horizontal image pager with dot indicators. */
export function GalleryPager({ images, title }: { images: string[]; title: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return <View style={{ width: '100%', height: 280, backgroundColor: theme.colors['muted'] }} />;
  }
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height: 280, backgroundColor: theme.colors['muted'] }}
            contentFit="cover"
            accessibilityLabel={title}
          />
        )}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      />
      {images.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            bottom: theme.spacing(2),
            alignSelf: 'center',
            flexDirection: 'row',
            gap: theme.spacing(1),
          }}
        >
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i === index ? theme.colors['primary'] : theme.colors['background'],
                opacity: i === index ? 1 : 0.7,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Register the routes in the root layout**

In `apps/mobile/src/app/_layout.tsx`, replace the `<Stack>` block:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="tours/[slug]/index" />
  <Stack.Screen name="tours/[slug]/enquiry" options={{ presentation: 'modal' }} />
</Stack>
```

- [ ] **Step 3: Detail screen**

`apps/mobile/src/app/tours/[slug]/index.tsx`:

```tsx
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { Accordion, AppText, Button, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import { GalleryPager } from '../../../components/gallery-pager';
import { fetchTourDetail, fetchTourReviews } from '../../../lib/tour-detail';

const t = messages.mobile.tourDetail;
const th = messages.mobile.home;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function Bullets({ items, mark }: { items: string[]; mark: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {items.map((item) => (
        <AppText key={item} variant="body">
          {mark} {item}
        </AppText>
      ))}
    </View>
  );
}

/** Circular themed back button overlaid on the gallery (global header is hidden). */
function BackOverlay() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.goBack}
      onPress={() => router.back()}
      style={{
        position: 'absolute',
        top: insets.top + theme.spacing(2),
        left: theme.spacing(4),
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
      }}
    >
      <AppText variant="title">‹</AppText>
    </Pressable>
  );
}

export default function TourDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const detailQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const reviewsQ = useQuery({
    queryKey: ['tours', 'reviews', slug],
    queryFn: () => fetchTourReviews(slug),
    enabled: !!slug,
  });

  if (detailQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (detailQ.isError) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.error}
          </AppText>
          <Button label={t.retry} onPress={() => detailQ.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!detailQ.data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.notFound}
          </AppText>
          <Button label={t.goBack} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const tour = detailQ.data;
  const facts = [
    th.durationDays(tour.durationDays),
    t.maxGroup(tour.maxGroupSize),
    ...(tour.difficulty ? [tour.difficulty] : []),
  ].join(' · ');
  const dollar = tour.currency === 'USD' ? '$' : '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing(6) }}>
        <GalleryPager images={tour.gallery} title={tour.title} />
        <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(4), gap: theme.spacing(5) }}>
          <View style={{ gap: theme.spacing(1) }}>
            <AppText variant="caption" muted>
              {tour.destination}
            </AppText>
            <AppText variant="display">{tour.title}</AppText>
            {tour.reviewCount > 0 ? (
              <AppText variant="caption" muted>
                {t.reviewsLine(tour.rating, tour.reviewCount)}
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              {facts}
            </AppText>
            {tour.nextDepartureDate ? (
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {t.nextDeparture(tour.nextDepartureDate)}
                {tour.nextDepartureSeatsLeft != null
                  ? ` · ${t.seatsLeft(tour.nextDepartureSeatsLeft)}`
                  : ''}
              </AppText>
            ) : null}
          </View>

          {tour.overview !== '' ? (
            <Section title={t.overviewTitle}>
              <AppText variant="body">{tour.overview}</AppText>
            </Section>
          ) : null}

          {tour.highlights.length > 0 ? (
            <Section title={t.highlightsTitle}>
              <Bullets items={tour.highlights} mark="•" />
            </Section>
          ) : null}

          {tour.itinerary.length > 0 ? (
            <Section title={t.itineraryTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {tour.itinerary.map((day) => (
                  <Accordion key={day.day} title={`${t.dayLabel(day.day)}: ${day.title}`}>
                    <AppText variant="body">{day.body}</AppText>
                  </Accordion>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.included.length > 0 ? (
            <Section title={t.includedTitle}>
              <Bullets items={tour.included} mark="✓" />
            </Section>
          ) : null}

          {tour.excluded.length > 0 ? (
            <Section title={t.excludedTitle}>
              <Bullets items={tour.excluded} mark="✕" />
            </Section>
          ) : null}

          {reviewsQ.data && reviewsQ.data.length > 0 ? (
            <Section title={t.reviewsTitle}>
              <View style={{ gap: theme.spacing(3) }}>
                {reviewsQ.data.map((review) => (
                  <View key={review.id} style={{ gap: theme.spacing(1) }}>
                    <AppText variant="caption" muted>
                      {'★'.repeat(review.rating)} · {review.author}
                      {review.date ? ` · ${review.date}` : ''}
                    </AppText>
                    <AppText variant="body">{review.quote}</AppText>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.faqs.length > 0 ? (
            <Section title={t.faqsTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {tour.faqs.map((faq) => (
                  <Accordion key={faq.question} title={faq.question}>
                    <AppText variant="body">{faq.answer}</AppText>
                  </Accordion>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.policies.length > 0 ? (
            <Section title={t.policiesTitle}>
              <View style={{ gap: theme.spacing(3) }}>
                {tour.policies.map((policy) => (
                  <View key={policy.title} style={{ gap: theme.spacing(1) }}>
                    <AppText variant="body" style={{ fontWeight: '600' }}>
                      {policy.title}
                    </AppText>
                    <AppText variant="body" muted>
                      {policy.body}
                    </AppText>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      <BackOverlay />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(3),
          paddingBottom: insets.bottom + theme.spacing(3),
          borderTopWidth: 1,
          borderTopColor: theme.colors['border'],
          backgroundColor: theme.colors['background'],
        }}
      >
        <View>
          <AppText variant="caption" muted>
            {t.from}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="title">
              {dollar}
              {tour.basePrice}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {dollar}
                {tour.compareAtPrice}
              </AppText>
            ) : null}
          </View>
        </View>
        <Button label={t.inquireNow} onPress={() => router.push(`/tours/${slug}/enquiry`)} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Screen test**

`apps/mobile/src/__tests__/tour-detail-screen.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import TourDetailScreen from '../app/tours/[slug]/index';
import { fetchTourDetail, fetchTourReviews, type TourDetailVm } from '../lib/tour-detail';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'ha-long-cruise' }),
}));

jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourDetail: jest.fn(),
  fetchTourReviews: jest.fn(),
}));

const mockDetail = fetchTourDetail as jest.MockedFunction<typeof fetchTourDetail>;
const mockReviews = fetchTourReviews as jest.MockedFunction<typeof fetchTourReviews>;

const vm: TourDetailVm = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 2,
  maxGroupSize: 16,
  difficulty: 'easy',
  basePrice: 450,
  compareAtPrice: 520,
  currency: 'USD',
  rating: 4.9,
  reviewCount: 214,
  nextDepartureDate: '15 Aug 2026',
  nextDepartureSeatsLeft: 6,
  overview: 'Two days among the karsts.',
  gallery: ['https://img.test/hero.jpg'],
  highlights: ['Sunset kayaking'],
  itinerary: [{ day: 1, title: 'Embark', body: 'Board at noon.' }],
  included: ['All meals'],
  excluded: ['Drinks'],
  faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
  policies: [{ kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' }],
};

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <TourDetailScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders the full detail with itinerary accordion and CTA', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  mockReviews.mockResolvedValueOnce([
    { id: 'r1', author: 'Jane', date: 'May 2026', rating: 5, quote: 'Wonderful trip.' },
  ]);
  renderDetail();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText(/next departure: 15 aug 2026/i)).toBeOnTheScreen();
  expect(screen.getByText(/6 seats left/i)).toBeOnTheScreen();
  expect(screen.getByText('Sunset kayaking', { exact: false })).toBeOnTheScreen();
  // itinerary body appears only after expanding
  expect(screen.queryByText('Board at noon.')).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Day 1: Embark' }));
  expect(screen.getByText('Board at noon.')).toBeOnTheScreen();
  expect(await screen.findByText('Wonderful trip.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Inquire now' })).toBeOnTheScreen();
});

test('unknown slug renders the not-found state', async () => {
  mockDetail.mockResolvedValueOnce(null);
  mockReviews.mockResolvedValueOnce([]);
  renderDetail();
  expect(await screen.findByText(/isn't available anymore/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
});

test('fetch failure renders the error state with retry', async () => {
  mockDetail.mockRejectedValueOnce(new Error('boom'));
  mockReviews.mockResolvedValueOnce([]);
  renderDetail();
  expect(await screen.findByText(/couldn't load this tour/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});
```

- [ ] **Step 5: Run tests + commit**

Run: `pnpm nx test @tourism/mobile`
Expected: all green.

```bash
git add apps/mobile/src/components/gallery-pager.tsx "apps/mobile/src/app/tours/[slug]/index.tsx" apps/mobile/src/app/_layout.tsx apps/mobile/src/__tests__/tour-detail-screen.spec.tsx
git commit -m "feat(mobile): tour detail screen - gallery pager, full sections, sticky enquiry CTA"
```

---

### Task 11: `enquiry.ts` — validator + submit

**Files:**
- Create: `apps/mobile/src/lib/enquiry.ts`
- Test: `apps/mobile/src/lib/enquiry.spec.ts`

**Interfaces:**
- Produces:

  ```ts
  interface EnquiryInput { name: string; email: string; phone: string; message: string }
  type EnquiryErrorKey = 'nameRequired' | 'emailInvalid' | 'messageRequired';
  type EnquiryFieldErrors = Partial<Record<'name' | 'email' | 'message', EnquiryErrorKey>>;
  validateEnquiry(input: EnquiryInput): EnquiryFieldErrors;   // {} = valid
  type EnquiryResult = { ok: true } | { ok: false; rateLimited: boolean };
  submitEnquiry(input: EnquiryInput & { tourId: string }): Promise<EnquiryResult>;  // never throws
  ```

- [ ] **Step 1: Failing validator spec**

`apps/mobile/src/lib/enquiry.spec.ts`:

```ts
import { validateEnquiry } from './enquiry';

const valid = {
  name: 'Jane Traveller',
  email: 'jane@example.com',
  phone: '',
  message: 'July availability for 2 adults?',
};

test('valid input returns no errors', () => {
  expect(validateEnquiry(valid)).toEqual({});
});

test('blank name / message and bad email are flagged with i18n keys', () => {
  expect(validateEnquiry({ ...valid, name: '  ' })).toEqual({ name: 'nameRequired' });
  expect(validateEnquiry({ ...valid, email: 'not-an-email' })).toEqual({ email: 'emailInvalid' });
  expect(validateEnquiry({ ...valid, message: '' })).toEqual({ message: 'messageRequired' });
});

test('phone is optional', () => {
  expect(validateEnquiry({ ...valid, phone: '' })).toEqual({});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=enquiry`
Expected: FAIL — `Cannot find module './enquiry'`.

- [ ] **Step 3: Implement**

`apps/mobile/src/lib/enquiry.ts`:

```ts
import { ApiRequestError } from '@tourism/core';
import { getApiClient } from './api';

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export type EnquiryErrorKey = 'nameRequired' | 'emailInvalid' | 'messageRequired';
export type EnquiryFieldErrors = Partial<Record<'name' | 'email' | 'message', EnquiryErrorKey>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field-level validation returning i18n error KEYS (resolved to copy at render time). */
export function validateEnquiry(input: EnquiryInput): EnquiryFieldErrors {
  const errors: EnquiryFieldErrors = {};
  if (input.name.trim() === '') errors.name = 'nameRequired';
  if (!EMAIL_RE.test(input.email.trim())) errors.email = 'emailInvalid';
  if (input.message.trim() === '') errors.message = 'messageRequired';
  return errors;
}

export type EnquiryResult = { ok: true } | { ok: false; rateLimited: boolean };

/**
 * Submit a lead tied to a tour. Never throws — the modal renders the result.
 * A 429 (per-IP throttle, 5/min) maps to `rateLimited` for tailored copy (as web does).
 */
export async function submitEnquiry(input: EnquiryInput & { tourId: string }): Promise<EnquiryResult> {
  const api = getApiClient();
  const phone = input.phone.trim();
  try {
    await api.POST('/api/v1/enquiries', {
      body: {
        name: input.name.trim(),
        email: input.email.trim(),
        message: input.message.trim(),
        ...(phone !== '' ? { phone } : {}),
        tourId: input.tourId,
      },
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      rateLimited: error instanceof ApiRequestError && error.status === 429,
    };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPatterns=enquiry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/enquiry.ts apps/mobile/src/lib/enquiry.spec.ts
git commit -m "feat(mobile): enquiry validator + submit (TDD)"
```

---

### Task 12: Enquiry modal screen

**Files:**
- Create: `apps/mobile/src/app/tours/[slug]/enquiry.tsx` (route already registered in Task 10)
- Test: `apps/mobile/src/__tests__/enquiry-modal.spec.tsx`

**Interfaces:**
- Consumes: `validateEnquiry`/`submitEnquiry`/`EnquiryFieldErrors` (T11), `fetchTourDetail` (T9 — `tourId` from the cached detail query), `TextField` (T2), `messages.mobile.enquiry` (T1).

- [ ] **Step 1: Implement the modal**

`apps/mobile/src/app/tours/[slug]/enquiry.tsx`:

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, TextField, useTheme } from '@tourism/mobile-ui';
import { submitEnquiry, validateEnquiry, type EnquiryFieldErrors } from '../../../lib/enquiry';
import { fetchTourDetail } from '../../../lib/tour-detail';

const t = messages.mobile.enquiry;

export default function EnquiryModal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();

  // Same key as the detail screen -> served from the cache; fetches only on a cold deep link.
  const detailQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const tourId = detailQ.data?.id;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<EnquiryFieldErrors>({});
  const [failure, setFailure] = useState<'generic' | 'rateLimited' | null>(null);
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: submitEnquiry,
    onSuccess: (result) => {
      if (result.ok) {
        setSent(true);
        setTimeout(() => router.back(), 1500);
      } else {
        setFailure(result.rateLimited ? 'rateLimited' : 'generic');
      }
    },
    onError: () => setFailure('generic'),
  });

  const onSubmit = () => {
    const validation = validateEnquiry({ name, email, phone, message });
    setErrors(validation);
    setFailure(null);
    if (Object.keys(validation).length > 0 || !tourId) return;
    mutation.mutate({ name, email, phone, message, tourId });
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
          <AppText variant="display">✓</AppText>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.success}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(4) }}>
        <View style={{ gap: theme.spacing(1) }}>
          <AppText variant="title">{t.title}</AppText>
          {detailQ.data ? (
            <AppText variant="caption" muted>
              {detailQ.data.title}
            </AppText>
          ) : null}
        </View>
        <TextField
          label={t.nameLabel}
          value={name}
          onChangeText={setName}
          error={errors.name ? t.errors[errors.name] : undefined}
          autoCorrect={false}
        />
        <TextField
          label={t.emailLabel}
          value={email}
          onChangeText={setEmail}
          error={errors.email ? t.errors[errors.email] : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <TextField label={t.phoneLabel} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label={t.messageLabel}
          value={message}
          onChangeText={setMessage}
          error={errors.message ? t.errors[errors.message] : undefined}
          placeholder={t.messagePlaceholder}
          multiline
        />
        {failure ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
            {failure === 'rateLimited' ? t.errors.rateLimited : t.errors.generic}
          </AppText>
        ) : null}
        <Button
          label={t.submit}
          onPress={onSubmit}
          loading={mutation.isPending}
          disabled={!tourId}
        />
      </View>
    </Screen>
  );
}
```

(Android modals resize for the keyboard by default; the ScrollView + `keyboardShouldPersistTaps` covers the long-form case — no KeyboardAvoidingView needed for Go/Android. Revisit for iOS in a later wave.)

- [ ] **Step 2: Modal test**

`apps/mobile/src/__tests__/enquiry-modal.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import EnquiryModal from '../app/tours/[slug]/enquiry';
import { submitEnquiry } from '../lib/enquiry';
import { fetchTourDetail, type TourDetailVm } from '../lib/tour-detail';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'ha-long-cruise' }),
}));

jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourDetail: jest.fn(),
}));

jest.mock('../lib/enquiry', () => ({
  ...jest.requireActual('../lib/enquiry'),
  submitEnquiry: jest.fn(),
}));

const mockDetail = fetchTourDetail as jest.MockedFunction<typeof fetchTourDetail>;
const mockSubmit = submitEnquiry as jest.MockedFunction<typeof submitEnquiry>;

const vm = { id: 'uuid-1', title: 'Ha Long Bay Cruise' } as TourDetailVm;

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <EnquiryModal />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('shows field errors on empty submit and does not call the API', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(screen.getByText('Please enter your name.')).toBeOnTheScreen();
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
  expect(screen.getByText('Please write a short message.')).toBeOnTheScreen();
  expect(mockSubmit).not.toHaveBeenCalled();
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Jane');
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Message'), 'July for 2 adults?');
}

test('valid submit sends tourId and shows the success state', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  mockSubmit.mockResolvedValueOnce({ ok: true });
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/thanks!/i)).toBeOnTheScreen();
  expect(mockSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ tourId: 'uuid-1', email: 'jane@example.com' }),
  );
});

test('rate-limited failure shows tailored copy and keeps the input', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  mockSubmit.mockResolvedValueOnce({ ok: false, rateLimited: true });
  renderModal();
  await screen.findByText('Ha Long Bay Cruise');
  await fillValidForm();
  await userEvent.press(screen.getByRole('button', { name: 'Send enquiry' }));
  expect(await screen.findByText(/too many requests/i)).toBeOnTheScreen();
  expect(screen.getByLabelText('Full name').props.value).toBe('Jane');
});
```

(The auto-close `setTimeout` fires after the test ends — RTL cleanup unmounts first; if Jest warns about the open timer, add `jest.useFakeTimers()`/`jest.runOnlyPendingTimers()` around the success test.)

- [ ] **Step 3: Run tests + commit**

Run: `pnpm nx test @tourism/mobile`
Expected: all green.

```bash
git add "apps/mobile/src/app/tours/[slug]/enquiry.tsx" apps/mobile/src/__tests__/enquiry-modal.spec.tsx
git commit -m "feat(mobile): enquiry modal - validated form, 429-aware submit, success state"
```

---

### Task 13: Gate, on-device verification, STATUS

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile mobile-ui @tourism/i18n`
Expected: all green.

Run: `pnpm nx affected -t lint typecheck test build --base=main`
Expected: green — the i18n edit pulls web/admin into the affected set; their suites must still pass untouched (additive copy only).

- [ ] **Step 2: On-device verification (Expo Go, user's Android phone)**

From `apps/mobile`: `pnpm exec expo start` (direct, NOT via nx — nx is non-interactive, no QR; W1 runbook `docs/05-runbooks/local-dev.md`). Checklist with the user:

1. Explore tab: tours load (cold-start hint if the server is asleep) · search narrows instantly · destination chip filters · duration/price chips filter · sort chips reorder · clear-filters from the empty state · pull-to-refresh.
2. Home: tapping a featured card opens the detail.
3. Detail: gallery swipes with dots · seats-left line · itinerary + FAQs accordions · reviews render · back overlay returns.
4. Enquiry: CTA opens the modal · empty submit shows the three field errors · a real submit against Render succeeds (verify the lead appears in admin `/enquiries`) · modal auto-closes.

- [ ] **Step 3: Update STATUS + hand off to review**

Append a `## STATUS` block to this plan (task checklist + commit hashes + on-device result). Then per repo rules: user reviews → rebase + `--ff-only` merge (user confirms) → docs sweep (roadmap P5 row, CLAUDE.md mobile row, HANDOFF, test-count baselines).

---

## STATUS

- [x] Task 1 — i18n copy (`88c7152`; also dropped `placeholders.explore`)
- [x] Task 2 — TextField (`f5f295e`)
- [x] Task 3 — Chip (`8c52a00`)
- [x] Task 4 — Accordion (`f46e805`)
- [x] Task 5 — TourCardVm + fetchAllTours + pressable TourCard (`5e7f1ff`; interim
      fix: W1 explore placeholder pointed at a surviving i18n key until Task 8)
- [x] Task 6 — explore-state (`f2f33e6`; spec fixture uses `Hà Nội` — searchTours
      strips accents, not spaces, so the accent-insensitivity case needs real
      diacritics)
- [x] Task 7 — destinations chips data (`2b0d01f`)
- [x] Task 8 — Explore screen (`7c348fc`)
- [x] Task 9 — tour-detail data layer (`71ce1dd`)
- [x] Task 10 — detail screen + GalleryPager + routes (`be1af5e`)
- [x] Task 11 — enquiry validator + submit (`10fcfd5`)
- [x] Task 12 — enquiry modal (`5e250e5`; two execution findings: TanStack v5
      passes a 2nd arg to `mutationFn` — assert on `mock.calls[0][0]`; mutation
      cache needs `mutations: { gcTime: 0 }` in spec QueryClients or the jest
      worker leaks a GC timer. Auto-dismiss timer moved into a cleaned-up
      `useEffect`.)
- [x] Task 13 — gate green (2026-07-06): mobile **33** · mobile-ui **25** · i18n 1;
      `nx affected -t lint typecheck test --base=main` green (web + admin suites
      pass untouched); `nx affected ... build --exclude=@tourism/mobile` green
      (web + admin compile; mobile `build` = EAS cloud, excluded per standing
      rule). **On-device Expo Go check: DONE by the user (2026-07-07)** — browse /
      filter / detail / enquiry all work. Two findings, both fixed in `6f36dd4`:
      Android renders `presentation: 'modal'` as a full-screen page (no iOS-style
      sheet) → added `animation: 'slide_from_bottom'` so it visibly slides up
      (full-screen form = the Material pattern, keyboard-safe); the detail
      ScrollView flashed its scroll indicator on entry → hidden (Explore already
      hid its own). Third finding (`e6bf68c`): pushes to the detail flashed a
      white strip — the native-stack default background is white and shows
      through the transition gap → themed `contentStyle` on the root Stack +
      `animation: 'ios_from_right'` (smooth parallax push on Android). Fourth
      (`2ced2b9`): the POP direction still flashed — the Tabs navigator's scene
      wrapper has its own white react-navigation background → themed
      `sceneStyle` in the Tabs `screenOptions`. **Proactive device-polish audit
      (user asked to stop whack-a-mole, `2226af3`):** `Screen` now hides the
      vertical scroll indicator by default (kills the class for Home + enquiry
      modal + all future screens; +1 mobile-ui test = 26) · pressed-state
      feedback on `TourCard` and the detail back overlay (+`hitSlop` — 36dp
      circle < 44dp touch target) · Explore list gets
      `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="on-drag"`
      (first tap acts instead of only dismissing the search keyboard) · themed
      `RefreshControl` (Home + Explore). Audited clean: `userInterfaceStyle:
      "automatic"` (dark mode) · no other navigator lacks scene theming · no
      stray hex. Splash/adaptive-icon backgrounds are white → deferred to the
      design-polish pass. Deferred
      (user-accepted): visual polish to match the web's
      responsive design is NOT this wave — W2 is the skeleton; a later design
      pass will close the gap.
