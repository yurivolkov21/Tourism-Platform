# P5.5 N3 — "IA & Home" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task (this repo executes **inline — no
> subagents**). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the app-native UX pass — move bookings into a dedicated
**Trips** tab (5 tabs total) and rebuild **Home** task-first: greeting +
prominent search field, then contextual rows for signed-in users (next-trip
card, recently-saved rail) above the featured + destinations shelves. Drop the
full-bleed hero, why-strip and CTA band.

**Architecture:** No backend/data-layer changes. The Trips tab reuses
`fetchMyBookings` + the existing `BookingCard` verbatim (moved file). Home
gains three pure helpers (`selectUpcomingTrip`, `timeGreetingKey`,
`firstName`) unit-tested in isolation, plus two small presentational
components (`UpcomingTripCard`, `SavedMiniCard`). Home fetches share the exact
query keys already used by the Trips/Saved/Account tabs (`['bookings','list']`,
`['wishlist','list']`, `['profile']`) so no data is double-fetched across tabs.

**Tech Stack:** expo-router Tabs + Stack · TanStack Query (unchanged keys) ·
`@tourism/mobile-ui` primitives · `@tourism/i18n`.

**Spec:** `docs/06-specs/2026-07-08-p55-mobile-native-ux-design.md` (Wave N3).
Reference-gathering step done in-session (2026-07-09): task-first pattern
distilled from Airbnb / Booking.com / GetYourGuide / Hopper — search-is-hero,
signed-in context row under search, horizontal card shelves, dedicated Trips
tab. **User-confirmed layout A + time-of-day greeting.**

## STATUS

- **State:** EXECUTED inline (2026-07-09) — all 5 tasks done, committed
  task-by-task on `feat/mobile-n3-ia-home`. Adversarial review clean.
  **Awaiting: user's full gate + combined device pass + merge approval.**
- **Branch:** `feat/mobile-n3-ia-home` (off `main`; 4 feat commits).
- **Tests:** mobile **139 → 153** (home 4→6 · new home-helpers +11 · new
  upcoming-trip-card +1 · `trips` renamed from `bookings-list`, still 4);
  mobile-ui unchanged (34). In-session targeted runs all green
  (`trips` 4/4 · `home-helpers` 11/11 · `upcoming-trip-card` 1/1 ·
  `home.spec` 6/6); `nx typecheck @tourism/mobile` green. **The full
  `run-many -t lint typecheck test build` is for the user to run manually.**
