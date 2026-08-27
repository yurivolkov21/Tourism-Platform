import { theme } from '../../generated/theme.js';

/**
 * Every filled surface must be legible in every scheme.
 *
 * Four separate bugs came from the same mistake, each found only by eye on a
 * device: a fill and its ink that do not flip together. `destructive` filled a
 * button while the label kept `primary-foreground` (1.86:1, "Yes, sign out");
 * the brass `rating` badge read the scheme's `foreground`, which IS scheme-
 * dependent, so dark put cream on brass (1.58:1, the "Popular" chip); the
 * snackbar filled with `foreground` but accented with the never-flipping
 * `primary` (1.89:1). Reviewing colours by looking at them clearly does not
 * catch this, so the palette is measured instead.
 *
 * WCAG 2.2 AA for normal text. Badge labels are 11px, i.e. normal text — the
 * 3:1 large-text allowance does not apply to them.
 */
const AA_NORMAL = 4.5;

/** Pairs the components actually render together: `fill` behind `ink`. */
const PAIRS: readonly (readonly [string, string])[] = [
  ['background', 'foreground'],
  ['card', 'card-foreground'],
  ['popover', 'popover-foreground'],
  ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'],
  ['accent', 'accent-foreground'],
  ['muted', 'muted-foreground'],
  ['destructive', 'destructive-foreground'],
  ['success', 'success-foreground'],
  ['warning', 'warning-foreground'],
  ['info', 'info-foreground'],
  ['rating', 'rating-foreground'],
  ['sidebar', 'sidebar-foreground'],
  // Inverted surfaces (the snackbar): the fill IS the scheme's ink colour.
  ['foreground', 'background'],
  ['foreground', 'inverse-primary'],
];

/**
 * Known gaps in the WEB light palette — filled `success`/`info` chips do not
 * clear AA there. Left as-is deliberately: no surface currently fills with
 * them on the web (it tints instead), and moving them would shift the web
 * brand. Listed rather than skipped so the debt stays visible; delete an entry
 * once its pair is fixed, and the test will hold it there.
 */
const KNOWN_SUB_AA: Record<string, readonly string[]> = {
  light: ['success/success-foreground', 'info/info-foreground'],
};

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

test('the ratio maths matches the WCAG reference points', () => {
  // Anchors, so a broken formula cannot quietly pass every palette below.
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
});

describe.each(['light', 'dark', 'mobileLight'] as const)(
  '%s palette',
  (scheme) => {
    const colors = theme.colors[scheme];
    const known = KNOWN_SUB_AA[scheme] ?? [];

    test.each(PAIRS)('%s / %s clears AA for normal text', (fill, ink) => {
      // Both halves must EXIST — a typo'd token name reads as undefined and
      // would otherwise throw somewhere far from here.
      expect(typeof colors[fill]).toBe('string');
      expect(typeof colors[ink]).toBe('string');
      const ratio = contrastRatio(colors[fill], colors[ink]);
      if (known.includes(`${fill}/${ink}`)) {
        // Documented debt: assert it has not got WORSE, not that it passes.
        expect(ratio).toBeGreaterThanOrEqual(3);
        return;
      }
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  },
);

test('an ink for a fill that never flips must not flip either', () => {
  // `rating` is brass in every scheme, so a scheme-dependent ink is a bug by
  // construction — this is what made the dark "Popular" chip unreadable.
  expect(theme.colors.dark['rating-foreground']).toBe(
    theme.colors.light['rating-foreground'],
  );
  expect(theme.colors.mobileLight['rating-foreground']).toBe(
    theme.colors.light['rating-foreground'],
  );
});
