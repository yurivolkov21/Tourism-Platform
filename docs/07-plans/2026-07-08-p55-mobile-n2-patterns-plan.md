# P5.5 N2 — "Patterns" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task (this repo executes **inline — no
> subagents**). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining web-shaped interaction patterns with native
ones: bottom sheets (Explore filters · departure picker · enquiry), an
**Airbnb-style stepped booking flow**, and progressive disclosure on the
tour detail (Show-all sub-screens instead of long accordion stacks).

**Architecture:** One themed `AppSheet` wrapper in `@tourism/mobile-ui`
isolates the sheet dependency (`@gorhom/bottom-sheet` v5; if it misbehaves
with reanimated 4 in Expo Go, the wrapper's internals swap to a hand-rolled
reanimated sheet with the SAME public API — downstream tasks never change).
The booking pipeline (`buildCreateBookingPayload` → `createBooking` →
`startCheckout` → result screen) is REUSED VERBATIM; steps only re-shape
where the inputs are collected. A small `BookingDraft` context carries
cross-step state (departure · party · contact) in memory.

**Tech Stack:** `@gorhom/bottom-sheet` v5 (+ existing reanimated 4 /
gesture-handler) · expo-router stack screens · TanStack Query (unchanged
keys) · `@tourism/i18n`.

**Spec:** `docs/06-specs/2026-07-08-p55-mobile-native-ux-design.md` (Wave N2)

## STATUS

- **State:** MERGED (2026-07-08) — all 6 tasks done inline; full gate green
  (run by the user); merged ff-only on user approval. The combined
  on-device pass (N2 checklist + owed N1 feel checklist + owed W4 payment
  loop) was NOT explicitly reported before merge — it remains the standing
  device-pass debt (see Task 6 Step 4).
