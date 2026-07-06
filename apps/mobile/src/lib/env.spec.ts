import { resolveApiBaseUrl } from './env';

describe('resolveApiBaseUrl', () => {
  it('accepts an https origin and strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('accepts a LAN http origin', () => {
    expect(resolveApiBaseUrl('http://192.168.1.20:3000')).toBe('http://192.168.1.20:3000');
  });

  it('throws a setup-pointing error when missing or malformed', () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
    expect(() => resolveApiBaseUrl('not-a-url')).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });
});
