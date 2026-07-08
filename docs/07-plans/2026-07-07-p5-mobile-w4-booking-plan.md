# P5 Mobile W4 — Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task (this repo executes **inline — no
> subagents**, per the user's standing instruction). Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Full booking money-path on mobile — web-parity booking form with
prefill, hosted Stripe/PayPal checkout via the system browser, a
self-verifying in-app payment result screen, and full bookings management
(list · detail · pay now · cancel · cancellation request) in Account.

**Architecture:** Pure booking logic is **ported verbatim from web**
(`apps/web/src/lib/booking/*`) into `apps/mobile/src/lib/` so the two
clients cannot drift on the money path; screens are native expo-router
stack screens following the locked "Brand 100% + Structure native"
language. The app owns payment verification: after the browser closes it
refetches the booking and fires the idempotent PayPal capture itself.

**Tech Stack:** Expo SDK 54 · expo-router · TanStack Query v5 ·
`@tourism/core` typed client (throws `ApiRequestError` with
`.code`/`.status`) · `expo-web-browser` (new dep) · `@tourism/mobile-ui` ·
`@tourism/i18n`.

**Spec:** `docs/06-specs/2026-07-07-p5-mobile-w4-booking-design.md`

## STATUS

- **State:** EXECUTED (2026-07-08) — all 11 tasks done inline; awaiting
  on-device verification by the user, then merge.
- **Branch:** `feat/mobile-w4-booking`
- **Tests:** mobile **67 → 126** · mobile-ui **31 → 33** (gate: lint +
  typecheck + test green across the workspace; `mobile:build` = `eas build`
  fails for lack of `eas-cli` — pre-existing on `main`, not a W4 regression;
  `api:test` is flaky under full-parallel `nx affected` but passes standalone
  338/338).
- **Adversarial review (money path) DONE** — 8-angle finder pass + verify;
  all confirmed findings fixed in `fix(mobile): W4 adversarial-review
  findings…`. Highlights: Android `openBrowserAsync` resolves immediately
  (`{type:'opened'}`) → the result screen now verifies on AppState
  return-to-foreground; checkout failure after create lands on the result
  screen instead of risking a duplicate PENDING; `['bookings']` caches
  cleared on sign-out (cross-account PII); terminal statuses never offer
  Pay now; plain-401 sync retry (web parity); Badge destructive text uses
  the primary pair (no `destructive-foreground` token exists).