- **Branch:** `feat/mobile-n2-patterns` (merged, deleted)
- **Tests:** mobile **126 → 139** · mobile-ui **33 → 34** (counts computed
  from suite runs; the user's full gate confirmed green).
- **Adversarial re-review (money path) DONE — 5 findings, all fixed**
  (`66b1d03`): AppSheet `scrollable` + keyboard props (long departure lists
  clipped, keyboard covered sheet forms) · BookingDraft resets on
  SIGNED_OUT (contact PII across account switches) · Continue re-clamps
  the party against current seats · "Edit trip" reopens seeded instead of
  hard-reset.
- **Deviations from plan:** `currency` added to BookingDraft (trip summary
  needed it); `require('@tourism/mobile-ui')` inside a jest.mock factory
  trips `@nx/enforce-module-boundaries` project-wide (lazy-load detection)
  — mocks render plain RN Text; bottom-sheet 5.2.14 verified bundling with
  reanimated 4 (`expo export --clear`; the SHA-1 error was stale Metro
  cache after pnpm re-link). Process rules added mid-wave: kill orphaned
  nx/jest node processes before new runs; the USER runs gate checks
  manually in his own terminal.
- **RESUME STATE:** hand off for the combined on-device pass (N2 checklist
  + owed N1 feel checklist + owed W4 payment loop), then rebase +
  `--ff-only` merge + docs sweep. Next wave: N3 IA & Home (5 tabs w/ Trips ·
  task-first Home).

## Global Constraints

- **Execute inline — no subagents; no worktrees** (standing rules).
- **Zero backend/data-layer changes** — `lib/booking.ts`, `booking-form.ts`,
  `price.ts`, query keys and their 126-test suite stay untouched. If a task
  seems to need a data-layer change, stop and re-check.
- **Money-path rule:** Task 3 re-shapes where booking inputs are collected —
  an adversarial re-review of the step flow runs before merge (Task 6).
- No hex colors · straight quotes · Conventional Commits · commit per task.
- Specs outside `src/app/` · QueryClient `gcTime: 0` for queries AND
  mutations · `mock*`-prefixed factory vars · re-set replaced mock
  implementations in `beforeEach` · `--testPathPatterns` (Jest 30).
- Device-polish checklist applies to all new surfaces (ripple ·
  keyboardShouldPersistTaps · no scroll indicators · themed RefreshControl).

---

### Task 1: Sheet infrastructure (`AppSheet` + providers + jest)

**Files:**
- Modify: `apps/mobile/package.json` + `libs/mobile/ui/package.json` (dep)
- Modify: `apps/mobile/src/app/_layout.tsx` (root providers)
- Create: `libs/mobile/ui/src/lib/sheet.tsx` (+ export from
  `libs/mobile/ui/src/index.ts`)
- Modify: `apps/mobile/src/test-setup.ts` + `libs/mobile/ui/src/test-setup.ts`
- Test: `libs/mobile/ui/src/lib/sheet.spec.tsx`

**Interfaces (produced — Tasks 2–4 consume):**
- `AppSheet` — `forwardRef<AppSheetRef, { children: ReactNode; snapPoints?: (string | number)[]; onDismiss?: () => void }>`;
  themed background/handle + tap-to-close backdrop; dynamic sizing when no
  `snapPoints`.
- `AppSheetRef` = `{ present(): void; dismiss(): void }`.
- `AppSheetScrollView` / `AppSheetTextInput` re-exports (sheet-aware
  scroll/keyboard internals).

- [ ] **Step 1: Install** (root-level so both projects resolve it):

```bash
cd apps/mobile
pnpm exec expo install @gorhom/bottom-sheet
cd ../..
```

Add to `libs/mobile/ui/package.json` `peerDependencies` + `devDependencies`
(same range `expo install` picked), then `pnpm install`. If jest later
fails to parse it, add `@gorhom` to the apps/mobile transformIgnorePatterns
allowlist.

- [ ] **Step 2: Root providers** in `_layout.tsx` — wrap ThemedStack:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// inside RootLayout's return, around the existing tree:
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BottomSheetModalProvider>
              <StatusBar style="auto" />
              <ThemedStack />
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
```

- [ ] **Step 3: `sheet.tsx`** — the wrapper (complete):

```tsx
import { forwardRef, useCallback, useImperativeHandle, useRef, type ReactNode } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from './theme-provider';

export interface AppSheetRef {
  present(): void;
  dismiss(): void;
}

export interface AppSheetProps {
  children: ReactNode;
  /** Omit for content-sized sheets (dynamic sizing). */
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

/**
 * Themed modal bottom sheet. Wraps @gorhom/bottom-sheet so the dependency
 * (and any future replacement) stays behind ONE component. Requires
 * BottomSheetModalProvider + GestureHandlerRootView at the root.
 */
export const AppSheet = forwardRef<AppSheetRef, AppSheetProps>(function AppSheet(
  { children, snapPoints, onDismiss },
  ref,
) {
  const theme = useTheme();
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors['card'],
        borderRadius: theme.radius.lg,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors['muted-foreground'] }}
    >
      <BottomSheetView style={{ paddingBottom: theme.spacing(6) }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});

export { BottomSheetScrollView as AppSheetScrollView, BottomSheetTextInput as AppSheetTextInput };
```

Export `AppSheet`, `AppSheetRef`, `AppSheetScrollView`, `AppSheetTextInput`
from `libs/mobile/ui/src/index.ts`.

- [ ] **Step 4: Jest mocks** — append to BOTH test-setups (the mock renders
  sheet children unconditionally so specs assert content + interactions):

```ts
// Bottom sheet has native gesture/reanimated internals — render children
// in plain Views; present/dismiss become inert jest.fn()s on the ref.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView, TextInput } = require('react-native');
  const Modal = React.forwardRef(
    (props: { children?: unknown; onDismiss?: () => void }, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: () => props.onDismiss?.(),
      }));
      return React.createElement(View, null, props.children as never);
    },
  );
  return {
    BottomSheetModal: Modal,
    BottomSheetModalProvider: ({ children }: { children?: unknown }) => children,
    BottomSheetView: View,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
    BottomSheetBackdrop: () => null,
  };
});
```

- [ ] **Step 5: Failing spec → green** — `sheet.spec.tsx`:

```tsx
import { createRef } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { AppSheet, type AppSheetRef } from './sheet';

