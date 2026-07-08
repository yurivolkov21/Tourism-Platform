import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import BookingsScreen from '../app/bookings/index';
import { fetchMyBookings, type BookingVm } from '../lib/booking';

const mockRouter = { push: jest.fn(), back: jest.fn() };
let mockAuthStatus = 'signedIn';
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockRouter.push(...a), back: () => mockRouter.back() },
}));
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: mockAuthStatus }) }));
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
  mockAuthStatus = 'signedIn';
});

test('renders booking cards and navigates to the detail', async () => {
  (fetchMyBookings as jest.Mock).mockResolvedValue([vm]);
  renderScreen();
  expect(await screen.findByText('Hoi An Walking Tour')).toBeOnTheScreen();
  expect(screen.getByText('Paid')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('booking-BK-1'));
  expect(mockRouter.push.mock.calls[0][0]).toBe('/bookings/BK-1');
});

test('empty state offers browsing tours', async () => {
  (fetchMyBookings as jest.Mock).mockResolvedValue([]);
  renderScreen();
  expect(await screen.findByText(/haven.t booked any trips yet/i)).toBeOnTheScreen();
});

test('error state offers retry', async () => {
  (fetchMyBookings as jest.Mock).mockRejectedValue(new Error('boom'));
  renderScreen();
  expect(await screen.findByText(/couldn.t load your bookings/i)).toBeOnTheScreen();
});

test('guests see the auth gate', () => {
  mockAuthStatus = 'signedOut';
  renderScreen();
  // Both the gate body and its CTA contain "sign in" — assert on the set.
  expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  expect(fetchMyBookings).not.toHaveBeenCalled();
});
