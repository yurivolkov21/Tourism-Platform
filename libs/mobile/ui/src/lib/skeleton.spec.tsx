import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Skeleton } from './skeleton';

test('renders a themed muted block', () => {
  render(
    <ThemeProvider>
      <Skeleton width={240} height={130} testID="skeleton" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(
    screen.getByTestId('skeleton').props.style,
  );
  expect(flattened.backgroundColor).toBe(tokens.colors.light['muted']);
  expect(flattened.width).toBe(240);
});
