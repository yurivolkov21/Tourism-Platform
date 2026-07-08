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
  expect(flattened.backgroundColor).toBe(tokens.colors.light['success']);
});

test('rating tone keeps foreground text (web parity)', () => {
  render(
    <ThemeProvider>
      <Badge label="Popular" tone="rating" />
    </ThemeProvider>,
  );
  const text = screen.getByText('Popular');
  expect(StyleSheet.flatten(text.props.style).color).toBe(tokens.colors.light['foreground']);
});

test('muted tone renders the muted pair (booking CANCELLED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Cancelled" tone="muted" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['muted']);
  const text = StyleSheet.flatten(screen.getByText('Cancelled').props.style);
  expect(text.color).toBe(tokens.colors.light['muted-foreground']);
});

test('destructive tone renders the destructive pair (booking REFUNDED)', () => {
  render(
    <ThemeProvider>
      <Badge label="Refunded" tone="destructive" testID="badge" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('badge').props.style);
  expect(flattened.backgroundColor).toBe(tokens.colors.light['destructive']);
  // No destructive-foreground token exists — the primary pair is reused.
  const text = StyleSheet.flatten(screen.getByText('Refunded').props.style);
  expect(text.color).toBe(tokens.colors.light['primary-foreground']);
});
