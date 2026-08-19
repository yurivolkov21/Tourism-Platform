import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import ResultScreen from '../app/bookings/[code]/result';
import {
  captureBooking,
  fetchBooking,
  startCheckout,
  type BookingVm,
} from '../lib/booking';

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
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));
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
  departureDate: '2026-08-15',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@example.com',
  hasReview: false,
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

/** Render, then tap through the "Ready to pay" screen — the browser hand-off is
 * never automatic, so every checkoutUrl test starts with this deliberate tap. */
async function renderAndOpenCheckout() {
  const view = renderScreen();
  fireEvent.press(await screen.findByTestId('open-checkout'));
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks keeps replaced implementations — restore the iOS-style default.
  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({
    type: 'dismiss',
  });
  mockParams = { code: 'BK-1', checkoutUrl: 'https://pay.example/session' };
});

test('waits for the tap — no browser opens on its own', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  expect(await screen.findByText(/ready to pay/i)).toBeOnTheScreen();
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  expect(fetchBooking).not.toHaveBeenCalled();
});

test('opens the browser on tap, then confirms a PAID booking', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  await renderAndOpenCheckout();
  expect(
    await screen.findByText(/booking confirmed/i, {}, { timeout: 3000 }),
  ).toBeOnTheScreen();
  expect((WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0]).toBe(
    'https://pay.example/session',
  );
  expect(captureBooking).not.toHaveBeenCalled(); // Stripe never captures in-app
  expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
});

test('PayPal + PENDING triggers the idempotent capture, then confirms', async () => {
  (fetchBooking as jest.Mock)
    .mockResolvedValueOnce({
      ...paidVm,
      status: 'PENDING',
      paymentProvider: 'PAYPAL',
    })
    .mockResolvedValueOnce({ ...paidVm, paymentProvider: 'PAYPAL' });
  await renderAndOpenCheckout();
  expect(
    await screen.findByText(/booking confirmed/i, {}, { timeout: 3000 }),
  ).toBeOnTheScreen();
  expect(captureBooking).toHaveBeenCalledTimes(1);
});

test('still-PENDING shows verify-again + pay-now actions', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...paidVm,
    status: 'PENDING',
  });
  await renderAndOpenCheckout();
  expect(
    await screen.findByText(
      /payment not confirmed yet/i,
      {},
      { timeout: 3000 },
    ),
  ).toBeOnTheScreen();
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  fireEvent.press(screen.getByTestId('verify-again'));
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
});

test('Pay now mints a session but still waits for the tap to open checkout', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue({
    ...paidVm,
    status: 'PENDING',
  });
  (startCheckout as jest.Mock).mockResolvedValue('https://pay.example/second');
  await renderAndOpenCheckout();
  await screen.findByText(/payment not confirmed yet/i, {}, { timeout: 3000 });
  (WebBrowser.openBrowserAsync as jest.Mock).mockClear();

  fireEvent.press(screen.getByRole('button', { name: /^pay now$/i }));

  // Back on the ready screen with the FRESH url — no browser opened by itself.
  expect(await screen.findByText(/ready to pay/i)).toBeOnTheScreen();
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('open-checkout'));
  await waitFor(() =>
    expect((WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0]).toBe(
      'https://pay.example/second',
    ),
  );
});

test('a failed browser launch returns to the ready screen, button usable again', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValueOnce(
    new Error('Another WebBrowser is already being presented'),
  );
  renderScreen();
  fireEvent.press(await screen.findByTestId('open-checkout'));

  // Back on the ready screen — not stranded under a spinner — and tappable.
  const button = await screen.findByTestId('open-checkout');
  await waitFor(() => expect(button).not.toBeDisabled());

  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({
    type: 'dismiss',
  });
  fireEvent.press(button);
  expect(await screen.findByText(/booking confirmed/i)).toBeOnTheScreen();
});

test('the ready screen offers a way out without paying', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  await screen.findByText(/ready to pay/i);

  fireEvent.press(screen.getByRole('button', { name: /view booking/i }));
  expect(mockRouter.replace).toHaveBeenCalledWith('/bookings/BK-1');
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
});

test('unknown booking renders the not-found copy', async () => {
  (fetchBooking as jest.Mock).mockResolvedValue(null);
  await renderAndOpenCheckout();
  expect(
    await screen.findByText(
      /couldn.t find that booking/i,
      {},
      { timeout: 3000 },
    ),
  ).toBeOnTheScreen();
});

test('without a checkoutUrl it verifies immediately (no browser)', async () => {
  mockParams = { code: 'BK-1' };
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  renderScreen();
  await waitFor(() =>
    expect(screen.getByText(/booking confirmed/i)).toBeOnTheScreen(),
  );
  expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
});

test('Android: browser opens without blocking; verify runs when the app returns to foreground', async () => {
  const appStateSpy = jest.spyOn(AppState, 'addEventListener');
  // Android resolves immediately with { type: 'opened' } (docs) — must NOT verify yet.
  (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({
    type: 'opened',
  });
  (fetchBooking as jest.Mock).mockResolvedValue(paidVm);
  await renderAndOpenCheckout();
  // Still in the paying phase: the hand-off hint is visible, no verify ran.
  expect(
    await screen.findByText(/complete your payment in the secure browser/i),
  ).toBeOnTheScreen();
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
  await renderAndOpenCheckout();
  expect(
    await screen.findByText('Cancelled', {}, { timeout: 3000 }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/pay now/i)).toBeNull();
  expect(screen.queryByText(/payment not confirmed/i)).toBeNull();
});
