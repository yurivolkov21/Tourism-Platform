import { theme } from '../../generated/theme.js';

/**
 * The RN-only `mobileLight` scheme (Navel cream/brass) must be a COMPLETE
 * palette, not a partial patch over the web's ivory/emerald light values.
 * Only tokens whose SURFACE is scheme-independent may be shared — a photo scrim
 * is dark in every scheme, and `rating` is brass in every scheme, so an ink for
 * it that changed per scheme would be wrong in one of them by construction (see
 * contrast.spec.ts). Anything else that matches the web value is an unfinished
 * token: add a third argument to its `c(...)` call in
 * style-dictionary/tokens.mjs.
 */
const SHARED_WITH_WEB_LIGHT = [
  'on-media',
  'overlay',
  'scrim',
  'media-tint',
  'rating-foreground',
];

test('mobileLight covers every token the other schemes define', () => {
  expect(Object.keys(theme.colors.mobileLight).sort()).toEqual(
    Object.keys(theme.colors.light).sort(),
  );
});

test('only the media tokens are inherited from the web light palette', () => {
  const inherited = Object.keys(theme.colors.light).filter(
    (key) => theme.colors.light[key] === theme.colors.mobileLight[key],
  );
  expect(inherited.sort()).toEqual([...SHARED_WITH_WEB_LIGHT].sort());
});

test('the brass CTA does not flip hue between the mobile schemes', () => {
  // The whole point of the separate palette: `primary` reads brass in both,
  // instead of emerald in light and brass in dark.
  expect(theme.colors.mobileLight['primary']).toBe('#e3a75a');
  expect(theme.colors.dark['primary']).toBe('#d2a657');
});
