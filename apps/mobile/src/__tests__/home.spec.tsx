import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from '../app/(tabs)/index';
import { fetchMyBookings, type BookingVm } from '../lib/booking';
import { fetchDestinations } from '../lib/destinations';
import { fetchProfile } from '../lib/profile';

let mockStatus = 'signedOut';
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: mockStatus }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
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

import { router } from 'expo-router';

const mockDests = fetchDestinations as jest.MockedFunction<
  typeof fetchDestinations
>;
const mockBookings = fetchMyBookings as jest.MockedFunction<
  typeof fetchMyBookings
>;
const mockProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

const northVm = {
  slug: 'ha-long-bay',
  name: 'Hạ Long Bay',
  image: 'https://img.test/hl.jpg',
  toursCount: 4,
  region: 'Northern Vietnam',
};
const centralVm = {
  slug: 'hoi-an',
  name: 'Hội An',
  image: 'https://img.test/ha.jpg',
  toursCount: 6,
  region: 'Central Vietnam',
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

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider scheme="dark">
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
  mockDests.mockResolvedValue([northVm, centralVm]);
  mockBookings.mockResolvedValue([]);
  mockProfile.mockResolvedValue({
    fullName: 'Yuri Volkov',
    email: 'y@e.com',
    initial: 'Y',
  });
});

test('guest home shows the header, headline and the North region cards', async () => {
  renderHome();
  expect(await screen.findByText('Hạ Long Bay')).toBeOnTheScreen();
  expect(screen.getByText('Welcome')).toBeOnTheScreen();
  expect(screen.getByText('Nexora')).toBeOnTheScreen();
  expect(screen.getByText('Recommendations')).toBeOnTheScreen();
  // Central destinations stay hidden until that tab is chosen.
  expect(screen.queryByText('Hội An')).toBeNull();
});

test('switching the region tab swaps the card rail', async () => {
  renderHome();
  await screen.findByText('Hạ Long Bay');
  fireEvent.press(screen.getByLabelText('Central Vietnam'));
  expect(await screen.findByText('Hội An')).toBeOnTheScreen();
  expect(screen.queryByText('Hạ Long Bay')).toBeNull();
});

test('a region card routes to Explore filtered by that destination', async () => {
  renderHome();
  await screen.findByText('Hạ Long Bay');
  fireEvent.press(screen.getByTestId('region-card-ha-long-bay'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/explore',
    params: { destination: 'Hạ Long Bay' },
  });
});

test('the search button routes to Explore with focusSearch', async () => {
  renderHome();
  await screen.findByText('Hạ Long Bay');
  await userEvent.press(screen.getByTestId('home-search'));
  expect(router.push).toHaveBeenCalledWith('/explore?focusSearch=1');
});

test('guests never load bookings', async () => {
  renderHome();
  await screen.findByText('Hạ Long Bay');
  expect(mockBookings).not.toHaveBeenCalled();
});

test('signed-in home surfaces the next trip and routes to its detail', async () => {
  mockStatus = 'signedIn';
  mockBookings.mockResolvedValue([bookingVm]);
  renderHome();
  expect(await screen.findByTestId('upcoming-BK-1')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('upcoming-BK-1'));
  expect(router.push).toHaveBeenCalledWith('/bookings/BK-1');
});

test('renders the destinations error state with retry', async () => {
  mockDests.mockRejectedValue(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