- **Deviations from plan:** `numChildren: 0` made explicit in `postBooking`
  (the generated `CreateBookingDto` requires it); review fixes added
  `lib/money.ts` (formatMoney) + `components/fact-row.tsx` and changed
  `fetchTourDepartures` to throw so the book screen shows a retry state
  (the plan's swallow-to-`[]` was itself a review finding); Book now gates
  only known guests (`signedOut`), not the transient `loading` state.
- **RESUME STATE:** hand off to the user for on-device verification
  (Task 11 Step 4), then rebase + `--ff-only` merge + docs sweep.

## Global Constraints

- **Execute inline in this session — no subagents** (user's standing rule).
- **No worktrees** — work on `feat/mobile-w4-booking` in the main checkout.
- **Zero backend changes.** All endpoints already exist.
- **No hex colors** — only `theme.colors[...]` from `@tourism/mobile-ui`.
- **All user-facing copy via `@tourism/i18n`** — reuse `messages.booking.*`
  (web keys) wherever possible; new mobile-only copy goes under
  `messages.mobile.booking`.
- **Custom fonts on Android ignore `fontWeight`** — switch families
  (`theme.fontFamilies.sansSemiBold` etc.), never set `fontWeight`.
- **Test specs live OUTSIDE `apps/mobile/src/app/`** (expo-router globs that
  dir) — screens' specs go in `apps/mobile/src/__tests__/`, lib specs next
  to their file in `apps/mobile/src/lib/`.
- Spec `QueryClient`s need `retry: false` and `gcTime: 0` for **both**
  `queries` and `mutations` (worker-leak gotcha).
- TanStack v5 passes a 2nd arg to `mutationFn` — assert on
  `mock.calls[0][0]`, never `toHaveBeenCalledWith`.
- Prefer `testID` over text queries when a Pressable contains descendant
  text (RNTL "found multiple elements" gotcha).
- Straight quotes in code; typographic apostrophes only inside i18n copy
  when the surrounding section already uses them (the `mobile.*` section
  uses straight apostrophes — keep that).
- Conventional Commits, no AI attribution. Commit after every task.
- Run tests per project: `pnpm nx test @tourism/mobile-ui`,
  `pnpm nx test @tourism/mobile` (from repo root).
- Device-polish checklist applies to every new screen: pressed states on
  every Pressable, `hitSlop` on small targets, themed `RefreshControl`,
  `keyboardShouldPersistTaps: 'handled'` on scrollables with inputs, no
  scroll indicators (Screen default).

---

### Task 1: Badge tones `muted` + `destructive` (mobile-ui)

Booking status badges need CANCELLED (muted) and REFUNDED /
PARTIALLY_REFUNDED (destructive) tones. Both color pairs
(`muted`/`muted-foreground`, `destructive`/`destructive-foreground`)
already exist in the RN theme, and `badge.tsx` already derives colors
generically from the tone name — only the type union changes.

**Files:**
- Modify: `libs/mobile/ui/src/lib/badge.tsx:4`
- Test: `libs/mobile/ui/src/lib/badge.spec.tsx`

**Interfaces:**
- Produces: `BadgeTone` now includes `'muted' | 'destructive'` — Task 5's
  `bookingStatusMeta` returns these.

- [ ] **Step 1: Write the failing test** — append to `badge.spec.tsx`:

```tsx
test('muted tone renders the muted pair (booking CANCELLED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Cancelled" tone="muted" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['muted']);
  const text = StyleSheet.flatten(screen.getByText('Cancelled').props.style);
  expect(text.color).toBe(tokens.colors.light['muted-foreground']);
});

test('destructive tone renders the destructive pair (booking REFUNDED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Refunded" tone="destructive" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['destructive']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile-ui`
Expected: FAIL — TS error `Type '"muted"' is not assignable to type 'BadgeTone'`.

- [ ] **Step 3: Extend the union** in `badge.tsx` (only this line changes —
  the `${tone}-foreground` color lookup already handles the new tones):

```ts
export type BadgeTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'rating'
  | 'muted'
  | 'destructive';
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile-ui`
Expected: PASS — 33 tests (31 + 2).

- [ ] **Step 5: Commit**

```bash
git add libs/mobile/ui/src/lib/badge.tsx libs/mobile/ui/src/lib/badge.spec.tsx
git commit -m "feat(mobile-ui): add muted + destructive Badge tones for booking statuses"
```

---

### Task 2: i18n — `mobile.booking` + booking sign-in reason

Mobile reuses web's `messages.booking.*` for all form/list/detail/result
copy; only mobile-flow copy (browser hand-off, verify states, steppers) is
new.

**Files:**
- Modify: `libs/shared/i18n/src/lib/messages.ts` — two edits inside the
  `mobile` section (which starts at line ~1729).

**Interfaces:**
- Produces: `messages.mobile.booking.*` and
  `messages.mobile.authPrompts.bookingReason` — consumed by Tasks 6–10.

- [ ] **Step 1: Add `bookingReason`** inside `mobile.authPrompts` (after
  `wishlistReason`):

```ts
      bookingReason: 'Sign in to book this tour.',
```

- [ ] **Step 2: Add the `booking` block** inside `mobile`, after the
  `enquiry` block (before `authPrompts`):

```ts
    booking: {
      bookCta: 'Book now',
      departuresError: "Couldn't load departures.",
      soldOut: 'Sold out',
      stepperDecrease: (field: string) => `Decrease ${field}`,
      stepperIncrease: (field: string) => `Increase ${field}`,
      browserHint:
        "Complete your payment in the secure browser window - we'll confirm your booking here when you're back.",
      openCheckout: 'Open payment page',
      verifying: 'Confirming your payment…',
      verifyAgain: 'Verify again',
      stillPendingTitle: 'Payment not confirmed yet',
      viewBooking: 'View booking',
      browseTours: 'Browse more tours',
      resultError: "Couldn't check your booking. Please try again.",
      listError: "Couldn't load your bookings.",
      detailError: "Couldn't load this booking.",
      retry: 'Try again',
    },
```

- [ ] **Step 3: Verify**

Run: `pnpm nx run-many -t typecheck -p @tourism/i18n @tourism/mobile`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add libs/shared/i18n/src/lib/messages.ts
git commit -m "feat(i18n): mobile booking copy (browser hand-off, verify states, steppers)"
```

---

### Task 3: `booking-form.ts` — payload builder (TDD, ported from web)

Verbatim port of `apps/web/src/lib/booking/booking-form.ts` so validation
cannot drift between clients. Same `BookingFormError` codes →
`messages.booking.errors` maps 1:1.

**Files:**
- Create: `apps/mobile/src/lib/booking-form.ts`
- Test: `apps/mobile/src/lib/booking-form.spec.ts`

**Interfaces:**
- Produces: `buildCreateBookingPayload(raw: BookingFormRaw): BuildBookingResult`,
  types `CreateBookingPayload`, `PaymentProvider = 'STRIPE' | 'PAYPAL'`,
  `BookingFormError` — consumed by Tasks 5 and 7.

- [ ] **Step 1: Write the failing spec** — `booking-form.spec.ts`:

```ts
import { buildCreateBookingPayload, type BookingFormRaw } from './booking-form';

const valid: BookingFormRaw = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: 'dep-1',
  numAdults: 2,
  numChildren: 1,
  paymentProvider: 'STRIPE',
  contactName: '  Nguyen Van A  ',
  contactEmail: ' a@example.com ',
  contactPhone: ' +84901234567 ',
  specialRequests: '  Vegetarian  ',
};

test('builds a trimmed payload from valid fields', () => {
  const result = buildCreateBookingPayload(valid);
  expect(result).toEqual({
    ok: true,
    payload: {
      tourSlug: 'hoi-an-walking-tour',
      departureId: 'dep-1',
      numAdults: 2,
      numChildren: 1,
      paymentProvider: 'STRIPE',
      contactName: 'Nguyen Van A',
      contactEmail: 'a@example.com',
      contactPhone: '+84901234567',
      specialRequests: 'Vegetarian',
    },
  });
});

test('coerces string counts to ints', () => {
  const result = buildCreateBookingPayload({ ...valid, numAdults: '3', numChildren: '0' });
  expect(result.ok && result.payload.numAdults).toBe(3);
  expect(result.ok && result.payload.numChildren).toBeUndefined();
});

test('omits empty optionals and zero children', () => {
  const result = buildCreateBookingPayload({
    ...valid,
    numChildren: 0,
    contactPhone: '   ',
    specialRequests: '',
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.payload).not.toHaveProperty('numChildren');
    expect(result.payload).not.toHaveProperty('contactPhone');
    expect(result.payload).not.toHaveProperty('specialRequests');
  }
});

test.each([
  [{ ...valid, tourSlug: '  ' }, 'MISSING_TOUR'],
  [{ ...valid, departureId: '' }, 'MISSING_DEPARTURE'],
  [{ ...valid, numAdults: 0 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numAdults: 21 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numChildren: -1 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numChildren: 21 }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, numAdults: 'abc' }, 'INVALID_PARTY_SIZE'],
  [{ ...valid, paymentProvider: 'CASH' }, 'INVALID_PROVIDER'],
  [{ ...valid, contactName: 'A' }, 'INVALID_CONTACT'],
  [{ ...valid, contactEmail: 'not-an-email' }, 'INVALID_CONTACT'],
] as [BookingFormRaw, string][])('rejects %j with %s', (raw, error) => {
  expect(buildCreateBookingPayload(raw)).toEqual({ ok: false, error });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-form`
Expected: FAIL — module `./booking-form` not found.

- [ ] **Step 3: Create `booking-form.ts`** — exact port (only the header
  comment differs from web):

```ts
/**
 * Pure mapper from the booking form's raw fields to the `POST /bookings`
 * body (`CreateBookingDto`). VERBATIM PORT of
 * `apps/web/src/lib/booking/booking-form.ts` — keep the two in sync so the
 * clients cannot drift on the money path. The API re-validates fully.
 */

export type PaymentProvider = 'STRIPE' | 'PAYPAL';

export interface CreateBookingPayload {
  tourSlug: string;
  departureId: string;
  numAdults: number;
  numChildren?: number;
  paymentProvider: PaymentProvider;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
}

export interface BookingFormRaw {
  tourSlug: string;
  departureId: string;
  numAdults: string | number;
  numChildren?: string | number;
  paymentProvider: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
}

/** Stable error codes; each maps to `messages.booking.errors`. */
export type BookingFormError =
  | 'MISSING_TOUR'
  | 'MISSING_DEPARTURE'
  | 'INVALID_PARTY_SIZE'
  | 'INVALID_PROVIDER'
  | 'INVALID_CONTACT';

export type BuildBookingResult =
  | { ok: true; payload: CreateBookingPayload }
  | { ok: false; error: BookingFormError };

const MAX_PARTY = 20;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Coerce a raw count to an int, or NaN when unparseable. */
function asInt(value: string | number | undefined): number {
  if (typeof value === 'number') return Math.trunc(value);
  return Number.parseInt(String(value ?? '').trim(), 10);
}

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function buildCreateBookingPayload(raw: BookingFormRaw): BuildBookingResult {
  const tourSlug = raw.tourSlug?.trim() ?? '';
  if (!tourSlug) return { ok: false, error: 'MISSING_TOUR' };

  const departureId = raw.departureId?.trim() ?? '';
  if (!departureId) return { ok: false, error: 'MISSING_DEPARTURE' };

  const numAdults = asInt(raw.numAdults);
  const numChildren = raw.numChildren === undefined ? 0 : asInt(raw.numChildren);
  const adultsOk = Number.isInteger(numAdults) && numAdults >= 1 && numAdults <= MAX_PARTY;
  const childrenOk =
    Number.isInteger(numChildren) && numChildren >= 0 && numChildren <= MAX_PARTY;
  if (!adultsOk || !childrenOk) return { ok: false, error: 'INVALID_PARTY_SIZE' };

  if (raw.paymentProvider !== 'STRIPE' && raw.paymentProvider !== 'PAYPAL') {
    return { ok: false, error: 'INVALID_PROVIDER' };
  }

  const contactName = raw.contactName?.trim() ?? '';
  const contactEmail = raw.contactEmail?.trim() ?? '';
  if (contactName.length < 2 || !isValidEmail(contactEmail)) {
    return { ok: false, error: 'INVALID_CONTACT' };
  }

  const payload: CreateBookingPayload = {
    tourSlug,
    departureId,
    numAdults,
    paymentProvider: raw.paymentProvider,
    contactName,
    contactEmail,
  };
  if (numChildren > 0) payload.numChildren = numChildren;
  const phone = clean(raw.contactPhone);
  if (phone) payload.contactPhone = phone;
  const requests = clean(raw.specialRequests);
  if (requests) payload.specialRequests = requests;

  return { ok: true, payload };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-form`
Expected: PASS — 13 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/booking-form.ts apps/mobile/src/lib/booking-form.spec.ts
git commit -m "feat(mobile): booking payload builder ported from web (TDD)"
```

---

### Task 4: `price.ts` — live total estimate (TDD, ported from web)

Verbatim port of `apps/web/src/lib/booking/price.ts`. Children price =
adult price (`childPriceRatio = 1`); the API recomputes the real charge.

**Files:**
- Create: `apps/mobile/src/lib/price.ts`
- Test: `apps/mobile/src/lib/price.spec.ts`

**Interfaces:**
- Produces: `computeBookingTotal(departurePrice, numAdults, numChildren?, childPriceRatio?) → { total: number; lines: PriceLine[] }` — consumed by Task 7.

- [ ] **Step 1: Write the failing spec** — `price.spec.ts`:

```ts
import { computeBookingTotal } from './price';

test('adults only', () => {
  expect(computeBookingTotal(120, 2)).toEqual({
    total: 240,
    lines: [{ kind: 'adult', unitPrice: 120, quantity: 2, subtotal: 240 }],
  });
});

test('adults + children at the same unit price by default', () => {
  const { total, lines } = computeBookingTotal(100, 2, 1);
  expect(total).toBe(300);
  expect(lines).toHaveLength(2);
  expect(lines[1]).toEqual({ kind: 'child', unitPrice: 100, quantity: 1, subtotal: 100 });
});

test('rounds money half-up to 2 decimals', () => {
  const { total } = computeBookingTotal(33.335, 3);
  expect(total).toBe(100.01);
});

test('child ratio prices children differently', () => {
  const { lines } = computeBookingTotal(100, 1, 2, 0.5);
  expect(lines[1]).toEqual({ kind: 'child', unitPrice: 50, quantity: 2, subtotal: 100 });
});

test('invalid or negative counts collapse to 0', () => {
  expect(computeBookingTotal(100, -2, Number.NaN)).toEqual({ total: 0, lines: [] });
});

test('fractional counts floor', () => {
  expect(computeBookingTotal(100, 2.9).total).toBe(200);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern "lib/price"`
Expected: FAIL — module `./price` not found.

- [ ] **Step 3: Create `price.ts`** — exact port:

```ts
/**
 * Pure price helper for the booking summary. VERBATIM PORT of
 * `apps/web/src/lib/booking/price.ts` — keep in sync. The API is the source
 * of truth for the real charge (it re-computes `totalAmount` from the
 * departure price); this only renders a transparent client-side estimate.
 *
 * Children default to the same unit price as adults (`childPriceRatio = 1`).
 * Money is rounded to 2 decimals to avoid floating-point artefacts.
 */

export type LineKind = 'adult' | 'child';

export interface PriceLine {
  kind: LineKind;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface BookingTotal {
  total: number;
  lines: PriceLine[];
}

/** Round a money amount to 2 decimals (half-up). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Coerce a count to a non-negative integer (invalid/negative → 0). */
function asCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function computeBookingTotal(
  departurePrice: number,
  numAdults: number,
  numChildren = 0,
  childPriceRatio = 1,
): BookingTotal {
  const adults = asCount(numAdults);
  const children = asCount(numChildren);
  const childUnit = round2(departurePrice * childPriceRatio);

  const lines: PriceLine[] = [];
  if (adults > 0) {
    lines.push({
      kind: 'adult',
      unitPrice: departurePrice,
      quantity: adults,
      subtotal: round2(departurePrice * adults),
    });
  }
  if (children > 0) {
    lines.push({
      kind: 'child',
      unitPrice: childUnit,
      quantity: children,
      subtotal: round2(childUnit * children),
    });
  }

  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
  return { total, lines };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern "lib/price"`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/price.ts apps/mobile/src/lib/price.spec.ts
git commit -m "feat(mobile): booking total estimate ported from web (TDD)"
```

---

### Task 5: `booking.ts` — VMs, status meta, fetchers (TDD)

The data layer: departure options + booking VM mappers (pure, TDD),
status→Badge-tone meta, error-code→copy mapping, and the API wrappers
including the **USER_NOT_SYNCED retry-once**.

**Files:**
- Create: `apps/mobile/src/lib/booking.ts`
- Test: `apps/mobile/src/lib/booking.spec.ts`

**Interfaces:**
- Consumes: `CreateBookingPayload` (Task 3) · `BadgeTone` incl. `muted`/`destructive` (Task 1) · `getApiClient` (`./api`).
- Produces (consumed by Tasks 7–10):
  - `toDepartureOptions(departures: DepartureDto[], basePrice: number): DepartureOption[]` — `DepartureOption = { id; label; price; seatsLeft }`
  - `bookingStatusMeta(status: string): { label: string; tone: BadgeTone }`
  - `toBookingVm(dto: BookingDto): BookingVm` and the `BookingVm` interface
  - `bookingErrorMessage(error: unknown): string`
  - `fetchTourDepartures(slug)` · `fetchMyBookings()` · `fetchBooking(code)` · `createBooking(payload)` · `startCheckout(code): Promise<string>` · `captureBooking(code)` · `cancelBooking(code)` · `requestCancellation(code, reason?)`

- [ ] **Step 1: Write the failing spec** — `booking.spec.ts`:

```ts
import { ApiRequestError, type components } from '@tourism/core';
import {
  bookingErrorMessage,
  bookingStatusMeta,
  createBooking,
  toBookingVm,
  toDepartureOptions,
} from './booking';
import { getApiClient } from './api';

jest.mock('./api', () => ({ getApiClient: jest.fn() }));
jest.mock('./supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));

type BookingDto = components['schemas']['BookingDto'];
type DepartureDto = components['schemas']['DepartureDto'];

function apiError(status: number, code: string): ApiRequestError {
  return new ApiRequestError(status, { code, message: code } as never);
}

const departure = {
  id: 'dep-1',
  startDate: '2026-08-15',
  seatsTotal: 10,
  seatsBooked: 4,
  priceOverride: null,
} as unknown as DepartureDto;

describe('toDepartureOptions', () => {
  test('uses the base price when no override, UTC weekday label, seats left', () => {
    expect(toDepartureOptions([departure], 120)).toEqual([
      { id: 'dep-1', label: 'Sat, 15 Aug 2026', price: 120, seatsLeft: 6 },
    ]);
  });

  test('price override wins and seats clamp at 0', () => {
    const overbooked = { ...departure, priceOverride: '99.00', seatsBooked: 12 } as DepartureDto;
    expect(toDepartureOptions([overbooked], 120)[0]).toMatchObject({ price: 99, seatsLeft: 0 });
  });
});

describe('bookingStatusMeta', () => {
  test.each([
    ['PAID', 'Paid', 'success'],
    ['PENDING', 'Awaiting payment', 'warning'],
    ['CANCELLED', 'Cancelled', 'muted'],
    ['REFUNDED', 'Refunded', 'destructive'],
    ['PARTIALLY_REFUNDED', 'Partially refunded', 'destructive'],
  ])('%s → %s / %s', (status, label, tone) => {
    expect(bookingStatusMeta(status)).toEqual({ label, tone });
  });

  test('unknown status falls back to muted with the raw status as label', () => {
    expect(bookingStatusMeta('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'muted' });
  });
});

const bookingDto = {
  id: 'b-1',
  code: 'BK-7Q2KX9AB',
  status: 'PAID',
  numAdults: 2,
  numChildren: 1,
  totalAmount: '300.00',
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'Nguyen Van A',
  contactEmail: 'a@example.com',
  contactPhone: null,
  specialRequests: null,
  tour: { slug: 'hoi-an-walking-tour', title: 'Hoi An Walking Tour' },
  departure: { startDate: '2026-08-15', endDate: '2026-08-18' },
  createdAt: '2026-07-07T10:00:00.000Z',
  updatedAt: '2026-07-07T10:00:00.000Z',
  refundedAmount: null,
  cancellationRequest: null,
} as unknown as BookingDto;

describe('toBookingVm', () => {
  test('maps the full DTO', () => {
    const vm = toBookingVm(bookingDto);
    expect(vm).toMatchObject({
      code: 'BK-7Q2KX9AB',
      status: 'PAID',
      statusMeta: { label: 'Paid', tone: 'success' },
      tourTitle: 'Hoi An Walking Tour',
      tourSlug: 'hoi-an-walking-tour',
      departureLabel: 'Sat, 15 Aug 2026',
      bookedOn: '07 Jul 2026',
      party: '2 adults · 1 child',
      totalAmount: 300,
      currency: 'USD',
      paymentProvider: 'STRIPE',
    });
    expect(vm.contactPhone).toBeUndefined();
    expect(vm.refundedAmount).toBeUndefined();
    expect(vm.cancellationStatus).toBeUndefined();
  });

  test('singular party line and refund fields', () => {
    const vm = toBookingVm({
      ...bookingDto,
      numAdults: 1,
      numChildren: 0,
      status: 'PARTIALLY_REFUNDED',
      refundedAmount: '30.00',
      cancellationRequest: { status: 'REFUNDED', reason: '', createdAt: '', decisionNote: null },
    } as unknown as BookingDto);
    expect(vm.party).toBe('1 adult');
    expect(vm.refundedAmount).toBe(30);
    expect(vm.cancellationStatus).toBe('REFUNDED');
  });
});

describe('bookingErrorMessage', () => {
  test('maps a known API code', () => {
    expect(bookingErrorMessage(apiError(409, 'SEATS_NOT_AVAILABLE'))).toMatch(/sold out/i);
  });
  test('unknown errors fall back to generic copy', () => {
    expect(bookingErrorMessage(new Error('boom'))).toMatch(/something went wrong/i);
  });
});

describe('createBooking USER_NOT_SYNCED retry', () => {
  const payload = {
    tourSlug: 'hoi-an-walking-tour',
    departureId: 'dep-1',
    numAdults: 2,
    paymentProvider: 'STRIPE' as const,
    contactName: 'Nguyen Van A',
    contactEmail: 'a@example.com',
  };

  test('re-syncs once then retries', async () => {
    const POST = jest
      .fn()
      .mockRejectedValueOnce(apiError(401, 'USER_NOT_SYNCED')) // create #1
      .mockResolvedValueOnce({ data: {} }) // auth/sync
      .mockResolvedValueOnce({ data: { data: bookingDto } }); // create #2
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    const result = await createBooking(payload);
    expect(result.code).toBe('BK-7Q2KX9AB');
    expect(POST).toHaveBeenCalledTimes(3);
    expect(POST.mock.calls[1][0]).toBe('/api/v1/auth/sync');
  });

  test('other errors are not retried', async () => {
    const POST = jest.fn().mockRejectedValue(apiError(409, 'SEATS_NOT_AVAILABLE'));
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    await expect(createBooking(payload)).rejects.toMatchObject({ code: 'SEATS_NOT_AVAILABLE' });
    expect(POST).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern "lib/booking.spec"`
Expected: FAIL — module `./booking` not found.

- [ ] **Step 3: Create `booking.ts`:**

```ts
import { ApiRequestError, type components } from '@tourism/core';
import { messages } from '@tourism/i18n';
import type { BadgeTone } from '@tourism/mobile-ui';
import { getApiClient } from './api';
import type { CreateBookingPayload } from './booking-form';

export type BookingDto = components['schemas']['BookingDto'];
export type DepartureDto = components['schemas']['DepartureDto'];
type CheckoutSessionDto = components['schemas']['CheckoutSessionDto'];

/** "Fri, 15 Aug 2026" from a YYYY-MM-DD date (UTC avoids a day-boundary off-by-one). */
export function formatDepartureLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "07 Jul 2026" — booked-on / compact dates (UTC). */
export function formatBookingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A bookable departure, shaped for the form's picker + live price. */
export interface DepartureOption {
  id: string;
  label: string;
  /** Effective per-person price (departure override, else the tour base price). */
  price: number;
  seatsLeft: number;
}

/** Maps open departures → picker options (same shape as web's toDepartureOptions). */
export function toDepartureOptions(
  departures: DepartureDto[],
  basePrice: number,
): DepartureOption[] {
  return departures.map((d) => ({
    id: d.id,
    label: formatDepartureLabel(d.startDate),
    price: d.priceOverride != null ? Number(d.priceOverride) : basePrice,
    seatsLeft: Math.max(0, d.seatsTotal - d.seatsBooked),
  }));
}

export interface BookingStatusMeta {
  label: string;
  tone: BadgeTone;
}

// Same status→tone mapping as web's bookingStatusTone (my-bookings.ts).
const STATUS_TONES: Record<string, BadgeTone> = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'muted',
  REFUNDED: 'destructive',
  PARTIALLY_REFUNDED: 'destructive',
};

export function bookingStatusMeta(status: string): BookingStatusMeta {
  return {
    label: messages.booking.list.status[status] ?? status,
    tone: STATUS_TONES[status] ?? 'muted',
  };
}

/** "2 adults · 1 child" via the shared web copy helpers. */
export function partyLine(numAdults: number, numChildren: number): string {
  const parts = [messages.booking.page.adultsLine(numAdults)];
  if (numChildren > 0) parts.push(messages.booking.page.childrenLine(numChildren));
  return parts.join(' · ');
}

export interface BookingVm {
  code: string;
  status: BookingDto['status'];
  statusMeta: BookingStatusMeta;
  tourTitle: string;
  tourSlug: string;
  departureLabel: string;
  bookedOn: string;
  party: string;
  totalAmount: number;
  currency: string;
  paymentProvider: BookingDto['paymentProvider'];
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
  cancellationStatus?: 'REQUESTED' | 'REFUNDED' | 'DENIED';
  refundedAmount?: number;
}

export function toBookingVm(dto: BookingDto): BookingVm {
  return {
    code: dto.code,
    status: dto.status,
    statusMeta: bookingStatusMeta(dto.status),
    tourTitle: dto.tour.title,
    tourSlug: dto.tour.slug,
    departureLabel: formatDepartureLabel(dto.departure.startDate),
    bookedOn: formatBookingDate(dto.createdAt),
    party: partyLine(dto.numAdults, dto.numChildren),
    totalAmount: Number(dto.totalAmount),
    currency: dto.currency,
    paymentProvider: dto.paymentProvider,
    contactName: dto.contactName,
    contactEmail: dto.contactEmail,
    contactPhone: dto.contactPhone ?? undefined,
    specialRequests: dto.specialRequests ?? undefined,
    cancellationStatus: dto.cancellationRequest?.status,
    refundedAmount: dto.refundedAmount != null ? Number(dto.refundedAmount) : undefined,
  };
}

/** Friendly EN for a booking/API failure (`ApiRequestError.code` → web copy). */
export function bookingErrorMessage(error: unknown): string {
  const errors = messages.booking.errors as Record<string, string>;
  if (error instanceof ApiRequestError && errors[error.code]) return errors[error.code];
  return errors['generic'];
}

/** Open departures for a tour (public). `[]` on any error → graceful empty state. */
export async function fetchTourDepartures(slug: string): Promise<DepartureDto[]> {
  try {
    const { data } = await getApiClient().GET('/api/v1/tours/{slug}/departures', {
      params: { path: { slug }, query: { status: 'OPEN' } },
    });
    return (data as unknown as { data?: DepartureDto[] } | undefined)?.data ?? [];
  } catch {
    return [];
  }
}

/** The caller's bookings, newest first (top 50 on the API). Throws on failure. */
export async function fetchMyBookings(): Promise<BookingVm[]> {
  const { data } = await getApiClient().GET('/api/v1/bookings/me');
  const list = (data as unknown as { data?: BookingDto[] } | undefined)?.data ?? [];
  return list.map(toBookingVm);
}

/** One booking by code (owner-only; the API collapses forbidden to 404 → null). */
export async function fetchBooking(code: string): Promise<BookingVm | null> {
  try {
    const { data } = await getApiClient().GET('/api/v1/bookings/{code}', {
      params: { path: { code } },
    });
    const dto = (data as unknown as { data?: BookingDto } | undefined)?.data;
    return dto ? toBookingVm(dto) : null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

async function postBooking(payload: CreateBookingPayload): Promise<BookingDto> {
  const { data } = await getApiClient().POST('/api/v1/bookings', { body: payload });
  const dto = (data as unknown as { data?: BookingDto } | undefined)?.data;
  if (!dto) throw new Error('empty booking response');
  return dto;
}

/**
 * Create a PENDING booking. The first authed write can race the user mirror
 * (USER_NOT_SYNCED) — re-sync once and retry, exactly like web.
 */
export async function createBooking(payload: CreateBookingPayload): Promise<BookingDto> {
  try {
    return await postBooking(payload);
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === 'USER_NOT_SYNCED') {
      await getApiClient().POST('/api/v1/auth/sync', { body: {} });
      return postBooking(payload);
    }
    throw error;
  }
}

/** Start a hosted-checkout session for a PENDING booking → the gateway URL. */
export async function startCheckout(code: string): Promise<string> {
  const { data } = await getApiClient().POST('/api/v1/bookings/{code}/checkout', {
    params: { path: { code } },
  });
  const dto = (data as unknown as { data?: CheckoutSessionDto } | undefined)?.data;
  if (!dto?.checkoutUrl) throw new Error('empty checkout response');
  return dto.checkoutUrl;
}

/** Capture an approved PayPal order. Idempotent on the API (safe to race web). */
export async function captureBooking(code: string): Promise<void> {
  await getApiClient().POST('/api/v1/bookings/{code}/capture', {
    params: { path: { code } },
  });
}

/** Cancel the caller's own PENDING booking. */
export async function cancelBooking(code: string): Promise<void> {
  await getApiClient().POST('/api/v1/bookings/{code}/cancel', {
    params: { path: { code } },
  });
}

/** Request cancellation/refund of a PAID booking (admin processes it). */
export async function requestCancellation(code: string, reason?: string): Promise<void> {
  const trimmed = reason?.trim();
  await getApiClient().POST('/api/v1/bookings/{code}/cancellation-request', {
    params: { path: { code } },
    body: trimmed ? { reason: trimmed } : {},
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern "lib/booking.spec"`
Expected: PASS — 14 tests. If `messages.booking.list.status[status]` errors
under `noUncheckedIndexedAccess`-style rules, it is already cast
`as Record<string, string>` in i18n — no change needed.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/booking.ts apps/mobile/src/lib/booking.spec.ts
git commit -m "feat(mobile): booking data layer - VMs, status meta, checkout + sync-retry (TDD)"
```

---

### Task 6: Routes + entry points (layout · sticky bar · sign-in reason)

Wire the new screens into the stack and add the two entry points. Screens
themselves land in Tasks 7–10; expo-router tolerates registered names that
don't exist yet only at runtime — so this task also creates **placeholder
files** that each later task replaces (keeps every commit runnable).

**Files:**
- Modify: `apps/mobile/src/app/_layout.tsx` (Stack.Screen list)
- Modify: `apps/mobile/src/app/tours/[slug]/index.tsx` (sticky bar)
- Modify: `apps/mobile/src/app/auth/sign-in.tsx:44` (reason line)
- Create (placeholders): `apps/mobile/src/app/tours/[slug]/book.tsx`,
  `apps/mobile/src/app/bookings/index.tsx`,
  `apps/mobile/src/app/bookings/[code]/index.tsx`,
  `apps/mobile/src/app/bookings/[code]/result.tsx`

**Interfaces:**
- Consumes: `messages.mobile.booking.bookCta`, `messages.mobile.authPrompts.bookingReason` (Task 2), `useAuth` (existing).
- Produces: routes `/tours/[slug]/book`, `/bookings`, `/bookings/[code]`, `/bookings/[code]/result` — used by Tasks 7–10.

- [ ] **Step 1: Register the stack screens** in `_layout.tsx` — add after
  the `tours/[slug]/enquiry` entry (default push animation applies —
  these are task flows, NOT modals):

```tsx
        <Stack.Screen name="tours/[slug]/book" />
        <Stack.Screen name="bookings/index" />
        <Stack.Screen name="bookings/[code]/index" />
        <Stack.Screen name="bookings/[code]/result" />
```

- [ ] **Step 2: Create the 4 placeholder screens** (identical content,
  default-exported so the route exists; each is fully replaced later):

```tsx
import { View } from 'react-native';

// Placeholder — replaced in a later W4 task.
export default function PlaceholderScreen() {
  return <View />;
}
```

- [ ] **Step 3: Sticky bar on tour detail** — in
  `apps/mobile/src/app/tours/[slug]/index.tsx`:
  - add imports: `import { useAuth } from '../../../lib/auth-context';`
  - add `const tb = messages.mobile.booking;` next to the existing `t`/`th`
    constants, and `const { status } = useAuth();` inside
    `TourDetailScreen` (top, with the other hooks — BEFORE the early
    returns so hook order is stable).
  - give the price block room to shrink: on the `<View>` wrapping the
    "From + price" column (line ~325) add `flexShrink: 1`.
  - replace the single Inquire button (line ~349) with:

```tsx
        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            variant="outline"
            label={t.inquireNow}
            onPress={() => router.push(`/tours/${slug}/enquiry`)}
          />
          <Button
            label={tb.bookCta}
            onPress={() =>
              status === 'signedIn'
                ? router.push(`/tours/${slug}/book`)
                : router.push('/auth/sign-in?reason=booking')
            }
          />
        </View>
```

- [ ] **Step 4: Booking reason on sign-in** — in `auth/sign-in.tsx` replace
  the subtitle expression:

```tsx
            {reason === 'wishlist'
              ? tp.wishlistReason
              : reason === 'booking'
                ? tp.bookingReason
                : t.subtitle}
```

- [ ] **Step 5: Verify**

Run: `pnpm nx run-many -t lint typecheck test -p @tourism/mobile`
Expected: PASS (existing `tour-detail-screen.spec.tsx` still finds the
Inquire button; if it asserted on the old layout, update ONLY the failing
query — do not reshuffle the spec).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app
git commit -m "feat(mobile): booking routes + Book now CTA + booking sign-in reason"
```

---

### Task 7: Booking form screen `tours/[slug]/book`

**Files:**
- Replace placeholder: `apps/mobile/src/app/tours/[slug]/book.tsx`
- Test: `apps/mobile/src/__tests__/book-screen.spec.tsx`

**Interfaces:**
- Consumes: `fetchTourDetail` (existing) · `fetchTourDepartures`,
  `toDepartureOptions`, `createBooking`, `startCheckout`,
  `bookingErrorMessage`, `DepartureOption` (Task 5) ·
  `buildCreateBookingPayload` (Task 3) · `computeBookingTotal` (Task 4) ·
  `fetchProfile` (existing).
- Produces: on success navigates
  `router.replace('/bookings/{code}/result?checkoutUrl=…')` (Task 8's
  screen).

- [ ] **Step 1: Write the failing spec** —
  `apps/mobile/src/__tests__/book-screen.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import type { components } from '@tourism/core';
import BookScreen from '../app/tours/[slug]/book';
import {
  createBooking,
  fetchTourDepartures,
  startCheckout,
} from '../lib/booking';
import { fetchTourDetail } from '../lib/tour-detail';
import { fetchProfile } from '../lib/profile';

const routerMock = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => routerMock.push(...a), replace: (...a: unknown[]) => routerMock.replace(...a), back: () => routerMock.back() },
  useLocalSearchParams: () => ({ slug: 'hoi-an-walking-tour' }),
  Redirect: () => null,
}));
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: 'signedIn' }) }));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchTourDepartures: jest.fn(),
  createBooking: jest.fn(),
  startCheckout: jest.fn(),
}));
jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourDetail: jest.fn(),
}));
jest.mock('../lib/profile', () => ({ fetchProfile: jest.fn() }));

