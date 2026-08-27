import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Badge } from './badge';

test('renders the label on the tone background', () => {
  render(
    <ThemeProvider>
      <Badge label="Best value" tone="success" testID="badge" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Best value')).toBeOnTheScreen();
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.mobileLight['success']);
});

test('rating tone inks from its OWN pair, which does not flip with the scheme', () => {
  // `rating` is brass in BOTH schemes, so an ink that flips is wrong in one of
  // them: reading `foreground` gave dark ink on brass in light (fine) and CREAM
  // on brass in dark (1.58:1 — the "Popular" chip on a tour card was
  // effectively blank). `rating-foreground` stays dark in every scheme.
  render(
    <ThemeProvider>
      <Badge label="Popular" tone="rating" />
    </ThemeProvider>,
  );
  const text = screen.getByText('Popular');
  expect(StyleSheet.flatten(text.props.style).color).toBe(
    tokens.colors.mobileLight['rating-foreground'],
  );
  expect(tokens.colors.dark['rating-foreground']).toBe(
    tokens.colors.mobileLight['rating-foreground'],
  );
});

test('muted tone renders the muted pair (booking CANCELLED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Cancelled" tone="muted" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.mobileLight['muted']);
  const text = StyleSheet.flatten(screen.getByText('Cancelled').props.style);
  expect(text.color).toBe(tokens.colors.mobileLight['muted-foreground']);
});

test('destructive tone renders the destructive pair (booking REFUNDED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Refunded" tone="destructive" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(
    tokens.colors.mobileLight['destructive'],
  );
  // Its OWN pair, not the primary one: the mobile light primary is brass, so
  // `primary-foreground` is a dark emerald that all but disappears on the red.
  const text = StyleSheet.flatten(screen.getByText('Refunded').props.style);
  expect(text.color).toBe(tokens.colors.mobileLight['destructive-foreground']);
});
