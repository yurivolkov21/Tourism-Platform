import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { StickyCTABar } from './sticky-cta-bar';
import { ThemeProvider } from './theme-provider';

// safe-area-context is stubbed in ../test-setup.ts (insets = 0).

test('renders the leading slot and the CTA children', () => {
  render(
    <ThemeProvider scheme="dark">
      <StickyCTABar leading={<Text>from $120</Text>}>
        <Text>Book now</Text>
      </StickyCTABar>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('sticky-cta-bar')).toBeOnTheScreen();
  expect(screen.getByText('from $120')).toBeOnTheScreen();
  expect(screen.getByText('Book now')).toBeOnTheScreen();
});

test('renders without a leading slot', () => {
  render(
    <ThemeProvider scheme="dark">
      <StickyCTABar>
        <Text>Continue</Text>
      </StickyCTABar>
    </ThemeProvider>,
  );
  expect(screen.getByText('Continue')).toBeOnTheScreen();
});
