import { theme as tokens } from '@tourism/tokens/theme';

export type ColorScheme = 'light' | 'dark';

export interface TypographyVariant {
  fontSize: number;
  lineHeight: number;
  /** Exact loaded font name — custom fonts on Android ignore fontWeight. */
  fontFamily: string;
}

export interface FontFamilies {
  heading: string;
  headingBold: string;
  sans: string;
  sansMedium: string;
  sansSemiBold: string;
}

/** PostScript names as registered by @expo-google-fonts (loaded in the app's root layout). */
export const fontFamilies: FontFamilies = {
  heading: 'Fraunces_600SemiBold',
  headingBold: 'Fraunces_700Bold',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemiBold: 'Geist_600SemiBold',
};

export interface Theme {
  scheme: ColorScheme;
  /** Token colors (hex), keyed like the web CSS vars: background, foreground, primary, … */
  colors: Record<string, string>;
  radius: { sm: number; md: number; lg: number; xl: number };
  /** 4dp grid: spacing(4) = 16. */
  spacing: (steps: number) => number;
  fontFamilies: FontFamilies;
  typography: {
    display: TypographyVariant;
    /** P5.6: one Navel-scale statement per screen (hero titles, sheet titles). */
    hero: TypographyVariant;
    title: TypographyVariant;
    body: TypographyVariant;
    caption: TypographyVariant;
  };
}

export function buildTheme(scheme: ColorScheme): Theme {
  const base = tokens.radius.base;
  return {
    scheme,
    colors: tokens.colors[scheme],
    radius: {
      sm: Math.round(base * 0.5),
      md: base,
      lg: Math.round(base * 1.5),
      xl: base * 2,
    },
    spacing: (steps) => steps * 4,
    fontFamilies,
    typography: {
      display: {
        fontSize: 28,
        lineHeight: 34,
        fontFamily: fontFamilies.headingBold,
      },
      hero: {
        fontSize: 40,
        lineHeight: 46,
        fontFamily: fontFamilies.headingBold,
      },
      title: { fontSize: 20, lineHeight: 26, fontFamily: fontFamilies.heading },
      body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamilies.sans },
      caption: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fontFamilies.sansMedium,
      },
    },
  };
}