- **Deviations from plan:** adding the required `BookingVm.departureDate`
  broke three existing `BookingVm` literals at typecheck (jest passed —
  ts-jest doesn't enforce missing-property) → added `departureDate` to the
  fixtures in `booking-detail.spec` · `booking-result.spec` · `trips.spec`
  (folded into the Task 4 commit). Legacy `mobile.home` keys (greeting /
  subtitle / cta*) were kept transiently through Task 3 so that commit stayed
  typecheck-clean, then removed in Task 4 once the old Home was gone.
- **Review notes (intentional, not bugs):** `todayIso()` is UTC while the
  greeting reads local `getHours()` — a late-evening user behind UTC could
  see "tomorrow" roll the upcoming filter, negligible for days-out departures
  + UTC+7 audience; `PENDING`/`PARTIALLY_REFUNDED` bookings still count as
  "your next trip" (a useful Pay-now / status nudge), only CANCELLED/REFUNDED
  excluded — matches the spec.
- **RESUME STATE:** hand the full gate to the user; then the **combined
  on-device pass** (N3 + still-owed N2 + N1 + W4 checklists, Task 5 Step 4);
  merge on user approval (rebase + `--ff-only`) + docs sweep.

## Global Constraints

- **Execute inline — no subagents; no worktrees** (standing rules).
- **Zero backend/data-layer changes.** The only edit to `lib/booking.ts` is an
  additive VM field (`departureDate`) surfaced from the DTO — payload builders,
  mutations and query keys stay byte-identical. If a task seems to need more,
  stop and re-check.
- No hex colors (tokens only) · straight quotes · Conventional Commits · one
  commit per task.
- Specs live outside `src/app/`; QueryClient in specs uses `gcTime: 0` for
  queries (and mutations where present); `mock*`-prefixed factory vars;
  `jest.clearAllMocks()` in `beforeEach` (re-set replaced mock implementations);
  Jest 30 `--testPathPatterns`.
- **Kill orphaned nx/jest node processes before any new test run** (they
  deadlock `.nx/workspace-data` on Windows). The **user runs the full gate
  manually** in his own terminal; in-session only run the single targeted spec
  for the task at hand.
- Device-polish rules apply to every new/edited surface: `android_ripple` on
  pressables (opacity fallback = iOS only, via `process.env.EXPO_OS === 'ios'`),
  `showsVerticalScrollIndicator={false}`, themed `RefreshControl`, `hitSlop` on
  small touch targets.

---

### Task 1: Trips tab (5-tab IA)

Move the bookings list out of the root stack into a dedicated **Trips** tab.
Booking **detail** (`/bookings/[code]`) stays a stack screen. Tab order:
Home · Explore · **Trips** · Saved · Account.

**Files:**
- Create: `apps/mobile/src/app/(tabs)/trips.tsx` (moved from
  `apps/mobile/src/app/bookings/index.tsx`, + an in-screen heading since tabs
  have no native header)
- Delete: `apps/mobile/src/app/bookings/index.tsx`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx` (add the Trips tab)
- Modify: `apps/mobile/src/app/_layout.tsx` (remove the `bookings/index`
  Stack.Screen)
- Modify: `apps/mobile/src/app/(tabs)/account.tsx:125` (`/bookings` → `/trips`)
- Modify: `libs/shared/i18n/src/lib/messages.ts` (`mobile.tabs.trips`)
- Rename test: `apps/mobile/src/__tests__/bookings-list.spec.tsx` →
  `apps/mobile/src/__tests__/trips.spec.tsx`

**Interfaces:**
- Consumes: `fetchMyBookings` · `BookingVm` (unchanged) · `SectionHeading` ·
  `AuthGate`.
- Produces: route `/trips` (tab). No exported symbols.

- [ ] **Step 1: i18n** — add `trips` to `messages.mobile.tabs` (after
  `explore`):

```ts
    tabs: {
      home: 'Home',
      explore: 'Explore',
      trips: 'Trips',
      saved: 'Saved',
      account: 'Account',
    },
```

- [ ] **Step 2: create `(tabs)/trips.tsx`** — the current bookings screen with
  its `BookingCard` moved verbatim, wrapped for a tab (no native header → own
  `SectionHeading` title + subtitle; AuthGate icon → `briefcase-outline`):

```tsx
import { FlatList, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { SectionHeading } from '../../components/section-heading';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings, type BookingVm } from '../../lib/booking';
import { formatMoney } from '../../lib/money';

const t = messages.booking.list;
const tm = messages.mobile.booking;
const tp = messages.mobile.authPrompts;

function BookingCard({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`booking-${booking.code}`}
      accessibilityRole="button"
      accessibilityLabel={booking.tourTitle}
      onPress={() => router.push(`/bookings/${booking.code}`)}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        padding: theme.spacing(4),
        gap: theme.spacing(2),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
        <AppText
          variant="body"
          numberOfLines={1}
          style={{ flex: 1, fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {booking.tourTitle}
        </AppText>
        <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
      </View>
      <AppText variant="caption" muted>
        {t.refLabel}: {booking.code} · {t.bookedOn(booking.bookedOn)}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" muted>
          {t.departureLabel}: {booking.departureLabel}
        </AppText>
        <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {formatMoney(booking.currency, booking.totalAmount)}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function TripsScreen() {
  const theme = useTheme();
  const { status } = useAuth();
  const listQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate icon="briefcase-outline" title={t.title} body={tp.accountGateBody} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingTop: theme.spacing(4), gap: theme.spacing(3) }}>
        <SectionHeading title={t.title} subtitle={t.subtitle} />
        {listQ.isPending ? (
          <View style={{ gap: theme.spacing(3) }}>
            <Skeleton height={104} />
            <Skeleton height={104} />
            <Skeleton height={104} />
          </View>
        ) : listQ.isError || !listQ.data ? (
          <View
            style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}
          >
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {tm.listError}
            </AppText>
            <Button label={tm.retry} onPress={() => listQ.refetch()} />
          </View>
        ) : listQ.data.length === 0 ? (
          <View
            style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}
          >
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {t.empty}
            </AppText>
            <Button label={t.browse} onPress={() => router.push('/explore')} />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
            <FlatList
              data={listQ.data}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => <BookingCard booking={item} />}
              contentContainerStyle={{ gap: theme.spacing(3), paddingBottom: theme.spacing(6) }}
              showsVerticalScrollIndicator={false}
              refreshing={listQ.isRefetching}
              onRefresh={() => listQ.refetch()}
            />
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 3: delete** `apps/mobile/src/app/bookings/index.tsx`.

- [ ] **Step 4: register the tab** — in `(tabs)/_layout.tsx`, insert between
  `explore` and `saved`:

```tsx
      <Tabs.Screen
        name="trips"
        options={{
          title: t.trips,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} color={color} size={size} />
          ),
        }}
      />
```

- [ ] **Step 5: drop the stale stack route** — in `_layout.tsx`, remove:

```tsx
        <Stack.Screen
          name="bookings/index"
          options={{ headerShown: true, title: messages.booking.list.title }}
        />
```

(Keep `bookings/[code]/index` and `bookings/[code]/result`.)

- [ ] **Step 6: account link** — `(tabs)/account.tsx:125`:

```tsx
          onPress={() => router.push('/trips')}
```

- [ ] **Step 7: move the spec** — rename `bookings-list.spec.tsx` →
  `trips.spec.tsx` and change only the import + component name; the four cases
  (renders + detail nav to `/bookings/BK-1`, empty, error, guest gate) stay:

```tsx
import BookingsScreen from '../app/(tabs)/trips';
```

(Everything else in the file is unchanged — the detail route is still
`/bookings/BK-1`, the copy assertions still resolve.)

- [ ] **Step 8: verify + commit**

Kill orphan node first, then:

```bash
pnpm nx test mobile --testPathPatterns trips
```

Expected: 4 passing. Then:

```bash
git add apps/mobile libs/shared/i18n
git commit -m "feat(mobile): dedicated Trips tab - bookings list moves out of Account (P5.5 N3)"
```

---

### Task 2: Home helpers — upcoming trip + greeting (TDD, pure logic)

Add the raw departure date to `BookingVm` (needed to rank upcoming trips) and
three pure helpers in a new `lib/home.ts`.

**Files:**
- Modify: `apps/mobile/src/lib/booking.ts` (`BookingVm.departureDate` +
  `toBookingVm`)
- Create: `apps/mobile/src/lib/home.ts`
- Test: `apps/mobile/src/__tests__/home-helpers.spec.ts`

**Interfaces (produced — Tasks 3–4 consume):**
- `BookingVm.departureDate: string` — raw `YYYY-MM-DD` (UTC) from
  `dto.departure.startDate`.
- `selectUpcomingTrip(bookings: BookingVm[], todayIso: string): BookingVm | null`
  — nearest future (`>= todayIso`) live booking (excludes `CANCELLED` /
  `REFUNDED`); `null` when none.
- `timeGreetingKey(hour: number): 'morning' | 'afternoon' | 'evening'`.
- `firstName(fullName: string): string` — first whitespace-delimited token
  (`''` when blank).

- [ ] **Step 1: add the VM field** — in `lib/booking.ts`, extend the
  `BookingVm` interface (right after `departureLabel`):

```ts
  departureLabel: string;
  /** Raw YYYY-MM-DD (UTC) departure date — for ranking upcoming trips. */
  departureDate: string;
```

and in `toBookingVm` (right after the `departureLabel` line):

```ts
    departureLabel: formatDepartureLabel(dto.departure.startDate),
    departureDate: dto.departure.startDate,
```

- [ ] **Step 2: failing spec** — `apps/mobile/src/__tests__/home-helpers.spec.ts`:

```ts
import type { BookingVm } from '../lib/booking';
import { firstName, selectUpcomingTrip, timeGreetingKey } from '../lib/home';

function mk(code: string, status: BookingVm['status'], departureDate: string): BookingVm {
  return {
    code,
    status,
    statusMeta: { label: status, tone: 'muted' },
    tourTitle: 't',
    tourSlug: 's',
    departureLabel: departureDate,
    departureDate,
    bookedOn: '01 Jan 2026',
    party: '1 adult',
    totalAmount: 1,
    currency: 'USD',
    paymentProvider: 'STRIPE',
    contactName: 'A',
    contactEmail: 'a@a.com',
  };
}

describe('selectUpcomingTrip', () => {
  test('picks the nearest future non-cancelled departure', () => {
    const list = [
      mk('A', 'PAID', '2026-09-01'),
      mk('B', 'PAID', '2026-08-01'),
      mk('C', 'PENDING', '2026-08-15'),
    ];
    expect(selectUpcomingTrip(list, '2026-07-09')?.code).toBe('B');
  });

  test('ignores past, cancelled and refunded bookings', () => {
    const list = [
      mk('past', 'PAID', '2026-06-01'),
      mk('cxl', 'CANCELLED', '2026-08-01'),
      mk('ref', 'REFUNDED', '2026-08-02'),
    ];
    expect(selectUpcomingTrip(list, '2026-07-09')).toBeNull();
  });

  test('a departure exactly today still counts', () => {
    expect(selectUpcomingTrip([mk('today', 'PAID', '2026-07-09')], '2026-07-09')?.code).toBe('today');
  });
});

describe('timeGreetingKey', () => {
  test.each([
    [0, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ] as const)('hour %i -> %s', (hour, key) => {
    expect(timeGreetingKey(hour)).toBe(key);
  });
});

describe('firstName', () => {
  test('returns the first token', () => {
    expect(firstName('Yuri Volkov')).toBe('Yuri');
  });
  test('empty string for blank input', () => {
    expect(firstName('   ')).toBe('');
  });
});
```

- [ ] **Step 3: run red**

```bash
pnpm nx test mobile --testPathPatterns home-helpers
```

Expected: FAIL (`lib/home` not found).

- [ ] **Step 4: implement** — `apps/mobile/src/lib/home.ts`:

```ts
import type { BookingVm } from './booking';

/** Statuses that are no longer a live upcoming trip. */
const NON_TRIP_STATUSES = new Set(['CANCELLED', 'REFUNDED']);

/**
 * The soonest upcoming trip: the nearest departure on or after `todayIso`
 * (a YYYY-MM-DD UTC date, passed in for testability) that is still a live
 * booking. Returns null when nothing qualifies.
 */
export function selectUpcomingTrip(bookings: BookingVm[], todayIso: string): BookingVm | null {
  const upcoming = bookings
    .filter((b) => !NON_TRIP_STATUSES.has(b.status) && b.departureDate >= todayIso)
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  return upcoming[0] ?? null;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Maps a 0-23 hour to a greeting bucket. */
export function timeGreetingKey(hour: number): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** First whitespace-delimited token of a full name ('' when blank). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}
```

- [ ] **Step 5: run green** — same command → PASS.

- [ ] **Step 6: commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): upcoming-trip + greeting helpers, BookingVm.departureDate (P5.5 N3)"
```

---

### Task 3: Home i18n + presentational cards

Add the Home copy and the two small cards Home composes. `UpcomingTripCard`
gets a spec (it renders date + status logic); `SavedMiniCard` is covered by the
Home screen spec in Task 4.

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` (`mobile.home` keys)
- Create: `apps/mobile/src/components/upcoming-trip-card.tsx`
- Create: `apps/mobile/src/components/saved-mini-card.tsx`
- Test: `apps/mobile/src/__tests__/upcoming-trip-card.spec.tsx`

**Interfaces (produced — Task 4 consumes):**
- `<UpcomingTripCard booking={BookingVm} onPress={() => void} />` — icon tile +
  title + `departureLabel` + status Badge; `testID={`upcoming-${code}`}`.
- `<SavedMiniCard tour={SavedTourVm} onPress={() => void} />` — 160-wide image
  card + title + `From $price`; `testID={`saved-${tourId}`}`.

- [ ] **Step 1: i18n** — replace the `mobile.home` block (drop the now-dead
  hero/CTA keys `greeting` `subtitle` `ctaTitle` `ctaSubtitle` `ctaButton`;
  keep the featured-state keys; add the task-first keys):

```ts
    home: {
      greetings: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
      },
      greetingWithName: (greeting: string, name: string) => `${greeting}, ${name}`,
      tagline: 'Where to next?',
      searchPlaceholder: 'Search tours & destinations',
      upcomingTitle: 'Your next trip',
      savedTitle: 'Recently saved',
      seeAll: 'See all',
      featuredTitle: 'Featured tours',
      destinationsTitle: 'Popular destinations',
      slowServer: 'Waking the server — the first load can take up to a minute…',
      error: "Couldn't load tours. Check your connection and try again.",
      retry: 'Try again',
      empty: 'No tours to show yet — check back soon.',
      from: 'From',
      durationDays: (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`,
    },