test('renders its content and exposes present/dismiss', () => {
  const ref = createRef<AppSheetRef>();
  render(
    <ThemeProvider>
      <AppSheet ref={ref}>
        <Text>Sheet body</Text>
      </AppSheet>
    </ThemeProvider>,
  );
  expect(screen.getByText('Sheet body')).toBeOnTheScreen();
  expect(typeof ref.current?.present).toBe('function');
  expect(typeof ref.current?.dismiss).toBe('function');
});
```

Run red (module missing) → implement → green.

- [ ] **Step 6: Verify + commit**

`pnpm nx run-many -t lint typecheck test -p mobile mobile-ui` green +
`pnpm nx build mobile` (bundles — the real lib must compile with
reanimated 4; if the export fails on a reanimated-4 incompatibility, STOP
and pivot the AppSheet internals to a hand-rolled reanimated sheet, same
API — the rest of the plan proceeds unchanged).

```bash
git add apps/mobile libs/mobile/ui pnpm-lock.yaml
git commit -m "feat(mobile-ui): AppSheet themed bottom-sheet wrapper + root providers (P5.5 N2)"
```

---

### Task 2: Explore filter sheet

Collapse the 3 facet chip rails into a Filter button (active-count badge)
opening a sheet with a DRAFT state + live "Show N results" CTA. Search +
destination rail + results count stay.

**Files:**
- Modify: `apps/mobile/src/lib/explore-state.ts` (+`countActiveFilters`)
- Test: `apps/mobile/src/lib/explore-state.spec.ts` (+3 cases)
- Create: `apps/mobile/src/components/filter-sheet.tsx`
- Modify: `apps/mobile/src/app/(tabs)/explore.tsx`
- Modify: `libs/shared/i18n/src/lib/messages.ts` (`mobile.explore` +3 keys)
- Test: `apps/mobile/src/__tests__/explore.spec.tsx` (adjust + 1 flow test)

**Interfaces:**
- Consumes: `AppSheet` (T1) · existing `ExploreState` helpers.
- Produces: `countActiveFilters(state: ExploreState): number` (durations +
  prices + non-default sort) · `<FilterSheet state draft-edits, onApply>`.

- [ ] **Step 1 (TDD):** failing cases in `explore-state.spec.ts`:

```ts
test('countActiveFilters counts buckets and a non-default sort', () => {
  expect(countActiveFilters(defaultExploreState)).toBe(0);
  expect(
    countActiveFilters({ ...defaultExploreState, durations: ['1'], prices: ['<100', '300+'] }),
  ).toBe(3);
  expect(countActiveFilters({ ...defaultExploreState, sort: 'rating' })).toBe(1);
});
```

Implement in `explore-state.ts`:

```ts
/** Facets active beyond the defaults (drives the Filter button badge). */
export function countActiveFilters(state: ExploreState): number {
  return (
    state.durations.length + state.prices.length + (state.sort === defaultExploreState.sort ? 0 : 1)
  );
}
```

- [ ] **Step 2: i18n** — add to `messages.mobile.explore`:

```ts
      filtersCta: 'Filters',
      showResults: (n: number) => `Show ${n} ${n === 1 ? 'result' : 'results'}`,
      clearAll: 'Clear all',
```

- [ ] **Step 3: `filter-sheet.tsx`** — draft state initialized from the
  applied state each time the sheet opens; chips edit the draft; footer =
  Clear all (outline) + `showResults(previewCount)` (primary). The parent
  passes `previewCount` computed with `applyExploreState(tours, draft)`.
  Structure (complete):

```tsx
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import type { DurationBucket, PriceBucket, TourSort } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppSheet, AppText, Button, Chip, useTheme, type AppSheetRef } from '@tourism/mobile-ui';
import {
  defaultExploreState,
  toggleBucket,
  type ExploreState,
} from '../lib/explore-state';

const t = messages.mobile.explore;
const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const PRICES: PriceBucket[] = ['<100', '100-300', '300+'];
const SORTS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

