import { readProviders } from './providers';

test('reads a providers array off app_metadata', () => {
  expect(readProviders({ providers: ['google', 'email'] })).toEqual([
    'google',
    'email',
  ]);
});

test('falls back to the singular provider field', () => {
  expect(readProviders({ provider: 'google' })).toEqual(['google']);
});

test('filters out non-string entries from a malformed providers array', () => {
  expect(readProviders({ providers: ['google', 42, null] })).toEqual([
    'google',
  ]);
});

test('returns an empty list when neither field is present', () => {
  expect(readProviders({})).toEqual([]);
  expect(readProviders(undefined)).toEqual([]);
});
