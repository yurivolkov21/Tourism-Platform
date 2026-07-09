import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from '../app/(tabs)/index';
import { fetchMyBookings, type BookingVm } from '../lib/booking';
import { fetchDestinations } from '../lib/destinations';
import { fetchProfile } from '../lib/profile';
import { fetchFeaturedTours } from '../lib/tours';
import { fetchSavedTours } from '../lib/wishlist';

let mockStatus = 'signedOut';
jest.mock('../lib/auth-context', () => ({ useAuth: () => ({ status: mockStatus }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));
jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));
jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
}));
jest.mock('../lib/booking', () => ({
  ...jest.requireActual('../lib/booking'),
  fetchMyBookings: jest.fn(),
}));
jest.mock('../lib/wishlist', () => ({
  ...jest.requireActual('../lib/wishlist'),
  fetchSavedTours: jest.fn(),
  useWishlist: () => ({ isGuest: true, isSaved: () => false, toggle: jest.fn() }),
}));

import { router } from 'expo-router';

const mockFeatured = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;
const mockBookings = fetchMyBookings as jest.MockedFunction<typeof fetchMyBookings>;
const mockSaved = fetchSavedTours as jest.MockedFunction<typeof fetchSavedTours>;
const mockProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

const tourVm = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 3,
  basePrice: 450,
  currency: 'USD',
  rating: 4.8,
  reviewCount: 12,
  badges: [],
  image: 'https://img.test/h.jpg',
};

const bookingVm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Hoi An Walking Tour',
  tourSlug: 'hoi-an-walking-tour',
  departureLabel: 'Sat, 01 Jan 2099',
  departureDate: '2099-01-01',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@a.com',
};

const savedVm = {
  tourId: 'uuid-9',
  slug: 'sapa-trek',
  title: 'Sapa Trek',
  image: 'https://img.test/s.jpg',
  basePrice: 200,
  currency: 'USD',
};

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <HomeScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
  mockDests.mockResolvedValue([]);
  mockBookings.mockResolvedValue([]);
  mockSaved.mockResolvedValue([]);
  mockProfile.mockResolvedValue({ fullName: 'Yuri Volkov', email: 'y@e.com', initial: 'Y' });
});

test('guest home shows the tagline, search and featured tours', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText('Where to next?')).toBeOnTheScreen();
});

test('search pill routes to Explore with focusSearch', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: /search tours & destinations/i }));
  expect(router.push).toHaveBeenCalledWith('/explore?focusSearch=1');
});

test('guests do not load trips or saved', async () => {
  mockFeatured.mockResolvedValueOnce([tourVm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  expect(mockBookings).not.toHaveBeenCalled();
  expect(mockSaved).not.toHaveBeenCalled();
});

test('signed-in home surfaces the next trip and routes to its detail', async () => {
  mockStatus = 'signedIn';
  mockFeatured.mockResolvedValueOnce([tourVm]);
  mockBookings.mockResolvedValue([bookingVm]);
  renderHome();
  expect(await screen.findByText('Your next trip')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('upcoming-BK-1'));
  expect(router.push).toHaveBeenCalledWith('/bookings/BK-1');
});

test('signed-in home shows the recently-saved rail with See all', async () => {
  mockStatus = 'signedIn';
  mockFeatured.mockResolvedValueOnce([tourVm]);
  mockSaved.mockResolvedValue([savedVm]);
  renderHome();
  expect(await screen.findByText('Recently saved')).toBeOnTheScreen();
  expect(screen.getByText('Sapa Trek')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'See all' }));
  expect(router.push).toHaveBeenCalledWith('/saved');
});

test('renders the featured error state with retry', async () => {
  mockFeatured.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
