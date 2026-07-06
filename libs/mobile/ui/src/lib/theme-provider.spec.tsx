import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './theme-provider';

function Probe() {
  const theme = useTheme();
  return <Text>{theme.colors['primary']}</Text>;
}

test('useTheme returns the token theme inside the provider', () => {
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(/^#[0-9a-f]{6,8}$/)).toBeOnTheScreen();
});

test('useTheme throws outside the provider', () => {
  expect(() => render(<Probe />)).toThrow(/inside <ThemeProvider>/);
});
