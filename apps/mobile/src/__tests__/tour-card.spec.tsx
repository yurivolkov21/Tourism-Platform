import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { TourCard } from '../components/tour-card';
import type { TourCardVm } from '../lib/tours';

const vm: TourCardVm = {
  id: 'uuid-1',
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
  summary: 'Two days among the karsts.',
  destination: 'Ha Long',
  durationDays: 3,
  basePrice: 450,
  compareAtPrice: 520,
  currency: 'USD',
  rating: 4.9,
  reviewCount: 214,
  badges: ['POPULAR', 'BEST_VALUE'],
  nextDepartureSeatsLeft: 3,
};

function renderCard(variant: 'shelf' | 'list') {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <TourCard tour={vm} variant={variant} onPress={jest.fn()} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders badges, rating and compare-at price', () => {
  renderCard('shelf');
  expect(screen.getByText('Popular')).toBeOnTheScreen();
  expect(screen.getByText('Best value')).toBeOnTheScreen();
  expect(screen.getByText('4.9')).toBeOnTheScreen();
  expect(screen.getByText('$450')).toBeOnTheScreen();
  expect(screen.getByText('$520')).toBeOnTheScreen();
});

test('list variant shows the low-seats badge', () => {
  renderCard('list');
  expect(screen.getByText('3 seats left')).toBeOnTheScreen();
});

test('shelf variant hides the low-seats badge', () => {
  renderCard('shelf');
  expect(screen.queryByText('3 seats left')).not.toBeOnTheScreen();
});

test('list variant shows the 2-line summary; shelf does not', () => {
  renderCard('list');
  expect(screen.getByText('Two days among the karsts.')).toBeOnTheScreen();
  screen.unmount();
  renderCard('shelf');
  expect(
    screen.queryByText('Two days among the karsts.'),
  ).not.toBeOnTheScreen();
});

test('rating row always renders (locked card height), even with zero reviews', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <TourCard
          tour={{ ...vm, rating: 0, reviewCount: 0 }}
          onPress={jest.fn()}
        />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText('0.0')).toBeOnTheScreen();
  expect(screen.getByText(/\(0 reviews\)/)).toBeOnTheScreen();
});
