import * as ReactNative from 'react-native';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from './theme-provider';

function Probe() {
  const theme = useTheme();
  return <Text>{theme.colors['primary']}</Text>;
}

function SchemeProbe() {
  const theme = useTheme();
  return <Text>{theme.scheme}</Text>;
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

test('ThemeProvider follows the OS dark color scheme', () => {
  const useColorSchemeSpy = jest
    .spyOn(ReactNative, 'useColorScheme')
    .mockReturnValue('dark');

  try {
    render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText('dark')).toBeOnTheScreen();
  } finally {
    useColorSchemeSpy.mockRestore();
  }
});
