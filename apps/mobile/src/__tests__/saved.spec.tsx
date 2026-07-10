import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import SavedScreen from '../app/(tabs)/saved';
import { fetchSavedTours } from '../lib/wishlist';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

let mockStatus = 'signedOut';
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: mockStatus, user: null }),
}));

const mockToggle = jest.fn();
jest.mock('../lib/wishlist', () => ({
  ...jest.requireActual('../lib/wishlist'),
  fetchSavedTours: jest.fn(),
  useWishlist: () => ({
    isGuest: mockStatus !== 'signedIn',
    isSaved: () => true,
    toggle: mockToggle,
  }),
}));

const mockFetch = fetchSavedTours as jest.MockedFunction<
  typeof fetchSavedTours
>;

function renderSaved() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <SavedScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
});

test('guests see the sign-in gate', () => {
  renderSaved();
  expect(screen.getByText('Save tours you love')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
});

test('signed-in users see their saved tours and can remove one', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce([
    {
      tourId: 'uuid-1',
      slug: 'ha-long-cruise',
      title: 'Ha Long Bay Cruise',
      image: 'https://img.test/h.jpg',
      basePrice: 450,
      currency: 'USD',
    },
  ]);
  renderSaved();
  expect(await screen.findByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  // by testID: the row Pressable nests the remove button (RNTL name matching collides)
  await userEvent.press(screen.getByTestId('remove-uuid-1'));
  expect(mockToggle).toHaveBeenCalledWith('uuid-1');
});

test('signed-in empty state offers browsing', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce([]);
  renderSaved();
  expect(await screen.findByText(/nothing saved yet/i)).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Browse tours' }),
  ).toBeOnTheScreen();
});
