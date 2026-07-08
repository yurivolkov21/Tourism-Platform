import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import type { components } from '@tourism/core';
import BookScreen from '../app/tours/[slug]/book';
import { createBooking, fetchTourDepartures, startCheckout } from '../lib/booking';
import { fetchTourDetail } from '../lib/tour-detail';
import { fetchProfile } from '../lib/profile';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockRouter.push(...a),
    replace: (...a: unknown[]) => mockRouter.replace(...a),
    back: () => mockRouter.back(),
  },
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
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
  expect((createBooking as jest.Mock).mock.calls[0][0]).toMatchObject({
    tourSlug: 'hoi-an-walking-tour',
    departureId: 'dep-1',
    numAdults: 1,
    paymentProvider: 'STRIPE',
    contactName: 'Nguyen Van A',
    contactEmail: 'a@example.com',
  });
  expect(mockRouter.replace.mock.calls[0][0]).toBe(
    '/bookings/BK-1/result?checkoutUrl=https%3A%2F%2Fpay.example%2Fsession',
  );
});

test('checkout failure after a created booking still navigates (no duplicate create)', async () => {
  (createBooking as jest.Mock).mockResolvedValue({ code: 'BK-1' });
  (startCheckout as jest.Mock).mockRejectedValue(new Error('gateway down'));
  renderScreen();
  await screen.findByTestId('departure-dep-1');
  await screen.findByDisplayValue('a@example.com');
  fireEvent.press(screen.getByTestId('submit'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
  // The PENDING booking exists — land on its result screen (Pay now lives there).
  expect(mockRouter.replace.mock.calls[0][0]).toBe('/bookings/BK-1/result');
  expect(createBooking).toHaveBeenCalledTimes(1);
});

test('API rejection surfaces the mapped copy', async () => {
  const { ApiRequestError } = jest.requireActual('@tourism/core');
  (createBooking as jest.Mock).mockRejectedValue(
    new ApiRequestError(409, { code: 'SEATS_NOT_AVAILABLE', message: 'x' }),
  );
  renderScreen();
  await screen.findByTestId('departure-dep-1');
  await screen.findByDisplayValue('a@example.com');
  fireEvent.press(screen.getByTestId('submit'));
  expect(await screen.findByText(/sold out/i)).toBeOnTheScreen();
});
