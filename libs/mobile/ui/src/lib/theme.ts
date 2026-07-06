import { theme as tokens } from '@tourism/tokens/theme';

export type ColorScheme = 'light' | 'dark';

export interface TypographyVariant {
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  lineHeight: number;
}

export interface Theme {
  scheme: ColorScheme;
  /** Token colors (hex), keyed like the web CSS vars: background, foreground, primary, … */
  colors: Record<string, string>;
  radius: { sm: number; md: number; lg: number; xl: number };
  /** 4dp grid: spacing(4) = 16. */
  spacing: (steps: number) => number;
  typography: {
    display: TypographyVariant;
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
    typography: {
      display: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
      title: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
      body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
  };
}