```

- [ ] **Step 2: `upcoming-trip-card.tsx`** (BookingVm carries no image → an
  icon tile keeps it intentional):

```tsx
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Badge, useTheme } from '@tourism/mobile-ui';
import type { BookingVm } from '../lib/booking';

const t = messages.booking.list;

export function UpcomingTripCard({
  booking,
  onPress,
}: {
  booking: BookingVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`upcoming-${booking.code}`}
      accessibilityRole="button"
      accessibilityLabel={booking.tourTitle}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        padding: theme.spacing(3),
        backgroundColor: theme.colors['card'],
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        <Ionicons name="airplane-outline" size={24} color={theme.colors['primary']} />
      </View>
      <View style={{ flex: 1, gap: theme.spacing(1) }}>
        <AppText numberOfLines={1} style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {booking.tourTitle}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {t.departureLabel}: {booking.departureLabel}
        </AppText>
        <View style={{ flexDirection: 'row' }}>
          <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors['muted-foreground']} />
    </Pressable>
  );
}
```

- [ ] **Step 3: `saved-mini-card.tsx`**:

```tsx
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';
import type { SavedTourVm } from '../lib/wishlist';

const tf = messages.featuredTours;

export function SavedMiniCard({ tour, onPress }: { tour: SavedTourVm; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`saved-${tour.tourId}`}
      accessibilityRole="button"
      accessibilityLabel={tour.title}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        width: 160,
        gap: theme.spacing(2),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{
          width: 160,
          height: 108,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors['muted'],
        }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={tour.title}
      />
      <AppText
        numberOfLines={2}
        style={{
          fontFamily: theme.fontFamilies.sansSemiBold,
          fontSize: 14,
          lineHeight: 18,
          minHeight: 36,
        }}
      >
        {tour.title}
      </AppText>
      <AppText variant="caption" muted>
        {tf.from} {tour.currency === 'USD' ? '$' : `${tour.currency} `}
        {tour.basePrice.toLocaleString('en-US')}
      </AppText>
    </Pressable>
  );
}
```

- [ ] **Step 4: failing spec** — `upcoming-trip-card.spec.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { UpcomingTripCard } from '../components/upcoming-trip-card';
import type { BookingVm } from '../lib/booking';

