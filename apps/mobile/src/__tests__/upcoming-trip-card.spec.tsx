import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { UpcomingTripCard } from '../components/upcoming-trip-card';
import type { BookingVm } from '../lib/booking';

const vm: BookingVm = {
  code: 'BK-1',
  status: 'PAID',
  statusMeta: { label: 'Paid', tone: 'success' },
  tourTitle: 'Ha Long Bay Cruise',
  tourSlug: 'ha-long-cruise',
  departureLabel: 'Sat, 15 Aug 2026',
  departureDate: '2026-08-15',
  bookedOn: '07 Jul 2026',
  party: '1 adult',
  totalAmount: 100,
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'A',
  contactEmail: 'a@a.com',
};

test('renders the tour, departure and status and fires onPress', () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <UpcomingTripCard booking={vm} onPress={onPress} />
    </ThemeProvider>,
  );
  expect(screen.getByText('Ha Long Bay Cruise')).toBeOnTheScreen();
  expect(screen.getByText(/Sat, 15 Aug 2026/)).toBeOnTheScreen();
  expect(screen.getByText('Paid')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('upcoming-BK-1'));
  expect(onPress).toHaveBeenCalled();
});
