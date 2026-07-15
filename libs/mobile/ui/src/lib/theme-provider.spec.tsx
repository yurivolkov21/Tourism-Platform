import * as ReactNative from 'react-native';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { buildTheme } from './theme';
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

test('ThemeProvider scheme prop overrides the OS color scheme', () => {
  const useColorSchemeSpy = jest
    .spyOn(ReactNative, 'useColorScheme')
    .mockReturnValue('light');

  try {
    render(
      <ThemeProvider scheme="dark">
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText('dark')).toBeOnTheScreen();
  } finally {
    useColorSchemeSpy.mockRestore();
  }
});

test('buildTheme exposes the hero display variant', () => {
  const t = buildTheme('dark');
  expect(t.typography.hero).toEqual({
    fontSize: 40,
    lineHeight: 46,
    fontFamily: t.fontFamilies.headingBold,
  });
});
