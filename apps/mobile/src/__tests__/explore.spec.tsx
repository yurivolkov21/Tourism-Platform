import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ExploreScreen from '../app/(tabs)/explore';
import { fetchDestinations } from '../lib/destinations';
import { fetchAllTours, type TourCardVm } from '../lib/tours';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  mockParams = {};
});

jest.mock('../lib/tours', () => ({
  ...jest.requireActual('../lib/tours'),
  fetchAllTours: jest.fn(),
}));

jest.mock('../lib/destinations', () => ({
  ...jest.requireActual('../lib/destinations'),
  fetchDestinations: jest.fn(),
}));

jest.mock('../lib/wishlist', () => ({
  useWishlist: () => ({
    isGuest: true,
    isSaved: () => false,
    toggle: jest.fn(),
  }),
}));

const mockTours = fetchAllTours as jest.MockedFunction<typeof fetchAllTours>;
const mockDests = fetchDestinations as jest.MockedFunction<
  typeof fetchDestinations
>;

const tour = (over: Partial<TourCardVm>): TourCardVm => ({
  id: 'x',
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
  tour({
    slug: 'a',
    title: 'Ha Long Bay Cruise',
    destination: 'Ha Long',
    durationDays: 3,
    basePrice: 450,
  }),
  tour({
    slug: 'b',
    title: 'Hanoi Street Food',
    destination: 'Hanoi',
    durationDays: 1,
    basePrice: 49,
  }),
];

function renderExplore() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
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
  mockDests.mockResolvedValueOnce([
    { slug: 'ha-long', name: 'Ha Long', toursCount: 3, region: null },
  ]);
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
  await userEvent.type(
    screen.getByLabelText('Search tours or destinations'),
    'street food',
  );
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  expect(screen.getByText('Hanoi Street Food')).toBeOnTheScreen();
});

test('filter sheet: chips edit a draft, Show results applies, clear restores', async () => {
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  await screen.findByText('Ha Long Bay Cruise');
  // Bucket chips are pressed by testID: RNTL's byRole name matching also scans a
  // button's descendant text, so "1 day" would collide with a 1-day tour card.
  await userEvent.press(screen.getByTestId('open-filters'));
  await userEvent.press(screen.getByTestId('duration-1'));
  // Draft only — the list is untouched until the CTA applies it.
  expect(screen.getByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  await userEvent.press(screen.getByTestId('apply-filters'));
  expect(screen.queryByText('Ha Long Bay Cruise')).not.toBeOnTheScreen();
  // Flip the draft to 4+ only -> nothing matches -> empty state with clear
  await userEvent.press(screen.getByTestId('duration-4+'));
  await userEvent.press(screen.getByTestId('duration-1'));
  await userEvent.press(screen.getByTestId('apply-filters'));
  expect(
    await screen.findByText('No tours match your search.'),
  ).toBeOnTheScreen();
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

test('destination route param presets the filter', async () => {
  mockParams = { destination: 'Ha Long' };
  mockTours.mockResolvedValueOnce(tours);
  mockDests.mockResolvedValueOnce([]);
  renderExplore();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.queryByText('Hanoi Street Food')).not.toBeOnTheScreen();
  expect(screen.getByText('1 tour')).toBeOnTheScreen();
});
