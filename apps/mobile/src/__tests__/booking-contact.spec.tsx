import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppText, ThemeProvider } from '@tourism/mobile-ui';
import BookingContactScreen from '../app/tours/[slug]/book';
import { BookingDraftProvider, useBookingDraft, type BookingTrip } from '../lib/booking-draft';
import { fetchProfile } from '../lib/profile';

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
jest.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../lib/profile', () => ({ fetchProfile: jest.fn() }));

const trip: BookingTrip = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: 'dep-1',
  departureLabel: 'Sat, 15 Aug 2026',
  unitPrice: 100,
  currency: 'USD',
  adults: 2,
  children: 0,
};

function SeedTrip({ children, seed }: { children: ReactNode; seed?: BookingTrip }) {
  const { setTrip, draft } = useBookingDraft();
  useEffect(() => {
    if (seed && !draft) setTrip(seed);
  }, [seed, draft, setTrip]);
  if (seed && !draft) return <AppText>seeding</AppText>;
  return <>{children}</>;
}

function renderScreen(seed?: BookingTrip) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <BookingDraftProvider>
          <SeedTrip seed={seed}>
            <BookingContactScreen />
          </SeedTrip>
        </BookingDraftProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchProfile as jest.Mock).mockResolvedValue({
    fullName: 'Nguyen Van A',
    email: 'a@example.com',
    initial: 'N',
  });
});

test('without a trip for this tour it redirects back to the tour', () => {
  renderScreen(undefined);
  expect(screen.getByTestId('redirect')).toHaveTextContent('/tours/hoi-an-walking-tour');
});

test('shows the trip summary and prefills contact from the profile', async () => {
  renderScreen(trip);
  expect(await screen.findByText('Sat, 15 Aug 2026')).toBeOnTheScreen();
  expect(await screen.findByDisplayValue('a@example.com')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('Nguyen Van A')).toBeOnTheScreen();
});

test('invalid contact shows the mapped error and stays put', async () => {
  renderScreen(trip);
  const email = await screen.findByDisplayValue('a@example.com');
  fireEvent.changeText(email, 'not-an-email');
  fireEvent.press(screen.getByTestId('continue-contact'));
  expect(await screen.findByText(/valid name and email/i)).toBeOnTheScreen();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('valid contact continues to the payment step', async () => {
  renderScreen(trip);
  await screen.findByDisplayValue('a@example.com');
  fireEvent.press(screen.getByTestId('continue-contact'));
  expect(mockRouter.push.mock.calls[0][0]).toBe('/tours/hoi-an-walking-tour/book-payment');
});
