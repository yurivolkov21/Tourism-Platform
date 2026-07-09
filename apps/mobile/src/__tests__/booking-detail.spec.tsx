import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import BookingDetailScreen from '../app/bookings/[code]';
import {
  cancelBooking,
  fetchBooking,
  requestCancellation,
  startCheckout,
  type BookingVm,
} from '../lib/booking';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockRouter.push(...a), back: () => mockRouter.back() },
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
  departureDate: '2026-08-15',
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
    expect(mockRouter.push.mock.calls[0][0]).toBe(
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
