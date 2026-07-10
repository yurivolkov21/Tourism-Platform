import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { createTheme, type AppTheme, type ColorScheme } from './theme';

export type ThemePreference = ColorScheme | 'system';

type ThemeContextValue = {
  theme: AppTheme;
  colorScheme: ColorScheme;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: createTheme('light'),
  colorScheme: 'light',
});

type ThemeProviderProps = PropsWithChildren<{
  /** Until in-app theme toggle ships, mobile passes `light` for a consistent demo UI. */
  preference?: ThemePreference;
}>;

export function ThemeProvider({
  children,
  preference = 'system',
}: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const colorScheme: ColorScheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo(
    () => ({
      theme: createTheme(colorScheme),
      colorScheme,
    }),
    [colorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext).theme;
}

export function useThemeColorScheme(): ColorScheme {
  return useContext(ThemeContext).colorScheme;
}