export interface FilterSheetRef {
  open(applied: ExploreState): void;
}

export function FilterSheetSection({ title, children }: { title: string; children: ReactNode }) { /* heading + wrap row, same ChipRow style as explore */ }

export const FilterSheet = forwardRef<FilterSheetRef, {
  previewCount: (draft: ExploreState) => number;
  onApply: (draft: ExploreState) => void;
}>(function FilterSheet({ previewCount, onApply }, ref) {
  const sheetRef = useRef<AppSheetRef>(null);
  const [draft, setDraft] = useState<ExploreState>(defaultExploreState);
  useImperativeHandle(ref, () => ({
    open: (applied) => {
      setDraft(applied);
      sheetRef.current?.present();
    },
  }));
  // sections: duration chips / price chips / sort chips editing `draft`
  // (same testIDs as today: duration-*, price-*, sort-*)
  // footer: Clear all → setDraft({ ...draft, durations: [], prices: [], sort: defaultExploreState.sort })
  //         Show N results (testID "apply-filters") → onApply(draft); sheetRef.current?.dismiss()
});
```

(Write the full JSX in-code following Explore's current chip rows — labels
`t.duration/t.price/t.sort`, selected from `draft`.)

- [ ] **Step 4: Rework `explore.tsx` header** — delete the three `ChipRow`
  blocks; after the destinations rail add:

```tsx
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
        <Button
          testID="open-filters"
          variant="outline"
          label={
            countActiveFilters(state) > 0
              ? `${t.filtersCta} (${countActiveFilters(state)})`
              : t.filtersCta
          }
          onPress={() => filterSheetRef.current?.open(state)}
        />
        {hasActiveFilters(state) ? (
          <Button variant="outline" label={t.clearAll} onPress={() => setState((s) => ({ ...defaultExploreState, query: s.query, destination: s.destination }))} />
        ) : null}
      </View>
```

Mount once next to the FlatList:

```tsx
      <FilterSheet
        ref={filterSheetRef}
        previewCount={(draft) => (toursQ.data ? applyExploreState(toursQ.data, draft).length : 0)}
        onApply={(draft) => setState((s) => ({ ...draft, query: s.query, destination: s.destination }))}
      />
