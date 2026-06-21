// Design tokens — source of truth for @tourism/tokens.
// PR1 (parity): reproduces the shadcn (base-nova, neutral) theme currently inlined
// in each app's global.css, byte-compatible in CSS variable names. Real brand values
// and the full primitive scales arrive in later PRs (see design-tokens plan).
//
// Authored in Style Dictionary token format. Each color carries light + dark values.

const c = (light, dark) => ({ value: light, darkValue: dark, type: 'color' });

export default {
  color: {
    background: c('oklch(1 0 0)', 'oklch(0.145 0 0)'),
    foreground: c('oklch(0.145 0 0)', 'oklch(0.985 0 0)'),
    card: c('oklch(1 0 0)', 'oklch(0.205 0 0)'),
    'card-foreground': c('oklch(0.145 0 0)', 'oklch(0.985 0 0)'),
    popover: c('oklch(1 0 0)', 'oklch(0.205 0 0)'),
    'popover-foreground': c('oklch(0.145 0 0)', 'oklch(0.985 0 0)'),
    primary: c('oklch(0.205 0 0)', 'oklch(0.922 0 0)'),
    'primary-foreground': c('oklch(0.985 0 0)', 'oklch(0.205 0 0)'),
    secondary: c('oklch(0.97 0 0)', 'oklch(0.269 0 0)'),
    'secondary-foreground': c('oklch(0.205 0 0)', 'oklch(0.985 0 0)'),
    muted: c('oklch(0.97 0 0)', 'oklch(0.269 0 0)'),
    'muted-foreground': c('oklch(0.556 0 0)', 'oklch(0.708 0 0)'),
    accent: c('oklch(0.97 0 0)', 'oklch(0.269 0 0)'),
    'accent-foreground': c('oklch(0.205 0 0)', 'oklch(0.985 0 0)'),
    destructive: c('oklch(0.577 0.245 27.325)', 'oklch(0.704 0.191 22.216)'),
    border: c('oklch(0.922 0 0)', 'oklch(1 0 0 / 10%)'),
    input: c('oklch(0.922 0 0)', 'oklch(1 0 0 / 15%)'),
    ring: c('oklch(0.708 0 0)', 'oklch(0.556 0 0)'),
    'chart-1': c('oklch(0.87 0 0)', 'oklch(0.87 0 0)'),
    'chart-2': c('oklch(0.556 0 0)', 'oklch(0.556 0 0)'),
    'chart-3': c('oklch(0.439 0 0)', 'oklch(0.439 0 0)'),
    'chart-4': c('oklch(0.371 0 0)', 'oklch(0.371 0 0)'),
    'chart-5': c('oklch(0.269 0 0)', 'oklch(0.269 0 0)'),
    sidebar: c('oklch(0.985 0 0)', 'oklch(0.205 0 0)'),
    'sidebar-foreground': c('oklch(0.145 0 0)', 'oklch(0.985 0 0)'),
    'sidebar-primary': c('oklch(0.205 0 0)', 'oklch(0.488 0.243 264.376)'),
    'sidebar-primary-foreground': c('oklch(0.985 0 0)', 'oklch(0.985 0 0)'),
    'sidebar-accent': c('oklch(0.97 0 0)', 'oklch(0.269 0 0)'),
    'sidebar-accent-foreground': c('oklch(0.205 0 0)', 'oklch(0.985 0 0)'),
    'sidebar-border': c('oklch(0.922 0 0)', 'oklch(1 0 0 / 10%)'),
    'sidebar-ring': c('oklch(0.708 0 0)', 'oklch(0.556 0 0)'),
  },
  radius: {
    DEFAULT: { value: '0.625rem', type: 'dimension' },
  },
};

// Radius scale multipliers (× --radius) → Tailwind @theme radius steps.
export const radiusScale = {
  sm: 0.6,
  md: 0.8,
  lg: 1,
  xl: 1.4,
  '2xl': 1.8,
  '3xl': 2.2,
  '4xl': 2.6,
};

// Font family theme vars (passthrough to the runtime --font-sans set in each app layout).
export const fonts = {
  sans: 'var(--font-sans)',
  heading: 'var(--font-sans)',
};
