import { render, screen } from '@testing-library/react-native';
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
