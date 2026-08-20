import { resolveScheme } from './appearance';

test('system follows the OS, and an unknown OS value falls back to dark', () => {
  expect(resolveScheme('system', 'light')).toBe('light');
  expect(resolveScheme('system', 'dark')).toBe('dark');
  // The app is dark-first: no OS answer yet ⇒ dark, never a white flash.
  expect(resolveScheme('system', null)).toBe('dark');
});

test('an explicit choice wins over the OS setting', () => {
  expect(resolveScheme('light', 'dark')).toBe('light');
  expect(resolveScheme('dark', 'light')).toBe('dark');
});