const vm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Ha Long Bay Cruise',
  tourSlug: 'ha-long-cruise',
  departureLabel: 'Sat, 15 Aug 2026',
  departureDate: '2026-08-15',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@a.com',
};

test('renders the tour, departure and status and fires onPress', () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <UpcomingTripCard booking={vm} onPress={onPress} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText(/Sat, 15 Aug 2026/)).toBeOnTheScreen();
  expect(screen.getByText('Paid')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('upcoming-BK-1'));
  expect(onPress).toHaveBeenCalled();
});
```

- [ ] **Step 5: run** → green:

```bash
pnpm nx test mobile --testPathPatterns upcoming-trip-card
```

- [ ] **Step 6: commit**

```bash
git add apps/mobile libs/shared/i18n
git commit -m "feat(mobile): Home copy + upcoming-trip and saved-mini cards (P5.5 N3)"
```

---

### Task 4: Home task-first rebuild

Rewrite `(tabs)/index.tsx`: greeting + search pill, then (signed-in only) the
next-trip card and recently-saved rail, then the featured + destinations
shelves. Remove the full-bleed `Hero`, the why-strip (`features`) and the CTA
band. Rewrite the Home spec.

**Files:**
- Rewrite: `apps/mobile/src/app/(tabs)/index.tsx`
- Rewrite: `apps/mobile/src/__tests__/home.spec.tsx`

**Interfaces:**
- Consumes: `selectUpcomingTrip` · `timeGreetingKey` · `firstName` (T2) ·
  `UpcomingTripCard` · `SavedMiniCard` (T3) · `fetchMyBookings` ·
  `fetchSavedTours` · `fetchProfile` · `fetchFeaturedTours` ·
  `fetchDestinations` · `TourCard` · `DestinationCard` · `HeartButton` ·
  `SectionHeading`.
- Signed-in queries are `enabled: status === 'signedIn'` and reuse the exact
  keys `['bookings','list']` / `['wishlist','list']` / `['profile']`.

- [ ] **Step 1: rewrite `(tabs)/index.tsx`** (complete):

```tsx
import type { ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { DestinationCard } from '../../components/destination-card';
import { HeartButton } from '../../components/heart-button';
import { SavedMiniCard } from '../../components/saved-mini-card';
import { SectionHeading } from '../../components/section-heading';
import { TourCard } from '../../components/tour-card';
import { UpcomingTripCard } from '../../components/upcoming-trip-card';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings } from '../../lib/booking';
import { fetchDestinations } from '../../lib/destinations';
import { firstName, selectUpcomingTrip, timeGreetingKey } from '../../lib/home';
import { fetchProfile } from '../../lib/profile';
import { fetchFeaturedTours } from '../../lib/tours';
import { fetchSavedTours } from '../../lib/wishlist';