type DepartureDto = components['schemas']['DepartureDto'];

const tour = {
  id: 't-1',
  slug: 'hoi-an-walking-tour',
  title: 'Hoi An Walking Tour',
  destination: 'Hoi An',
  durationDays: 3,
  maxGroupSize: 12,
  basePrice: 100,
  currency: 'USD',
  rating: 4.8,
  reviewCount: 12,
  badges: [],
  overview: '',
  gallery: ['https://img/x.jpg'],
  highlights: [],
  itinerary: [],
  included: [],
  excluded: [],
  faqs: [],
  policies: [],
};

const departures = [
  { id: 'dep-1', startDate: '2026-08-15', seatsTotal: 10, seatsBooked: 7, priceOverride: null },
  { id: 'dep-2', startDate: '2026-09-01', seatsTotal: 10, seatsBooked: 0, priceOverride: '150.00' },
  { id: 'dep-3', startDate: '2026-10-01', seatsTotal: 10, seatsBooked: 10, priceOverride: null },
] as unknown as DepartureDto[];

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookScreen />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchTourDetail as jest.Mock).mockResolvedValue(tour);
  (fetchTourDepartures as jest.Mock).mockResolvedValue(departures);
  (fetchProfile as jest.Mock).mockResolvedValue({
    fullName: 'Nguyen Van A',
    email: 'a@example.com',
    initial: 'N',
  });
});

