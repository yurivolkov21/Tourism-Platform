import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ExploreScreen from '../app/(tabs)/explore';
import { fetchDestinations } from '../lib/destinations';
import { fetchAllTours, type TourCardVm } from '../lib/tours';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchAllTours: jest.fn(),
}));

jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));

const mockTours = fetchAllTours as jest.MockedFunction<typeof fetchAllTours>;
const mockDests = fetchDestinations as jest.MockedFunction<typeof fetchDestinations>;

const tour = (over: Partial<TourCardVm>): TourCardVm => ({
  slug: 'x',
  title: 'X',
  destination: 'Hanoi',
  durationDays: 2,
  basePrice: 150,
  currency: 'USD',
  rating: 4.0,
  reviewCount: 10,
  badges: [],
  ...over,
});

const tours = [
  tour({ slug: 'a', title: 'Ha Long Bay Cruise', destination: 'Ha Long', durationDays: 3, basePrice: 450 }),
  tour({ slug: 'b', title: 'Hanoi Street Food', destination: 'Hanoi', durationDays: 1, basePrice: 49 }),
];

function renderExplore() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <ExploreScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders all tours on success', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([{ slug: 'ha-long', name: 'Ha Long' }]);
  renderExplore();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText('Hanoi Street Food')).toBeOnTheScreen();
  expect(screen.getByText('2 tours')).toBeOnTheScreen();
});

test('typing in search narrows the list', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.type(screen.getByLabelText('Search tours or destinations'), 'street food');
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  expect(screen.getByText('Hanoi Street Food')).toBeOnTheScreen();
});

test('duration chip filters, clear filters restores', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  await screen.findByText('Ha Long Bay Cruise');
  await userEvent.press(screen.getByRole('button', { name: '1 day' }));
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: '4+ days' }));
  await userEvent.press(screen.getByRole('button', { name: '1 day' }));
  // only 4+ selected now -> nothing matches -> empty state with clear
  expect(await screen.findByText('No tours match your search.')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
});

test('renders the error state with retry', async () => {
  mockTours.mockRejectedValueOnce(new Error('boom'));
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  expect(await screen.findByText(/couldn't load tours/i)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /try again/i })).toBeOnTheScreen();
});
