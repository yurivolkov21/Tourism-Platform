import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from '../app/(tabs)/index';
import { fetchDestinations } from '../lib/destinations';
import { fetchFeaturedTours } from '../lib/tours';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));

jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));

jest.mock('../lib/wishlist', () => ({
  useWishlist: () => ({ isGuest: true, isSaved: () => false, toggle: jest.fn() }),
}));

import { router } from 'expo-router';

const mockFetch = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;

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

const vm = {
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

beforeEach(() => {
  jest.clearAllMocks();
  mockDests.mockResolvedValue([]);
});

test('renders the hero headline and featured tours', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText(/timeless journeys/i)).toBeOnTheScreen();
});

test('search pill routes to Explore with focusSearch', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: /where would you like to go/i }));
  expect(router.push).toHaveBeenCalledWith('/explore?focusSearch=1');
});

test('destination tile routes to Explore with the destination preset', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  mockDests.mockResolvedValue([{ slug: 'ha-long', name: 'Ha Long', toursCount: 3 }]);
  renderHome();
  await screen.findByText('Ha Long Bay Cruise');
  // by testID: the tour card also contains "Ha Long" as descendant text (RNTL name matching)
  await userEvent.press(screen.getByTestId('destination-ha-long'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/explore',
    params: { destination: 'Ha Long' },
  });
});

test('renders the error state with retry', async () => {
  mockFetch.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
