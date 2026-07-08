import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import ResultScreen from '../app/bookings/[code]/result';
import { captureBooking, fetchBooking, type BookingVm } from '../lib/booking';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockRouter.push(...a),
    replace: (...a: unknown[]) => mockRouter.replace(...a),
    back: () => mockRouter.back(),
  },
  useLocalSearchParams: () => mockParams,
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
  // clearAllMocks keeps replaced implementations — restore the iOS-style default.
  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'dismiss' });
  mockParams = { code: 'BK-1', checkoutUrl: 'https://pay.example/session' };
});

test('opens the browser then confirms a PAID booking', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
  expect((WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0]).toBe(
    'https://pay.example/session',
  );
  expect(captureBooking).not.toHaveBeenCalled(); // Stripe never captures in-app
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
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
  expect(await screen.findByText(/couldn.t find that booking/i)).toBeOnTheScreen();
});

test('without a checkoutUrl it verifies immediately (no browser)', async () => {
  mockParams = { code: 'BK-1' };
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  await waitFor(() => expect(screen.getByText(/booking confirmed/i)).toBeOnTheScreen());
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
});

test("Android: browser opens without blocking; verify runs when the app returns to foreground", async () => {
  const appStateSpy = jest.spyOn(AppState, 'addEventListener');
  // Android resolves immediately with { type: 'opened' } (docs) — must NOT verify yet.
  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'opened' });
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  // Still in the paying phase: the hand-off hint is visible, no verify ran.
  expect(await screen.findByText(/complete your payment in the secure browser/i)).toBeOnTheScreen();
  expect(fetchBooking).not.toHaveBeenCalled();
  // User closes the checkout tab → app returns to 'active' → verify.
  const handler = appStateSpy.mock.calls[0][1] as (state: string) => void;
  await act(async () => {
    handler('active');
  });
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
});

test('terminal statuses (CANCELLED/REFUNDED) never offer Pay now', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...paidVm,
    status: 'CANCELLED',
    statusMeta: { label: 'Cancelled', tone: 'muted' },
  });
  renderScreen();
  expect(await screen.findByText('Cancelled')).toBeOnTheScreen();
  expect(screen.queryByText(/pay now/i)).toBeNull();
  expect(screen.queryByText(/payment not confirmed/i)).toBeNull();
});
