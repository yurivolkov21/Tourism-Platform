import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppText, ThemeProvider } from '@tourism/mobile-ui';
import BookingPaymentScreen from '../app/tours/[slug]/book-payment';
import { createBooking, startCheckout } from '../lib/booking';
import {
  BookingDraftProvider,
  useBookingDraft,
  type BookingContact,
  type BookingTrip,
} from '../lib/booking-draft';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockRouter.push(...a),
    replace: (...a: unknown[]) => mockRouter.replace(...a),
    back: () => mockRouter.back(),
  },
  useLocalSearchParams: () => ({ slug: 'hoi-an-walking-tour' }),
  Redirect: ({ href }: { href: string }) => {
    // Plain RN Text — requiring @tourism/mobile-ui here would count as a
    // lazy-load and trip @nx/enforce-module-boundaries project-wide.
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'redirect' }, href);
  },
}));
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: 'signedIn' }) }));
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  createBooking: jest.fn(),
  startCheckout: jest.fn(),
}));

const trip: BookingTrip = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: 'dep-1',
  departureLabel: 'Sat, 15 Aug 2026',
  unitPrice: 150,
  currency: 'USD',
  adults: 2,
  children: 1,
};

const contact: BookingContact = {
  name: 'Nguyen Van A',
  email: 'a@example.com',
  phone: '+84901234567',
  requests: '',
};

function Seed({
  children,
  seedTrip,
  seedContact,
}: {
  children: ReactNode;
  seedTrip?: BookingTrip;
  seedContact?: BookingContact;
}) {
  const { setTrip, setContact, draft } = useBookingDraft();
  useEffect(() => {
    if (seedTrip && !draft) {
      setTrip(seedTrip);
      if (seedContact) setContact(seedContact);
    }
  }, [seedTrip, seedContact, draft, setTrip, setContact]);
  if (seedTrip && !draft) return <AppText>seeding</AppText>;
  return <>{children}</>;
}

function renderScreen(seedTrip?: BookingTrip, seedContact?: BookingContact) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookingDraftProvider>
          <Seed seedTrip={seedTrip} seedContact={seedContact}>
            <BookingPaymentScreen />
          </Seed>
        </BookingDraftProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test('without a trip it redirects to the tour; without contact to the contact step', () => {
  renderScreen(undefined);
  expect(screen.getByTestId('redirect')).toHaveTextContent('/tours/hoi-an-walking-tour');
});

test('trip without contact redirects to the contact step', async () => {
  renderScreen(trip);
  expect(await screen.findByTestId('redirect')).toHaveTextContent(
    '/tours/hoi-an-walking-tour/book',
  );
});

test('renders the order summary with per-line breakdown and total', async () => {
  renderScreen(trip, contact);
  expect(await screen.findByText('Sat, 15 Aug 2026')).toBeOnTheScreen();
  expect(screen.getByText('$450')).toBeOnTheScreen(); // 3 × 150 total
});

test('happy path: create → checkout → replace to the result screen with the SAME payload rules', async () => {
  (createBooking as jest.Mock).mockResolvedValue({ code: 'BK-1' });
  (startCheckout as jest.Mock).mockResolvedValue('https://pay.example/session');
  renderScreen(trip, contact);
  fireEvent.press(await screen.findByTestId('provider-PAYPAL'));
  fireEvent.press(screen.getByTestId('submit'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
  expect((createBooking as jest.Mock).mock.calls[0][0]).toEqual({
    tourSlug: 'hoi-an-walking-tour',
    departureId: 'dep-1',
    numAdults: 2,
    numChildren: 1,
    paymentProvider: 'PAYPAL',
    contactName: 'Nguyen Van A',
    contactEmail: 'a@example.com',
    contactPhone: '+84901234567',
  });
  expect(mockRouter.replace.mock.calls[0][0]).toBe(
    '/bookings/BK-1/result?checkoutUrl=https%3A%2F%2Fpay.example%2Fsession',
  );
});

test('checkout failure after create still navigates (no duplicate create on retap)', async () => {
  (createBooking as jest.Mock).mockResolvedValue({ code: 'BK-1' });
  (startCheckout as jest.Mock).mockRejectedValue(new Error('gateway down'));
  renderScreen(trip, contact);
  fireEvent.press(await screen.findByTestId('submit'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
  expect(mockRouter.replace.mock.calls[0][0]).toBe('/bookings/BK-1/result');
  expect(createBooking).toHaveBeenCalledTimes(1);
});

test('API rejection surfaces the mapped copy', async () => {
  const { ApiRequestError } = jest.requireActual('@tourism/core');
  (createBooking as jest.Mock).mockRejectedValue(
    new ApiRequestError(409, { code: 'SEATS_NOT_AVAILABLE', message: 'x' }),
  );
  renderScreen(trip, contact);
  fireEvent.press(await screen.findByTestId('submit'));
  expect(await screen.findByText(/sold out/i)).toBeOnTheScreen();
});