```

(Draft carries facets only — query/destination stay owned by the header.)

- [ ] **Step 5: Spec updates** — in `explore.spec.tsx`, facet-chip presses
  keep working (mock renders sheet content inline); add one flow test:
  press `open-filters` → press `duration-1` → press `apply-filters` →
  list shows only the 1-day tour. Run → green.

- [ ] **Step 6: Verify + commit**

```bash
git add apps/mobile libs/shared/i18n
git commit -m "feat(mobile): Explore filter bottom sheet with draft state + live result count"
```

---

### Task 3: Stepped booking (Airbnb-style) — MONEY PATH

Flow: tour detail → **DepartureSheet** (departure + travellers + live
total) → **Contact step** (`tours/[slug]/book`) → **Payment step**
(`tours/[slug]/book-payment`) → existing create→checkout→result pipeline,
byte-for-byte.

**Files:**
- Create: `apps/mobile/src/lib/booking-draft.tsx` (context)
- Test: `apps/mobile/src/__tests__/booking-draft.spec.tsx`
- Create: `apps/mobile/src/components/stepper.tsx` (moved out of book.tsx)
- Create: `apps/mobile/src/components/departure-sheet.tsx`
- Rewrite: `apps/mobile/src/app/tours/[slug]/book.tsx` → contact step
- Create: `apps/mobile/src/app/tours/[slug]/book-payment.tsx`
- Modify: `apps/mobile/src/app/tours/[slug]/index.tsx` (Book now opens the
  sheet) · `apps/mobile/src/app/_layout.tsx` (register `book-payment`,
  titles per step) · root layout mounts `BookingDraftProvider`
- Modify: `libs/shared/i18n/src/lib/messages.ts` (`mobile.booking` step keys)
- Tests: split `book-screen.spec.tsx` → `departure-sheet.spec.tsx` +
  `booking-contact.spec.tsx` + `booking-payment.spec.tsx`

**Interfaces:**
- `useBookingDraft()` → `{ draft: BookingDraft | null; setTrip(t: { tourSlug: string; departureId: string; departureLabel: string; unitPrice: number; adults: number; children: number }): void; setContact(c: { name: string; email: string; phone: string; requests: string }): void; reset(): void }`
  where `BookingDraft = { tourSlug, departureId, departureLabel, unitPrice, adults, children, name?, email?, phone?, requests? }` —
  `departureLabel` + `unitPrice` ride along so the contact/payment steps
  render the trip summary + order lines without refetching departures.
- `DepartureSheet` — `forwardRef<{ open(): void }, { slug: string; basePrice: number; currency: string }>`;
  Continue validates (departure picked · adults ≥ 1 · party ≤ seats) →
  `setTrip` → dismiss → `router.push('/tours/'+slug+'/book')`.
- Guards: contact step redirects to the tour when `draft?.tourSlug !== slug`
  or no departure; payment step additionally requires contact fields.
- Payment submit: builds the SAME `BookingFormRaw` (from draft + provider)
  through `buildCreateBookingPayload`; mutation + navigation code moves
  UNCHANGED from the current book.tsx (incl. the checkout-failure →
  result-without-url path and `disabled={!selected}` semantics via the
  sheet's validation).
- i18n additions (`mobile.booking`): `stepLabel: (n: number, total: number) => 'Step ' + n + ' of ' + total`,
  `continue: 'Continue'`, `tripHeading: 'Your trip'`, `editTrip: 'Edit'`.

- [ ] **Step 1 (TDD): draft context spec** — provider + setTrip/setContact/
  reset round-trip (renderHook from RNTL). Red → implement `booking-draft.tsx`
  (plain context + useState; no persistence — abandoning the flow discards).
- [ ] **Step 2: extract `Stepper`** verbatim from book.tsx into
  `components/stepper.tsx` (same testIDs `adults-*`/`children-*`).
- [ ] **Step 3: `departure-sheet.tsx`** — content = departure option cards
  (same testIDs `departure-*`, price via `formatMoney`, seats badges,
  sold-out disabled) + two Steppers capped by the selected option's
  seats + live total (`computeBookingTotal`) + `stepLabel(0…)`? No — the
  sheet is pre-flow: footer = total + Continue (testID `continue-trip`).
  Uses `['departures', slug]` query + `toDepartureOptions`.
- [ ] **Step 4: detail hook-up** — Book now (signed-in) presents the sheet;
  guest routing unchanged. The sheet mounts inside the detail screen.
- [ ] **Step 5: contact step rewrite** (`book.tsx`) — header option title
  stays `booking.page.title` + caption `stepLabel(1, 2)`; trip summary card
  reads the draft (departure label via options query or the sheet passes
  the label into the draft — store `departureLabel` in the draft at
  setTrip to avoid refetch); contact fields (prefill from profile exactly
  as today) + requests; Continue (testID `continue-contact`) validates
  name ≥ 2 + email regex via `buildCreateBookingPayload` on a synthetic
  payload? NO — keep it simple and aligned: run `buildCreateBookingPayload`
  with a placeholder provider `'STRIPE'` and map only `INVALID_CONTACT` to
  the inline error; on ok → `setContact` → push `book-payment`.
- [ ] **Step 6: payment step** (`book-payment.tsx`) — `stepLabel(2, 2)` +
  provider radio cards (same testIDs `provider-*`) + order summary
  (departure · party line · unit × qty lines from `computeBookingTotal`
  `.lines` · total) + trust line + Confirm & pay (testID `submit`) running
  the MOVED mutation; on success `reset()` the draft then
  `router.replace(...)` exactly as today.
- [ ] **Step 7: routes** — `_layout.tsx`: `tours/[slug]/book` title stays;
  add `tours/[slug]/book-payment` `{ headerShown: true, title: messages.booking.form.paymentHeading }`.
  Mount `BookingDraftProvider` around ThemedStack (inside AuthProvider).
- [ ] **Step 8: specs** — port the 6 book-screen tests to the three new
  specs (departure select/steppers/sold-out → departure-sheet.spec;
  prefill/validation → booking-contact.spec; happy-path payload + replace
  URL + checkout-failure + API-error copy → booking-payment.spec, seeding
  the draft via a test wrapper that calls `setTrip`/`setContact` first).
  Delete `book-screen.spec.tsx`. Red → green per spec.
- [ ] **Step 9: verify + commit**

```bash
git add apps/mobile libs/shared/i18n
git commit -m "feat(mobile): Airbnb-style stepped booking - departure sheet, contact + payment steps"
```

---

### Task 4: Enquiry becomes a sheet

**Files:**
- Create: `apps/mobile/src/components/enquiry-sheet.tsx` (form moved
  verbatim from the modal: fields · validation · 429 branch · success
  check + auto-close timer with cleanup)
- Modify: `apps/mobile/src/app/tours/[slug]/index.tsx` (Inquire presents
  the sheet) · delete `apps/mobile/src/app/tours/[slug]/enquiry.tsx` ·
  remove its `_layout.tsx` entry
- Test: rename/adjust `enquiry-modal.spec.tsx` → `enquiry-sheet.spec.tsx`
  (same behavioral assertions; render the component directly)

Steps: move → rewire → adjust spec → green → commit
`feat(mobile): enquiry moves from route-modal to bottom sheet`.

---

### Task 5: Progressive disclosure on tour detail

**Files:**
- Modify: `apps/mobile/src/app/tours/[slug]/index.tsx` — itinerary shows
  the first **3** day-accordions + outline Button `showAllDays(n)` →
  `/tours/[slug]/itinerary`; FAQs show first **3** + `showAllFaqs(n)` →
  `/tours/[slug]/faqs`; reviews show first **3** + `seeAllReviews(n)` →
  `/tours/[slug]/reviews` (buttons only render when more exist)
- Create: `apps/mobile/src/app/tours/[slug]/itinerary.tsx` · `faqs.tsx` ·
  `reviews.tsx` — Screen + list (itinerary/FAQs reuse `Accordion`
  `initiallyOpen` for the first item; reviews = FlatList over
  `fetchTourReviews(slug, 50)` — extend the existing fetcher with an
  optional `pageSize = 6` param, default preserved)
- Modify: `apps/mobile/src/app/_layout.tsx` — register the 3 routes with
  native headers (titles = existing `mobile.tourDetail.*Title` keys)
- Modify: `libs/shared/i18n/src/lib/messages.ts` — `mobile.tourDetail`:
  `showAllDays/showAllFaqs/seeAllReviews: (n) => ...`
- Tests: `tour-detail-screen.spec.tsx` adjust (subset + button visible);
  new `tour-reviews-screen.spec.tsx` (list renders mocked reviews)

Steps: i18n → screens → detail trims → routes → specs → green → commit
`feat(mobile): show-all sub-screens for itinerary, FAQs and reviews`.

---

### Task 6: Gate + adversarial re-review + STATUS + device pass

- [ ] **Step 1:** full gate `pnpm nx run-many -t lint typecheck test build`
  (record counts; expect mobile ~130+ from the new specs).
- [ ] **Step 2: adversarial review (money path — never skip):** review the
  branch diff hunting: draft-state leaks between tours · steps reachable
  with a stale/foreign draft (guards) · double-submit on the payment step ·
  payload drift vs `buildCreateBookingPayload` · sheet dismiss racing
  navigation · reset-timing losing a created booking. Fix findings, rerun
  the gate, commit.
- [ ] **Step 3:** update this STATUS (state · counts · deviations) + commit.
- [ ] **Step 4: hand off for the on-device pass** (one session, three
  lists): N2 — filter sheet (draft/apply/clear · keyboard) · full stepped
  booking on Stripe test card AND PayPal sandbox · enquiry sheet · show-all
  screens; plus the owed N1 feel checklist and W4 payment-loop items not
  yet reported. **Merge only after user approval** (rebase + `--ff-only`),
  then the docs sweep.
