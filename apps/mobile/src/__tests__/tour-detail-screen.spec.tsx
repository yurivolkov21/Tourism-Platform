import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import TourDetailScreen from '../app/tours/[slug]';
import { BookingDraftProvider } from '../lib/booking-draft';
import {
  fetchTourDetail,
  fetchTourReviews,
  type TourDetailVm,
} from '../lib/tour-detail';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'ha-long-cruise' }),
}));

jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourDetail: jest.fn(),
  fetchTourReviews: jest.fn(),
}));

jest.mock('../lib/wishlist', () => ({
  useWishlist: () => ({
    isGuest: true,
    isSaved: () => false,
    toggle: jest.fn(),
  }),
}));

// The sticky bar's Book now CTA reads the auth status directly.
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: 'signedOut' }),
}));

// The DepartureSheet (mounted by the detail) fetches departures + supabase.
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchTourDepartures: jest.fn().mockResolvedValue([]),
}));

const mockDetail = fetchTourDetail as jest.MockedFunction<
  typeof fetchTourDetail
>;
const mockReviews = fetchTourReviews as jest.MockedFunction<
  typeof fetchTourReviews
>;

const vm: TourDetailVm = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 2,
  maxGroupSize: 16,
  difficulty: 'easy',
  basePrice: 450,
  compareAtPrice: 520,
  currency: 'USD',
  rating: 4.9,
  reviewCount: 214,
  badges: ['POPULAR'],
  nextDepartureDate: '15 Aug 2026',
  nextDepartureSeatsLeft: 6,
  overview: 'Two days among the karsts.',
  gallery: ['https://img.test/hero.jpg'],
  highlights: ['Sunset kayaking'],
  itinerary: [{ day: 1, title: 'Embark', body: 'Board at noon.' }],
  included: ['All meals'],
  excluded: ['Drinks'],
  faqs: [{ question: 'Wifi?', answer: 'Yes.' }],
  policies: [
    { kind: 'CANCELLATION', title: 'Cancellation', body: 'Free until 7 days.' },
  ],
};

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <BookingDraftProvider>
            <TourDetailScreen />
          </BookingDraftProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders the full detail with itinerary accordion and CTA', async () => {
  mockDetail.mockResolvedValueOnce(vm);
  mockReviews.mockResolvedValueOnce([
    {
      id: 'r1',
      author: 'Jane',
      date: 'May 2026',
      rating: 5,
      quote: 'Wonderful trip.',
    },
  ]);
  renderDetail();
  // The title renders twice now: detail heading + the enquiry sheet's subtitle
  // (the jest sheet mock renders its children unconditionally).
  expect(
    (await screen.findAllByText('Ha Long Bay Cruise')).length,
  ).toBeGreaterThan(0);
  expect(screen.getByText('Popular')).toBeOnTheScreen();
  expect(screen.getByText(/next departure: 15 aug 2026/i)).toBeOnTheScreen();
  expect(screen.getByText(/6 seats left/i)).toBeOnTheScreen();
  expect(
    screen.getByText('Sunset kayaking', { exact: false }),
  ).toBeOnTheScreen();
  // itinerary body appears only after expanding
  expect(screen.queryByText('Board at noon.')).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Day 1: Embark' }));
  expect(screen.getByText('Board at noon.')).toBeOnTheScreen();
  expect(await screen.findByText('Wonderful trip.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Inquire now' })).toBeOnTheScreen();
});

test('unknown slug renders the not-found state', async () => {
  mockDetail.mockResolvedValueOnce(null);
  mockReviews.mockResolvedValueOnce([]);
  renderDetail();
  expect(await screen.findByText(/isn't available anymore/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
});

test('fetch failure renders the error state with retry', async () => {
  mockDetail.mockRejectedValueOnce(new Error('boom'));
  mockReviews.mockResolvedValueOnce([]);
  renderDetail();
  expect(await screen.findByText(/couldn't load this tour/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});