test('pre-selects the first open departure and updates the total on switch', async () => {
  renderScreen();
  // 1 adult × $100 (dep-1 pre-selected)
  expect(await screen.findByText('$100')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('departure-dep-2'));
  expect(screen.getByText('$150')).toBeOnTheScreen(); // override price
});

test('sold-out departures cannot be selected', async () => {
  renderScreen();
  await screen.findByTestId('departure-dep-3');
  fireEvent.press(screen.getByTestId('departure-dep-3'));
  expect(screen.getByText('$100')).toBeOnTheScreen(); // still dep-1's price
});

test('steppers respect the seats-left cap', async () => {
  renderScreen();
  await screen.findByTestId('departure-dep-1'); // 3 seats left
  fireEvent.press(screen.getByTestId('adults-inc')); // 2
  fireEvent.press(screen.getByTestId('adults-inc')); // 3
  fireEvent.press(screen.getByTestId('adults-inc')); // capped at 3
  expect(screen.getByTestId('adults-count')).toHaveTextContent('3');
  fireEvent.press(screen.getByTestId('children-inc')); // no seat left → stays 0
  expect(screen.getByTestId('children-count')).toHaveTextContent('0');
});

test('invalid contact shows the mapped error and does not submit', async () => {
  renderScreen();
  const email = await screen.findByDisplayValue('a@example.com'); // prefilled
  fireEvent.changeText(email, 'not-an-email');
  fireEvent.press(screen.getByTestId('submit'));
  expect(await screen.findByText(/valid name and email/i)).toBeOnTheScreen();
  expect(createBooking).not.toHaveBeenCalled();
});

