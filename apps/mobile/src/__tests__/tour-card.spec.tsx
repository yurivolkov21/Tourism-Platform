import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { TourCard } from '../components/tour-card';
import type { TourCardVm } from '../lib/tours';

const vm: TourCardVm = {
  slug: 'ha-long-cruise',
  title: 'Ha Long Bay Cruise',
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
