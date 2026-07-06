import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import HomeScreen from './index';
import { fetchFeaturedTours } from '../../lib/tours';

jest.mock('../../lib/tours', () => ({
  ...jest.requireActual('../../lib/tours'),
  fetchFeaturedTours: jest.fn(),
}));

const mockFetch = fetchFeaturedTours as jest.MockedFunction<typeof fetchFeaturedTours>;

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
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  destination: 'Ha Long',
  durationDays: 3,
  price: 450,
  currency: 'USD',
  image: 'https://img.test/h.jpg',
};

test('renders featured tours on success', async () => {
  mockFetch.mockResolvedValueOnce([vm]);
  renderHome();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
});

test('renders the error state with retry', async () => {
  mockFetch.mockRejectedValueOnce(new Error('boom'));
  renderHome();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});

test('renders the empty state', async () => {
  mockFetch.mockResolvedValueOnce([]);
  renderHome();
  expect(await screen.findByText(/no tours to show yet/i)).toBeOnTheScreen();
});