test('happy path: create → checkout → replace to the result screen', async () => {
  (createBooking as jest.Mock).mockResolvedValue({ code: 'BK-1' });
  (startCheckout as jest.Mock).mockResolvedValue('https://pay.example/session');
  renderScreen();
  await screen.findByTestId('departure-dep-1');
  await screen.findByDisplayValue('a@example.com'); // wait for the profile prefill
  fireEvent.press(screen.getByTestId('submit'));
  await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
  expect((createBooking as jest.Mock).mock.calls[0][0]).toMatchObject({
    tourSlug: 'hoi-an-walking-tour',
    departureId: 'dep-1',
    numAdults: 1,
    paymentProvider: 'STRIPE',
    contactName: 'Nguyen Van A',
    contactEmail: 'a@example.com',
  });
  expect(routerMock.replace.mock.calls[0][0]).toBe(
    '/bookings/BK-1/result?checkoutUrl=https%3A%2F%2Fpay.example%2Fsession',
  );
});

test('API rejection surfaces the mapped copy', async () => {
  const { ApiRequestError } = jest.requireActual('@tourism/core');
  (createBooking as jest.Mock).mockRejectedValue(
    new ApiRequestError(409, { code: 'SEATS_NOT_AVAILABLE', message: 'x' }),
  );
  renderScreen();
  await screen.findByTestId('departure-dep-1');
  fireEvent.press(screen.getByTestId('submit'));
  expect(await screen.findByText(/sold out/i)).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern book-screen`
Expected: FAIL — placeholder renders nothing.

- [ ] **Step 3: Implement the screen** — replace
  `apps/mobile/src/app/tours/[slug]/book.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Spinner, TextField, useTheme } from '@tourism/mobile-ui';
import { useAuth } from '../../../lib/auth-context';
import {
  bookingErrorMessage,
  createBooking,
  fetchTourDepartures,
  startCheckout,
  toDepartureOptions,
  type DepartureOption,
} from '../../../lib/booking';
import {
  buildCreateBookingPayload,
  type CreateBookingPayload,
  type PaymentProvider,
} from '../../../lib/booking-form';
import { computeBookingTotal } from '../../../lib/price';
import { fetchProfile } from '../../../lib/profile';
import { fetchTourDetail } from '../../../lib/tour-detail';

const t = messages.booking; // web copy: form/page/errors/box
const tm = messages.mobile.booking;
const td = messages.mobile.tourDetail;

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  testIDPrefix,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  testIDPrefix: string;
}) {
  const theme = useTheme();
  const circle = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors['border'],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <AppText variant="body">{label}</AppText>
        {hint ? (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
        <Pressable
          testID={`${testIDPrefix}-dec`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperDecrease(label)}
          disabled={value <= min}
          hitSlop={8}
          onPress={() => onChange(value - 1)}
          style={({ pressed }) => [circle(value <= min), pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="remove" size={18} color={theme.colors['foreground']} />
        </Pressable>
        <AppText
          testID={`${testIDPrefix}-count`}
          variant="body"
          style={{ minWidth: 24, textAlign: 'center', fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {value}
        </AppText>
        <Pressable
          testID={`${testIDPrefix}-inc`}
          accessibilityRole="button"
          accessibilityLabel={tm.stepperIncrease(label)}
          disabled={value >= max}
          hitSlop={8}
          onPress={() => onChange(value + 1)}
          style={({ pressed }) => [circle(value >= max), pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={18} color={theme.colors['foreground']} />
        </Pressable>
      </View>
    </View>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="title">{title}</AppText>
      {desc ? (
        <AppText variant="caption" muted>
          {desc}
        </AppText>
      ) : null}
    </View>
  );
}

export default function BookScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();

  const tourQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const departuresQ = useQuery({
    queryKey: ['departures', slug],
    queryFn: () => fetchTourDepartures(slug),
    enabled: !!slug,
  });
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });

  const [departureId, setDepartureId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requests, setRequests] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('STRIPE');
  const [formError, setFormError] = useState<string | null>(null);

  const tour = tourQ.data;
  const options = useMemo(
    () => (tour ? toDepartureOptions(departuresQ.data ?? [], tour.basePrice) : []),
    [departuresQ.data, tour],
  );

  // Pre-select the first departure with seats once options land.
  useEffect(() => {
    if (departureId === '' && options.length > 0) {
      const first = options.find((o) => o.seatsLeft > 0);
      if (first) setDepartureId(first.id);
    }
  }, [departureId, options]);

  // Prefill contact from the profile (only while the fields are untouched).
  useEffect(() => {
    if (profileQ.data) {
      setName((prev) => (prev === '' ? profileQ.data.fullName : prev));
      setEmail((prev) => (prev === '' ? profileQ.data.email : prev));
    }
  }, [profileQ.data]);

  const submitM = useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const booking = await createBooking(payload);
      const url = await startCheckout(booking.code);
      return { code: booking.code, url };
    },
    onSuccess: ({ code, url }) => {
      router.replace(`/bookings/${code}/result?checkoutUrl=${encodeURIComponent(url)}`);
    },
    onError: (error) => setFormError(bookingErrorMessage(error)),
  });

  if (status === 'signedOut') return <Redirect href="/auth/sign-in?reason=booking" />;

  if (tourQ.isPending || departuresQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (!tour) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {td.notFound}
          </AppText>
          <Button label={td.goBack} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const selected = options.find((o) => o.id === departureId);
  const seatsLeft = selected?.seatsLeft ?? 20;
  const unitPrice = selected?.price ?? tour.basePrice;
  const total = computeBookingTotal(unitPrice, adults, children).total;
  const dollar = tour.currency === 'USD' ? '$' : '';

  const selectDeparture = (option: DepartureOption) => {
    if (option.seatsLeft === 0) return;
    setDepartureId(option.id);
    const nextAdults = Math.max(1, Math.min(adults, option.seatsLeft));
    setAdults(nextAdults);
    setChildren(Math.min(children, Math.max(0, option.seatsLeft - nextAdults)));
  };

  const onSubmit = () => {
    setFormError(null);
    const result = buildCreateBookingPayload({
      tourSlug: slug,
      departureId,
      numAdults: adults,
      numChildren: children,
      paymentProvider: provider,
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      specialRequests: requests,
    });
    if (!result.ok) {
      setFormError(messages.booking.errors[result.error]);
      return;
    }
    submitM.mutate(result.payload);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingTop: insets.top + theme.spacing(2),
          paddingBottom: theme.spacing(6),
          gap: theme.spacing(5),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.page.backToTour}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors['foreground']} />
          </Pressable>
          <AppText variant="display" style={{ flex: 1 }}>
            {t.page.title}
          </AppText>
        </View>

        {/* Trip summary */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing(3),
            borderWidth: 1,
            borderColor: theme.colors['border'],
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
            alignItems: 'center',
          }}
        >
          {tour.gallery[0] ? (
            <Image
              source={{ uri: tour.gallery[0] }}
              style={{ width: 72, height: 56, borderRadius: theme.radius.sm }}
              contentFit="cover"
            />
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" numberOfLines={2} style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
              {tour.title}
            </AppText>
            <AppText variant="caption" muted>
              {messages.mobile.home.durationDays(tour.durationDays)} · {td.from} {dollar}
              {tour.basePrice}
            </AppText>
          </View>
        </View>

        {/* Departure picker */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.datesHeading} desc={t.form.datesDesc} />
          {options.length === 0 ? (
            <AppText variant="body" muted>
              {t.box.noDepartures}
            </AppText>
          ) : (
            options.map((option) => {
              const isSelected = option.id === departureId;
              const soldOut = option.seatsLeft === 0;
              return (
                <Pressable
                  key={option.id}
                  testID={`departure-${option.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: soldOut }}
                  disabled={soldOut}
                  onPress={() => selectDeparture(option)}
                  style={({ pressed }) => ({
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.colors['primary'] : theme.colors['border'],
                    borderRadius: theme.radius.md,
                    padding: theme.spacing(3),
                    gap: 2,
                    opacity: soldOut ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                    {option.label}
                  </AppText>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <AppText variant="caption" muted>
                      {dollar}
                      {option.price} {t.page.perAdult}
                    </AppText>
                    {soldOut ? (
                      <Badge tone="muted" label={tm.soldOut} />
                    ) : option.seatsLeft <= 5 ? (
                      <Badge tone="warning" label={td.seatsLeft(option.seatsLeft)} />
                    ) : (
                      <AppText variant="caption" muted>
                        {td.seatsLeft(option.seatsLeft)}
                      </AppText>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Travellers */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.travellersHeading} desc={t.form.travellersDesc} />
          <Stepper
            label={t.form.adults}
            value={adults}
            min={1}
            max={Math.min(20, Math.max(1, seatsLeft - children))}
            onChange={setAdults}
            testIDPrefix="adults"
          />
          <Stepper
            label={t.form.children}
            hint={t.box.childrenHint}
            value={children}
            min={0}
            max={Math.min(20, Math.max(0, seatsLeft - adults))}
            onChange={setChildren}
            testIDPrefix="children"
          />
        </View>

        {/* Contact */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.heading} />
          <TextField label={t.form.contactName} value={name} onChangeText={setName} />
          <TextField
            label={t.form.contactEmail}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextField
            label={t.form.contactPhone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextField
            label={t.form.specialRequests}
            placeholder={t.form.specialRequestsPlaceholder}
            value={requests}
            onChangeText={setRequests}
            multiline
          />
        </View>

        {/* Payment method */}
        <View style={{ gap: theme.spacing(3) }}>
          <SectionTitle title={t.form.paymentHeading} desc={t.form.paymentDesc} />
          {(
            [
              { id: 'STRIPE', label: t.form.stripe, hint: t.form.stripeHint, icon: 'card-outline' },
              { id: 'PAYPAL', label: t.form.paypal, hint: t.form.paypalHint, icon: 'logo-paypal' },
            ] as const
          ).map((method) => {
            const isSelected = provider === method.id;
            return (
              <Pressable
                key={method.id}
                testID={`provider-${method.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setProvider(method.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(3),
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? theme.colors['primary'] : theme.colors['border'],
                  borderRadius: theme.radius.md,
                  padding: theme.spacing(3),
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name={method.icon} size={20} color={theme.colors['foreground']} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                    {method.label}
                  </AppText>
                  <AppText variant="caption" muted>
                    {method.hint}
                  </AppText>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? theme.colors['primary'] : theme.colors['muted-foreground']}
                />
              </Pressable>
            );
          })}
          <AppText variant="caption" muted>
            {t.form.trustLine}
          </AppText>
        </View>

        {formError ? (
          <AppText variant="body" style={{ color: theme.colors['destructive'] }} role="alert">
            {formError}
          </AppText>
        ) : null}
      </ScrollView>

      {/* Sticky total + submit */}
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
        <View style={{ flexShrink: 1 }}>
          <AppText variant="caption" muted>
            {t.page.totalLabel}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fontFamilies.sansSemiBold,
              fontSize: 18,
              lineHeight: 24,
              color: theme.colors['foreground'],
            }}
          >
            {dollar}
            {total}
          </AppText>
          <AppText variant="caption" muted>
            {t.page.totalNote}
          </AppText>
        </View>
        <Button
          testID="submit"
          label={submitM.isPending ? t.form.submitting : t.form.submit}
          loading={submitM.isPending}
          onPress={onSubmit}
          disabled={options.length === 0}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern book-screen`
Expected: PASS — 6 tests. (If `role="alert"` on AppText fails typecheck,
use `accessibilityRole="alert"` — AppText spreads Text props.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/tours apps/mobile/src/__tests__/book-screen.spec.tsx
git commit -m "feat(mobile): booking form screen - departures, steppers, prefill, provider choice"
```

---

### Task 8: `expo-web-browser` + payment result screen

**Files:**
- Modify: `apps/mobile/package.json` (via `expo install`)
- Replace placeholder: `apps/mobile/src/app/bookings/[code]/result.tsx`
- Test: `apps/mobile/src/__tests__/booking-result.spec.tsx`

**Interfaces:**
- Consumes: `fetchBooking`, `captureBooking`, `startCheckout`, `BookingVm` (Task 5); `messages.booking.success/cancel/detail` + `messages.mobile.booking` (Task 2).
- Produces: route `/bookings/[code]/result?checkoutUrl=…` — Task 7 replaces
  into it; Task 10's Pay now pushes it.

- [ ] **Step 1: Install the dependency** (from `apps/mobile`, so the
  SDK-54-pinned version resolves):

```bash
cd apps/mobile
pnpm exec expo install expo-web-browser
cd ../..
```

Verify: `apps/mobile/package.json` gains `"expo-web-browser": "~15.x"`
(exact minor pinned by SDK 54). Run `pnpm nx test @tourism/mobile` once —
if jest fails to parse the new package, add `expo-web-browser` to the
`transformIgnorePatterns` allowlist in `apps/mobile/jest.config.cts`
(same list that already includes `react-native-url-polyfill`); it is
normally already covered by the `expo-*` glob.

- [ ] **Step 2: Write the failing spec** —
  `apps/mobile/src/__tests__/booking-result.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import * as WebBrowser from 'expo-web-browser';
import ResultScreen from '../app/bookings/[code]/result';
import { captureBooking, fetchBooking, type BookingVm } from '../lib/booking';

const routerMock = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let params: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => routerMock.push(...a), replace: (...a: unknown[]) => routerMock.replace(...a), back: () => routerMock.back() },
  useLocalSearchParams: () => params,
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }),
}));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchBooking: jest.fn(),
  captureBooking: jest.fn(),
  startCheckout: jest.fn(),
}));

const paidVm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 15 Aug 2026',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@example.com',
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ResultScreen />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  params = { code: 'BK-1', checkoutUrl: 'https://pay.example/session' };
});

test('opens the browser then confirms a PAID booking', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
  expect((WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0]).toBe(
    'https://pay.example/session',
  );
  expect(captureBooking).not.toHaveBeenCalled(); // Stripe never captures in-app
});

test('PayPal + PENDING triggers the idempotent capture, then confirms', async () => {
  (fetchBooking as jest.Mock)
    .mockResolvedValueOnce({ ...paidVm, status: 'PENDING', paymentProvider: 'PAYPAL' })
    .mockResolvedValueOnce({ ...paidVm, paymentProvider: 'PAYPAL' });
  renderScreen();
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
  expect(captureBooking).toHaveBeenCalledTimes(1);
});

test('still-PENDING shows verify-again + pay-now actions', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({ ...paidVm, status: 'PENDING' });
  renderScreen();
  expect(await screen.findByText(/payment not confirmed yet/i)).toBeOnTheScreen();
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  fireEvent.press(screen.getByTestId('verify-again'));
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
});

test('unknown booking renders the not-found copy', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(null);
  renderScreen();
  expect(await screen.findByText(/couldn't find that booking/i)).toBeOnTheScreen();
});

test('without a checkoutUrl it verifies immediately (no browser)', async () => {
  params = { code: 'BK-1' };
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  await waitFor(() => expect(screen.getByText(/booking confirmed/i)).toBeOnTheScreen());
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-result`
Expected: FAIL — placeholder renders nothing.

- [ ] **Step 4: Implement the screen** — replace
  `apps/mobile/src/app/bookings/[code]/result.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import {
  captureBooking,
  fetchBooking,
  startCheckout,
  type BookingVm,
} from '../../../lib/booking';

const ts = messages.booking.success;
const td = messages.booking.detail;
const tm = messages.mobile.booking;

type Phase = 'paying' | 'verifying' | 'paid' | 'pending' | 'notFound' | 'error';

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(3) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export default function BookingResultScreen() {
  const { code, checkoutUrl } = useLocalSearchParams<{ code: string; checkoutUrl?: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('paying');
  const [booking, setBooking] = useState<BookingVm | null>(null);
  const started = useRef(false);

  const verify = useCallback(async () => {
    setPhase('verifying');
    try {
      let vm = await fetchBooking(code);
      if (vm?.paymentProvider === 'PAYPAL' && vm.status === 'PENDING') {
        try {
          await captureBooking(code);
        } catch {
          // An abandoned/unapproved order legitimately fails capture — the
          // refetch below just shows PENDING then.
        }
        vm = await fetchBooking(code);
      }
      if (!vm) {
        setPhase('notFound');
        return;
      }
      setBooking(vm);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setPhase(vm.status === 'PAID' ? 'paid' : 'pending');
    } catch {
      setPhase('error');
    }
  }, [code, queryClient]);

  const openCheckout = useCallback(
    async (url: string) => {
      setPhase('paying');
      await WebBrowser.openBrowserAsync(url);
      await verify(); // the promise resolves when the user closes the browser
    },
    [verify],
  );

  const payAgain = useCallback(async () => {
    setPhase('verifying');
    try {
      const url = await startCheckout(code);
      await openCheckout(url);
    } catch {
      setPhase('error');
    }
  }, [code, openCheckout]);

  useEffect(() => {
    if (started.current) return; // never re-open the browser on re-render
    started.current = true;
    if (checkoutUrl) void openCheckout(checkoutUrl);
    else void verify();
  }, [checkoutUrl, openCheckout, verify]);

  const dollar = booking?.currency === 'USD' ? '$' : '';

  return (
    <Screen>
      <View style={{ gap: theme.spacing(4), paddingVertical: theme.spacing(6) }}>
        {phase === 'paying' || phase === 'verifying' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(8) }}>
            <Spinner />
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {phase === 'paying' ? tm.browserHint : tm.verifying}
            </AppText>
            {phase === 'paying' && checkoutUrl ? (
              <Button
                variant="outline"
                label={tm.openCheckout}
                onPress={() => void openCheckout(checkoutUrl)}
              />
            ) : null}
          </View>
        ) : null}

        {phase === 'paid' && booking ? (
          <View style={{ gap: theme.spacing(4) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <Ionicons name="checkmark-circle" size={56} color={theme.colors['success']} />
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {ts.confirmedTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {ts.confirmedBody}
              </AppText>
            </View>
            <View
              style={{
                gap: theme.spacing(2),
                borderWidth: 1,
                borderColor: theme.colors['border'],
                borderRadius: theme.radius.md,
                padding: theme.spacing(4),
              }}
            >
              <Fact label={ts.refLabel} value={booking.code} />
              <Fact label={ts.tourLabel} value={booking.tourTitle} />
              <Fact label={ts.departureLabel} value={booking.departureLabel} />
              <Fact label={ts.travellersLabel} value={booking.party} />
              <Fact label={ts.totalLabel} value={`${dollar}${booking.totalAmount}`} />
            </View>
            <AppText variant="caption" muted style={{ textAlign: 'center' }}>
              {ts.emailNote}
            </AppText>
            <Button
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
            <Button variant="outline" label={tm.browseTours} onPress={() => router.replace('/')} />
          </View>
        ) : null}

        {phase === 'pending' && booking ? (
          <View style={{ gap: theme.spacing(4) }}>
            <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
              <Ionicons name="time-outline" size={56} color={theme.colors['warning']} />
              <AppText variant="display" style={{ textAlign: 'center' }}>
                {tm.stillPendingTitle}
              </AppText>
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {messages.booking.cancel.body}
              </AppText>
            </View>
            <Button testID="verify-again" label={tm.verifyAgain} onPress={() => void verify()} />
            <Button variant="outline" label={td.payNow} onPress={() => void payAgain()} />
            <Button
              variant="outline"
              label={tm.viewBooking}
              onPress={() => router.replace(`/bookings/${booking.code}`)}
            />
          </View>
        ) : null}

        {phase === 'notFound' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(8) }}>
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {ts.notFound}
            </AppText>
            <Button label={tm.browseTours} onPress={() => router.replace('/')} />
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(8) }}>
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {tm.resultError}
            </AppText>
            <Button testID="verify-again" label={tm.verifyAgain} onPress={() => void verify()} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-result`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/src/app/bookings apps/mobile/src/__tests__/booking-result.spec.tsx
git commit -m "feat(mobile): self-verifying payment result screen via expo-web-browser"
```

---

### Task 9: Bookings list + Account menu row

**Files:**
- Replace placeholder: `apps/mobile/src/app/bookings/index.tsx`
- Modify: `apps/mobile/src/app/(tabs)/account.tsx` (MenuRow)
- Test: `apps/mobile/src/__tests__/bookings-list.spec.tsx`

**Interfaces:**
- Consumes: `fetchMyBookings`, `BookingVm` (Task 5) · `AuthGate` (existing) · `messages.booking.list` + `messages.mobile.booking`.
- Produces: route `/bookings`; taps push `/bookings/{code}` (Task 10).

- [ ] **Step 1: Write the failing spec** —
  `apps/mobile/src/__tests__/bookings-list.spec.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import BookingsScreen from '../app/bookings/index';
import { fetchMyBookings, type BookingVm } from '../lib/booking';

const routerMock = { push: jest.fn(), back: jest.fn() };
let authStatus = 'signedIn';
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => routerMock.push(...a), back: () => routerMock.back() },
}));
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: authStatus }) }));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchMyBookings: jest.fn(),
}));

