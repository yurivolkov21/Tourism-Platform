import { readGoogleAvatarUrl, readProviders } from './providers';

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

test('readGoogleAvatarUrl reads avatar_url off user_metadata', () => {
  expect(
    readGoogleAvatarUrl({ avatar_url: 'https://lh3.google/pic.jpg' }),
  ).toBe('https://lh3.google/pic.jpg');
});

test('readGoogleAvatarUrl falls back to the picture field', () => {
  expect(readGoogleAvatarUrl({ picture: 'https://lh3.google/pic.jpg' })).toBe(
    'https://lh3.google/pic.jpg',
  );
});

test('readGoogleAvatarUrl returns null when neither field is present', () => {
  expect(readGoogleAvatarUrl({})).toBeNull();
  expect(readGoogleAvatarUrl(undefined)).toBeNull();
});
