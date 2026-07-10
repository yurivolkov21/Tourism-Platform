import { theme as tokenTheme } from '@tourism/tokens/theme';

import { appFonts } from './fonts';

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = Record<string, string>;

export type AppTheme = {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    largeTitle: number;
    title: number;
    headline: number;
    subheading: number;
    bodyLarge: number;
    body: number;
    caption: number;
  };
  fonts: {
    sans: string;
    sansMedium: string;
    sansSemibold: string;
    sansBold: string;
    heading: string;
    headingSemibold: string;
    headingItalic: string;
  };
  minTouch: number;
};

function pickColors(scheme: ColorScheme): ThemeColors {
  return tokenTheme.colors[scheme] as ThemeColors;
}

export function createTheme(scheme: ColorScheme = 'light'): AppTheme {
  return {
    colors: pickColors(scheme),
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 6, md: 10, lg: 16 },
    // Mirrors web Tailwind scale: text-3xl/2xl/lg/base/sm (16px base).
    typography: {
      largeTitle: 36,
      title: 30,
      headline: 24,
      subheading: 20,
      bodyLarge: 18,
      body: 16,
      caption: 14,
    },
    fonts: {
      sans: appFonts.sans.regular,
      sansMedium: appFonts.sans.medium,
      sansSemibold: appFonts.sans.semibold,
      sansBold: appFonts.sans.bold,
      heading: appFonts.heading.bold,
      headingSemibold: appFonts.heading.semibold,
      headingItalic: appFonts.heading.italic,
    },
    minTouch: 44,
  };
}

export function color(theme: AppTheme, key: string): string {
  return theme.colors[key] ?? theme.colors.foreground;
}