const t = messages.mobile.home;

/** Today as a YYYY-MM-DD UTC date, to rank upcoming trips against departures. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: theme.spacing(4) }}>{children}</View>;
}

function Greeting() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });
  const greeting = t.greetings[timeGreetingKey(new Date().getHours())];
  const name = profileQ.data ? firstName(profileQ.data.fullName) : '';
  return (
    <View style={{ gap: theme.spacing(1) }}>
      <AppText variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
        {name ? t.greetingWithName(greeting, name) : greeting}
      </AppText>
      <AppText variant="body" muted>
        {t.tagline}
      </AppText>
    </View>
  );
}

function SearchPill() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.searchPlaceholder}
      onPress={() => router.push('/explore?focusSearch=1')}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(2),
        backgroundColor: theme.colors['card'],
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: 999,
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(1),
        paddingVertical: theme.spacing(1),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.9 : 1,
      })}
    >
      <Ionicons name="search-outline" size={18} color={theme.colors['muted-foreground']} />
      <AppText variant="body" muted style={{ flex: 1 }}>
        {t.searchPlaceholder}
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
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const toursQ = useQuery({ queryKey: ['tours', 'featured'], queryFn: fetchFeaturedTours });
  const destQ = useQuery({ queryKey: ['destinations'], queryFn: fetchDestinations });
  const bookingsQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: signedIn,
  });
  const savedQ = useQuery({
    queryKey: ['wishlist', 'list'],
    queryFn: fetchSavedTours,
    enabled: signedIn,
  });

  const upcoming = bookingsQ.data ? selectUpcomingTrip(bookingsQ.data, todayIso()) : null;
  const saved = savedQ.data ?? [];

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing(3),
          paddingBottom: theme.spacing(8),
          gap: theme.spacing(6),
        }}
        refreshControl={
          <RefreshControl
            refreshing={toursQ.isRefetching}
            onRefresh={() => {
              toursQ.refetch();
              destQ.refetch();
              if (signedIn) {
                bookingsQ.refetch();
                savedQ.refetch();
              }
            }}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
      >
        <Section>
          <View style={{ gap: theme.spacing(4) }}>
            <Greeting />
            <SearchPill />
          </View>
        </Section>

        {signedIn && upcoming ? (
          <Section>
            <SectionHeading title={t.upcomingTitle} />
            <Animated.View entering={FadeIn.duration(200)}>
              <UpcomingTripCard
                booking={upcoming}
                onPress={() => router.push(`/bookings/${upcoming.code}`)}
              />
            </Animated.View>
          </Section>
        ) : null}

        {signedIn && saved.length > 0 ? (
          <Section>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing(3),
              }}
            >
              <AppText variant="title">{t.savedTitle}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.seeAll}
                onPress={() => router.push('/saved')}
                hitSlop={8}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: theme.colors['primary'],
                    fontFamily: theme.fontFamilies.sansSemiBold,
                  }}
                >
                  {t.seeAll}
                </AppText>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={saved.slice(0, 6)}
              keyExtractor={(item) => item.tourId}
              renderItem={({ item }) => (
                <SavedMiniCard tour={item} onPress={() => router.push(`/tours/${item.slug}`)} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
              showsHorizontalScrollIndicator={false}
            />
          </Section>
        ) : null}

        <Section>
          <SectionHeading title={t.featuredTitle} />
          {toursQ.isPending ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} width={260} height={300} borderRadius={theme.radius.lg} />
              ))}
            </View>
          ) : toursQ.isError ? (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingVertical: theme.spacing(4),
              }}
            >
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
                <Animated.View entering={FadeIn.duration(200)}>
                  <TourCard
                    tour={item}
                    heartSlot={<HeartButton tourId={item.id} />}
                    onPress={() => router.push(`/tours/${item.slug}`)}
                  />
                </Animated.View>
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
            <SectionHeading title={t.destinationsTitle} />
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
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 2: rewrite `home.spec.tsx`** (complete — mocks auth + all four
  fetchers; greeting text is clock-dependent so assert the stable `tagline`,
  not the greeting):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from '../app/(tabs)/index';
import { fetchMyBookings, type BookingVm } from '../lib/booking';
import { fetchDestinations } from '../lib/destinations';
import { fetchProfile } from '../lib/profile';
import { fetchFeaturedTours } from '../lib/tours';
import { fetchSavedTours } from '../lib/wishlist';

let mockStatus = 'signedOut';
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));
jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));
jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
}));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchMyBookings: jest.fn(),
}));
jest.mock('../lib/wishlist', () => ({
  ...jest.requireActual('../lib/wishlist'),
  fetchSavedTours: jest.fn(),
  useWishlist: () => ({ isGuest: true, isSaved: () => false, toggle: jest.fn() }),
}));

import { router } from 'expo-router';

const mockFeatured = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;
const mockBookings = fetchMyBookings as jest.MockedFunction<typeof fetchMyBookings>;
const mockSaved = fetchSavedTours as jest.MockedFunction<typeof fetchSavedTours>;
const mockProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

const tourVm = {
  id: 'uuid-1',
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

const bookingVm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 01 Jan 2099',
  departureDate: '2099-01-01',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@a.com',
};

const savedVm = {
  tourId: 'uuid-9',
  slug: 'sapa-trek',
  title: 'Sapa Trek',
  image: 'https://img.test/s.jpg',
  basePrice: 200,
  currency: 'USD',
};

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

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
  mockDests.mockResolvedValue([]);
  mockBookings.mockResolvedValue([]);
  mockSaved.mockResolvedValue([]);
  mockProfile.mockResolvedValue({ fullName: 'Yuri Volkov', email: 'y@e.com', initial: 'Y' });
});

test('guest home shows the tagline, search and featured tours', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText('Where to next?')).toBeOnTheScreen();
});

test('search pill routes to Explore with focusSearch', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: /search tours & destinations/i }));
  expect(router.push).toHaveBeenCalledWith('/explore?focusSearch=1');
});

test('guests do not load trips or saved', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  expect(mockBookings).not.toHaveBeenCalled();
  expect(mockSaved).not.toHaveBeenCalled();
});

test('signed-in home surfaces the next trip and routes to its detail', async () => {
  mockStatus = 'signedIn';
  mockFeatured.mockResolvedValueOnce([tourVm]);
  mockBookings.mockResolvedValue([bookingVm]);
  renderHome();
  expect(await screen.findByText('Your next trip')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('upcoming-BK-1'));
  expect(router.push).toHaveBeenCalledWith('/bookings/BK-1');
});

test('signed-in home shows the recently-saved rail with See all', async () => {
  mockStatus = 'signedIn';
  mockFeatured.mockResolvedValueOnce([tourVm]);
  mockSaved.mockResolvedValue([savedVm]);
  renderHome();
  expect(await screen.findByText('Recently saved')).toBeOnTheScreen();
  expect(screen.getByText('Sapa Trek')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'See all' }));
  expect(router.push).toHaveBeenCalledWith('/saved');
});

test('renders the featured error state with retry', async () => {
  mockFeatured.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
```

- [ ] **Step 3: run** the Home spec → green:

```bash
pnpm nx test mobile --testPathPatterns home.spec
```

- [ ] **Step 4: commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): task-first Home - search + next-trip + saved rail, drop hero/why/CTA (P5.5 N3)"
```

---

### Task 5: Gate + review + STATUS + device-pass handoff

- [ ] **Step 1: full gate (user runs it manually)** — hand over:

```bash
pnpm nx run-many -t lint typecheck test build
```

Confirm green + record the new mobile test count (expected ~144: +6 home,
+1 upcoming-card, +3 home-helpers, trips.spec unchanged at 4, minus the old
home suite's 4). Fix any lint/type fallout inline (e.g. an unused import left
by the Home rewrite) and re-run the affected target.

- [ ] **Step 2: review the diff** — dispatch a code-review subagent (Home
  touches the money-path-adjacent bookings surface, so review is not optional):
  check that no `['bookings','list']` / `['wishlist','list']` / `['profile']`
  fetch runs for a guest (all `enabled: signedIn`); the deleted `/bookings`
  route has no lingering `router.push('/bookings')` referrer; the upcoming
  card can never route to a non-existent code; `todayIso()` boundary is
  inclusive (departure today still shows). Fix findings, re-gate, commit.

- [ ] **Step 3: update this STATUS** (state · counts · deviations) + commit
  `docs(plan): N3 STATUS`.

- [ ] **Step 4: hand off for the combined on-device pass** — one session,
  four lists: **N3** — 5 tabs render + Trips tab shows the list / auth gate ·
  Home guest vs signed-in (greeting by time of day · next-trip card taps
  through to detail · saved rail · See all → Saved · search pill → Explore
  autofocus) · account "My bookings" → Trips; plus the still-owed **N2**
  (filter sheet · stepped booking on Stripe + PayPal · enquiry sheet ·
  show-all screens), **N1** (ripple · haptics · Fraunces headers · image
  fade-in · autofill) and **W4 payment loop** checklists. **Merge only after
  user approval** (rebase + `--ff-only`), then the docs sweep (plan STATUS ·
  `docs/roadmap.md` · CLAUDE.md mobile row + P5.5 line · HANDOFF next-action ·
  the `p5-mobile-w1-done-w2-next` memory · test-count baselines everywhere).

---

## Self-review (against the N3 spec)

- **5 tabs (Home · Explore · Trips · Saved · Account):** Task 1 (tab layout +
  `trips.tsx`, bookings list out of Account, detail stays a stack screen). ✔
- **Account keeps a link back to Trips "for muscle memory":** Task 1 Step 6
  keeps the menu row, retargeted to `/trips`. ✔
- **Home task-first rebuild (greeting + search → Explore autofocus · next-trip
  card → Trips detail · recent-saved rail · featured shelf · destinations
  rail; removed hero/why-strip/CTA band):** Tasks 3–4. ✔
- **Reference step before layouting + confirm with user:** done in-session
  (layout A + time-of-day greeting, recorded in the plan header). ✔
- **Testing (tab layout + Home states; Trips reuses the bookings list spec
  nearly verbatim):** `home.spec` (6 states) + `home-helpers.spec` +
  `upcoming-trip-card.spec` + renamed `trips.spec` (4, verbatim). A dedicated
  expo-router `Tabs` render spec is intentionally **not** added — the repo has
  no `_layout` specs (Tabs need a navigation container to mount), so tab wiring
  is covered by typecheck + build + the device pass, consistent with existing
  practice. ✔
- **Zero backend/data-layer changes:** only additive `BookingVm.departureDate`
  surfaced from the existing DTO; no payload/mutation/query-key edits. ✔
