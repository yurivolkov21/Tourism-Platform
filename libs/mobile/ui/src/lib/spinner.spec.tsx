import { render, screen } from '@testing-library/react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Spinner } from './spinner';

test('renders an activity indicator', () => {
  render(
    <ThemeProvider>
      <Spinner testID="spinner" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('spinner')).toBeOnTheScreen();
});

test('colors the activity indicator with the theme primary color', () => {
  render(
    <ThemeProvider>
      <Spinner testID="spinner" />
    </ThemeProvider>,
  );
  expect(screen.getByTestId('spinner').props.color).toBe(
    tokens.colors.light.primary,
  );
});