const vm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 15 Aug 2026',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@example.com',
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookingsScreen />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  authStatus = 'signedIn';
});

test('renders booking cards and navigates to the detail', async () => {
  (fetchMyBookings as jest.Mock).mockResolvedValue([vm]);
  renderScreen();
  expect(await screen.findByText('Hoi An Walking Tour')).toBeOnTheScreen();
  expect(screen.getByText('Paid')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('booking-BK-1'));
  expect(routerMock.push.mock.calls[0][0]).toBe('/bookings/BK-1');
});

test('empty state offers browsing tours', async () => {
  (fetchMyBookings as jest.Mock).mockResolvedValue([]);
  renderScreen();
  expect(await screen.findByText(/haven't booked any trips yet/i)).toBeOnTheScreen();
});

test('error state offers retry', async () => {
  (fetchMyBookings as jest.Mock).mockRejectedValue(new Error('boom'));
  renderScreen();
  expect(await screen.findByText(/couldn't load your bookings/i)).toBeOnTheScreen();
});

test('guests see the auth gate', () => {
  authStatus = 'signedOut';
  renderScreen();
  // Both the gate body and its CTA contain "sign in" — assert on the set.
  expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  expect(fetchMyBookings).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern bookings-list`
Expected: FAIL — placeholder renders nothing.

- [ ] **Step 3: Implement the list screen** — replace
  `apps/mobile/src/app/bookings/index.tsx`:

```tsx
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { AuthGate } from '../../components/auth-gate';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings, type BookingVm } from '../../lib/booking';

const t = messages.booking.list;
const tm = messages.mobile.booking;
const tp = messages.mobile.authPrompts;

function Header() {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        paddingBottom: theme.spacing(3),
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.booking.detail.back}
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Ionicons name="arrow-back" size={22} color={theme.colors['foreground']} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="display">{t.title}</AppText>
        <AppText variant="caption" muted>
          {t.subtitle}
        </AppText>
      </View>
    </View>
  );
}

function BookingCard({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  const dollar = booking.currency === 'USD' ? '$' : '';
  return (
    <Pressable
      testID={`booking-${booking.code}`}
      accessibilityRole="button"
      accessibilityLabel={booking.tourTitle}
      onPress={() => router.push(`/bookings/${booking.code}`)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.md,
        padding: theme.spacing(4),
        gap: theme.spacing(2),
        opacity: pressed ? 0.85 : 1,
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
          {dollar}
          {booking.totalAmount}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const listQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: status === 'signedIn',
  });

  if (status !== 'signedIn') {
    return (
      <Screen scroll={false}>
        <AuthGate icon="receipt-outline" title={t.title} body={tp.accountGateBody} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingTop: insets.top > 0 ? 0 : theme.spacing(2) }}>
        <Header />
        {listQ.isPending ? (
          <View style={{ gap: theme.spacing(3) }}>
            <Skeleton height={104} />
            <Skeleton height={104} />
            <Skeleton height={104} />
          </View>
        ) : listQ.isError || !listQ.data ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {tm.listError}
            </AppText>
            <Button label={tm.retry} onPress={() => listQ.refetch()} />
          </View>
        ) : listQ.data.length === 0 ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {t.empty}
            </AppText>
            <Button label={t.browse} onPress={() => router.push('/explore')} />
          </View>
        ) : (
          <FlatList
            data={listQ.data}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => <BookingCard booking={item} />}
            contentContainerStyle={{ gap: theme.spacing(3), paddingBottom: theme.spacing(6) }}
            showsVerticalScrollIndicator={false}
            refreshing={listQ.isRefetching}
            onRefresh={() => listQ.refetch()}
          />
        )}
      </View>
    </Screen>
  );
}
```

Note: `Screen` already applies safe-area padding; if the back arrow sits
under the status bar on-device, wrap the header in
`paddingTop: insets.top` instead.

- [ ] **Step 4: Add the Account menu row** — in
  `apps/mobile/src/app/(tabs)/account.tsx`, add ABOVE the Saved row:

```tsx
        <MenuRow
          icon="receipt-outline"
          label={messages.booking.list.menuLink}
          onPress={() => router.push('/bookings')}
        />
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern "bookings-list|account"`
Expected: PASS — 4 new tests, account spec still green.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/bookings/index.tsx "apps/mobile/src/app/(tabs)/account.tsx" apps/mobile/src/__tests__/bookings-list.spec.tsx
git commit -m "feat(mobile): my-bookings list + Account menu entry"
```

