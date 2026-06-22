/**
 * Per-region visual theme ("xương chung — da riêng"): each region keeps the shared component
 * skeleton but carries its own accent (token-based, no hex) and one signature-section variant.
 * Class strings are written as literals so Tailwind detects them.
 */
export type SignatureVariant = 'adventure' | 'heritage' | 'delta';

export interface RegionTheme {
  /** Accent text colour (e.g. the intro rule, highlight icons, signature eyebrow). */
  accentText: string;
  /** Accent fill (rule, CTA, active tab). */
  accentBg: string;
  /** Text colour that sits on `accentBg`. */
  accentBtnText: string;
  /** Soft accent fill for icon chips. */
  accentSoft: string;
  /** Active-tab chip classes. */
  chipOn: string;
  /** Which signature section this region shows. */
  signature: SignatureVariant;
}

export const REGION_THEMES: Record<string, RegionTheme> = {
  'northern-vietnam': {
    accentText: 'text-primary',
    accentBg: 'bg-primary',
    accentBtnText: 'text-primary-foreground',
    accentSoft: 'bg-primary/10 text-primary',
    chipOn: 'border-primary bg-primary text-primary-foreground',
    signature: 'adventure',
  },
  'central-vietnam': {
    accentText: 'text-rating',
    accentBg: 'bg-rating',
    accentBtnText: 'text-foreground',
    accentSoft: 'bg-rating/15 text-rating',
    chipOn: 'border-rating bg-rating text-foreground',
    signature: 'heritage',
  },
  'southern-vietnam': {
    accentText: 'text-info',
    accentBg: 'bg-info',
    accentBtnText: 'text-info-foreground',
    accentSoft: 'bg-info/10 text-info',
    chipOn: 'border-info bg-info text-info-foreground',
    signature: 'delta',
  },
};

const DEFAULT_THEME = REGION_THEMES['northern-vietnam'] as RegionTheme;

export function getRegionTheme(slug: string): RegionTheme {
  return REGION_THEMES[slug] ?? DEFAULT_THEME;
}
