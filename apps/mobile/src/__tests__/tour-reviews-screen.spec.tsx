import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ReviewsScreen from '../app/tours/[slug]/reviews';
import { fetchTourReviews } from '../lib/tour-detail';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ slug: 'ha-long-cruise' }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock('../lib/tour-detail', () => ({
  ...jest.requireActual('../lib/tour-detail'),
  fetchTourReviews: jest.fn(),
}));

const mockReviews = fetchTourReviews as jest.MockedFunction<
  typeof fetchTourReviews
>;

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ReviewsScreen />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

test('lists the full set of reviews (pageSize 50)', async () => {
  mockReviews.mockResolvedValueOnce([
    {
      id: 'r1',
      author: 'Jane',
      date: 'May 2026',
      rating: 5,
      quote: 'Wonderful trip.',
    },
    {
      id: 'r2',
      author: 'Minh',
      date: 'Jun 2026',
      rating: 4,
      quote: 'Great guide.',
    },
  ]);
  renderScreen();
  expect(await screen.findByText('Wonderful trip.')).toBeOnTheScreen();
  expect(screen.getByText('Great guide.')).toBeOnTheScreen();
  expect(mockReviews.mock.calls[0]).toEqual(['ha-long-cruise', 50]);
});

test('error state offers retry', async () => {
  mockReviews.mockRejectedValueOnce(new Error('boom'));
  renderScreen();
  expect(await screen.findByText(/couldn't load this tour/i)).toBeOnTheScreen();
});