---

### Task 10: Booking detail + status-aware actions

**Files:**
- Replace placeholder: `apps/mobile/src/app/bookings/[code]/index.tsx`
- Test: `apps/mobile/src/__tests__/booking-detail.spec.tsx`

**Interfaces:**
- Consumes: `fetchBooking`, `cancelBooking`, `requestCancellation`,
  `startCheckout`, `bookingErrorMessage`, `BookingVm` (Task 5) ·
  `messages.booking.detail` · native `Alert.alert` (platform-convention
  destructive confirm).

- [ ] **Step 1: Write the failing spec** —
  `apps/mobile/src/__tests__/booking-detail.spec.tsx`:

```tsx
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import BookingDetailScreen from '../app/bookings/[code]/index';
import {
  cancelBooking,
  fetchBooking,
  requestCancellation,
  startCheckout,
  type BookingVm,
} from '../lib/booking';

const routerMock = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => routerMock.push(...a), back: () => routerMock.back() },
  useLocalSearchParams: () => ({ code: 'BK-1' }),
}));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchBooking: jest.fn(),
  cancelBooking: jest.fn(),
  requestCancellation: jest.fn(),
  startCheckout: jest.fn(),
}));

const base: BookingVm = {
  code: 'BK-1',
  status: 'PENDING',
  statusMeta: { label: 'Awaiting payment', tone: 'warning' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 15 Aug 2026',
  bookedOn: '07 Jul 2026',
  party: '2 adults',
  totalAmount: 200,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'Nguyen Van A',
  contactEmail: 'a@example.com',
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookingDetailScreen />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test('PENDING: pay now starts checkout and pushes the result screen', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(base);
  (startCheckout as jest.Mock).mockResolvedValue('https://pay.example/2');
  renderScreen();
  fireEvent.press(await screen.findByTestId('pay-now'));
  await waitFor(() =>
    expect(routerMock.push.mock.calls[0][0]).toBe(
      '/bookings/BK-1/result?checkoutUrl=https%3A%2F%2Fpay.example%2F2',
    ),
  );
});

test('PENDING: cancel asks for a native confirm, then cancels', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(base);
  (cancelBooking as jest.Mock).mockResolvedValue(undefined);
  const alertSpy = jest.spyOn(Alert, 'alert');
  renderScreen();
  fireEvent.press(await screen.findByTestId('cancel-booking'));
  expect(alertSpy).toHaveBeenCalled();
  // Invoke the destructive button from the Alert options.
  const buttons = alertSpy.mock.calls[0][2] ?? [];
  const destructive = buttons.find((b) => b.style === 'destructive');
  destructive?.onPress?.();
  await waitFor(() => expect(cancelBooking).toHaveBeenCalled());
  expect((cancelBooking as jest.Mock).mock.calls[0][0]).toBe('BK-1');
});

test('PAID: request cancellation sends the reason', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...base,
    status: 'PAID',
    statusMeta: { label: 'Paid', tone: 'success' },
  });
  (requestCancellation as jest.Mock).mockResolvedValue(undefined);
  renderScreen();
  fireEvent.press(await screen.findByTestId('request-cancellation'));
  fireEvent.changeText(screen.getByTestId('cancel-reason'), 'Change of plans');
  fireEvent.press(screen.getByTestId('send-request'));
  await waitFor(() => expect(requestCancellation).toHaveBeenCalled());
  expect((requestCancellation as jest.Mock).mock.calls[0].slice(0, 2)).toEqual([
    'BK-1',
    'Change of plans',
  ]);
});

test('PAID + REQUESTED shows the pending-request line', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...base,
    status: 'PAID',
    statusMeta: { label: 'Paid', tone: 'success' },
    cancellationStatus: 'REQUESTED',
  });
  renderScreen();
  expect(await screen.findByText(/cancellation requested/i)).toBeOnTheScreen();
});

test('PARTIALLY_REFUNDED shows the refunded note', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...base,
    status: 'PARTIALLY_REFUNDED',
    statusMeta: { label: 'Partially refunded', tone: 'destructive' },
    refundedAmount: 30,
  });
  renderScreen();
  expect(await screen.findByText(/partially refunded \$30/i)).toBeOnTheScreen();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-detail`
