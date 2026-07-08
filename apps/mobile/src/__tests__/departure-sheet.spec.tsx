import { createRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppText, ThemeProvider } from '@tourism/mobile-ui';
import type { components } from '@tourism/core';
import { DepartureSheet, type DepartureSheetRef } from '../components/departure-sheet';
import { fetchTourDepartures } from '../lib/booking';
import { BookingDraftProvider, useBookingDraft } from '../lib/booking-draft';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockRouter.push(...a),
    replace: (...a: unknown[]) => mockRouter.replace(...a),
    back: () => mockRouter.back(),
  },
}));
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchTourDepartures: jest.fn(),
}));

type DepartureDto = components['schemas']['DepartureDto'];

const departures = [
  { id: 'dep-1', startDate: '2026-08-15', seatsTotal: 10, seatsBooked: 7, priceOverride: null },
  { id: 'dep-2', startDate: '2026-09-01', seatsTotal: 10, seatsBooked: 0, priceOverride: '150.00' },
  { id: 'dep-3', startDate: '2026-10-01', seatsTotal: 10, seatsBooked: 10, priceOverride: null },
] as unknown as DepartureDto[];

/** Exposes the draft so tests can assert what Continue stored. */
function DraftProbe() {
  const { draft } = useBookingDraft();
  return (
    <AppText testID="draft-probe">
      {draft ? `${draft.departureId}:${draft.adults}:${draft.children}:${draft.unitPrice}` : 'none'}
    </AppText>
  );
}

function renderSheet() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const ref = createRef<DepartureSheetRef>();
  render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookingDraftProvider>
          <DepartureSheet ref={ref} slug="hoi-an-walking-tour" basePrice={100} currency="USD" />
          <DraftProbe />
        </BookingDraftProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return ref;
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchTourDepartures as jest.Mock).mockResolvedValue(departures);
});

test('selecting a departure updates the live total (override price wins)', async () => {
  renderSheet();
  fireEvent.press(await screen.findByTestId('departure-dep-2'));
  expect(screen.getByText('$150')).toBeOnTheScreen(); // 1 adult × override
});

test('sold-out departures cannot be selected and steppers cap at seats left', async () => {
  renderSheet();
  await screen.findByTestId('departure-dep-3');
  fireEvent.press(screen.getByTestId('departure-dep-3'));
  expect(screen.getByTestId('draft-probe')).toHaveTextContent('none'); // still nothing pickable happened
  fireEvent.press(screen.getByTestId('departure-dep-1')); // 3 seats left
  fireEvent.press(screen.getByTestId('adults-inc')); // 2
  fireEvent.press(screen.getByTestId('adults-inc')); // 3
  fireEvent.press(screen.getByTestId('adults-inc')); // capped
  expect(screen.getByTestId('adults-count')).toHaveTextContent('3');
  fireEvent.press(screen.getByTestId('children-inc')); // no seat left → stays 0
  expect(screen.getByTestId('children-count')).toHaveTextContent('0');
});

test('Continue is disabled until a departure is picked, then seeds the draft and navigates', async () => {
  const ref = renderSheet();
  await screen.findByTestId('departure-dep-1');
  act(() => ref.current?.open());
  fireEvent.press(screen.getByTestId('continue-trip'));
  expect(mockRouter.push).not.toHaveBeenCalled(); // nothing selected yet
  fireEvent.press(screen.getByTestId('departure-dep-2'));
  fireEvent.press(screen.getByTestId('adults-inc')); // 2 adults
  fireEvent.press(screen.getByTestId('continue-trip'));
  expect(screen.getByTestId('draft-probe')).toHaveTextContent('dep-2:2:0:150');
  expect(mockRouter.push.mock.calls[0][0]).toBe('/tours/hoi-an-walking-tour/book');
});