Expected: FAIL — placeholder renders nothing.

- [ ] **Step 3: Implement the screen** — replace
  `apps/mobile/src/app/bookings/[code]/index.tsx`:

```tsx
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Spinner, TextField, useTheme } from '@tourism/mobile-ui';
import {
  bookingErrorMessage,
  cancelBooking,
  fetchBooking,
  requestCancellation,
  startCheckout,
  type BookingVm,
} from '../../../lib/booking';

const t = messages.booking.detail;
const tl = messages.booking.list;
const tm = messages.mobile.booking;

function Fact({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing(3) }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function Actions({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });

  const payM = useMutation({
    mutationFn: () => startCheckout(booking.code),
    onSuccess: (url) =>
      router.push(`/bookings/${booking.code}/result?checkoutUrl=${encodeURIComponent(url)}`),
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });
  const cancelM = useMutation({
    mutationFn: () => cancelBooking(booking.code),
    onSuccess: refresh,
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });
  const requestM = useMutation({
    mutationFn: () => requestCancellation(booking.code, reason),
    onSuccess: () => {
      setReasonOpen(false);
      refresh();
    },
    onError: (error) => setBanner(bookingErrorMessage(error)),
  });

  const confirmCancel = () =>
    Alert.alert(t.cancelConfirmTitle, t.cancelConfirmBody, [
      { text: t.keep, style: 'cancel' },
      { text: t.cancelConfirmCta, style: 'destructive', onPress: () => cancelM.mutate() },
    ]);

  const bannerEl = banner ? (
    <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
      {banner}
    </AppText>
  ) : null;

  if (booking.status === 'PENDING') {
    return (
      <View style={{ gap: theme.spacing(3) }}>
        <Button
          testID="pay-now"
          label={payM.isPending ? t.submitting : t.payNow}
          loading={payM.isPending}
          onPress={() => payM.mutate()}
        />
        <Button
          testID="cancel-booking"
          variant="outline"
          label={cancelM.isPending ? t.cancelling : t.cancel}
          loading={cancelM.isPending}
          onPress={confirmCancel}
        />
        {bannerEl}
      </View>
    );
  }

  if (booking.status === 'PAID') {
    if (booking.cancellationStatus === 'REQUESTED') {
      return (
        <AppText variant="body" muted>
          {t.requestPending}
        </AppText>
      );
    }
    const isDenied = booking.cancellationStatus === 'DENIED';
    return (
      <View
        style={{
          gap: theme.spacing(3),
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: theme.colors['border'],
          borderRadius: theme.radius.md,
          padding: theme.spacing(4),
        }}
      >
        <View style={{ gap: 2 }}>
          <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
            {t.requestTitle}
          </AppText>
          <AppText variant="caption" muted>
            {t.requestBody}
          </AppText>
          {isDenied ? (
            <AppText variant="caption" style={{ color: theme.colors['destructive'] }}>
              {t.requestDenied}
            </AppText>
          ) : null}
        </View>
        {reasonOpen ? (
          <View style={{ gap: theme.spacing(3) }}>
            <TextField
              testID="cancel-reason"
              label={t.reasonLabel}
              placeholder={t.reasonPlaceholder}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Button
              testID="send-request"
              label={requestM.isPending ? t.submitting : isDenied ? t.requestResubmit : t.submitRequest}
              loading={requestM.isPending}
              onPress={() => requestM.mutate()}
            />
          </View>
        ) : (
          <Button
            testID="request-cancellation"
            variant="outline"
            label={isDenied ? t.requestResubmit : t.requestCta}
            onPress={() => setReasonOpen(true)}
          />
        )}
        {bannerEl}
      </View>
    );
  }

  if (booking.refundedAmount != null) {
    const dollar = booking.currency === 'USD' ? '$' : '';
    const amount = `${dollar}${booking.refundedAmount}`;
    return (
      <AppText variant="body" muted>
        {booking.status === 'PARTIALLY_REFUNDED'
          ? t.partiallyRefundedNote(amount)
          : t.refundedNote(amount)}
      </AppText>
    );
  }

  return null; // CANCELLED without a refund — read-only
}

export default function BookingDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const theme = useTheme();
  const bookingQ = useQuery({
    queryKey: ['bookings', code],
    queryFn: () => fetchBooking(code),
    enabled: !!code,
  });

  if (bookingQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (bookingQ.isError || !bookingQ.data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}>
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {bookingQ.isError ? tm.detailError : messages.booking.success.notFound}
          </AppText>
          <Button label={tm.retry} onPress={() => bookingQ.refetch()} />
        </View>
      </Screen>
    );
  }

  const booking = bookingQ.data;
  const dollar = booking.currency === 'USD' ? '$' : '';

  return (
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={{ gap: theme.spacing(5), paddingVertical: theme.spacing(4) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(3) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.back}
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors['foreground']} />
          </Pressable>
          <AppText variant="display" style={{ flex: 1 }}>
            {t.title}
          </AppText>
          <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
        </View>

        <View
          style={{
            gap: theme.spacing(2),
            borderWidth: 1,
            borderColor: theme.colors['border'],
            borderRadius: theme.radius.md,
            padding: theme.spacing(4),
          }}
        >
          <Fact label={tl.refLabel} value={booking.code} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tl.viewTour}
            onPress={() => router.push(`/tours/${booking.tourSlug}`)}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Fact label={messages.booking.success.tourLabel} value={booking.tourTitle} />
          </Pressable>
          <Fact label={tl.departureLabel} value={booking.departureLabel} />
          <Fact label={tl.travellersLabel} value={booking.party} />
          <Fact label={tl.totalLabel} value={`${dollar}${booking.totalAmount}`} />
          <Fact label={t.paymentLabel} value={booking.paymentProvider} />
          <Fact label={t.contactLabel} value={`${booking.contactName} · ${booking.contactEmail}`} />
          {booking.specialRequests ? (
            <Fact label={t.requestsLabel} value={booking.specialRequests} />
          ) : null}
        </View>

        <Actions booking={booking} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm nx test @tourism/mobile --testPathPattern booking-detail`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/src/app/bookings/[code]/index.tsx" apps/mobile/src/__tests__/booking-detail.spec.tsx
git commit -m "feat(mobile): booking detail with pay-now, cancel + cancellation-request actions"
```

---

### Task 11: Gate + adversarial review + plan STATUS

- [ ] **Step 1: Full gate**

Run: `pnpm nx run-many -t lint typecheck test build`
Expected: all green. New test totals ≈ mobile **67 → ~100**, mobile-ui
**31 → 33** (record exact numbers).

- [ ] **Step 2: Adversarial review (money path — repo convention, never
  skip).** Review the full branch diff (`git diff main...HEAD`) hunting
  for: amount/int coercion bugs · retry loops that could double-create
  bookings · capture error swallowing that hides real failures ·
  navigation states that lose a PENDING booking · seats-cap race handling ·
  i18n key typos (runtime crash on `undefined` copy). Fix findings, rerun
  the gate, commit as `fix(mobile): W4 review findings` (or note "no
  findings").

- [ ] **Step 3: Update this plan's STATUS block** (state → EXECUTED,
  exact test counts, deviations) and commit:

```bash
git add docs/07-plans/2026-07-07-p5-mobile-w4-booking-plan.md
git commit -m "docs(plan): W4 STATUS - executed, gate green"
```

- [ ] **Step 4: Hand to the user for on-device verification** (Expo Go:
  `pnpm exec expo start` from `apps/mobile`): full Stripe test-card
  payment · PayPal sandbox payment · abandon-and-return → Pay now rescue ·
  cancel PENDING · request cancellation of a PAID booking (check the admin
  queue) · guest gating on Book now. **Merge only after user approval**
  (rebase + `--ff-only`), then run the standing docs sweep (roadmap ·
  CLAUDE.md table · HANDOFF · spec/plan STATUS · test baselines).
