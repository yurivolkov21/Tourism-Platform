import {
  deriveApiOriginFromHostUri,
  requireHttpOrigin,
  requireValue,
  resolveApiBaseUrl,
} from './env';

describe('requireHttpOrigin', () => {
  it('accepts and trims an https origin', () => {
    expect(requireHttpOrigin('X', ' https://a.co/ ')).toBe('https://a.co');
  });
  it('throws with the var name when missing or malformed', () => {
    expect(() => requireHttpOrigin('EXPO_PUBLIC_WEB_URL', undefined)).toThrow(
      /EXPO_PUBLIC_WEB_URL/,
    );
    expect(() => requireHttpOrigin('X', 'not-a-url')).toThrow(/X/);
  });
});

describe('requireValue', () => {
  it('accepts a non-empty value and throws on blank', () => {
    expect(requireValue('K', ' abc ')).toBe('abc');
    expect(() => requireValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', '  ')).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});

describe('deriveApiOriginFromHostUri', () => {
  it('takes the host Metro is bound to and swaps in the API port', () => {
    expect(deriveApiOriginFromHostUri('192.168.20.48:8081', 3000)).toBe(
      'http://192.168.20.48:3000',
    );
  });

  it('works with just a host, no port', () => {
    expect(deriveApiOriginFromHostUri('192.168.20.48', 3000)).toBe(
      'http://192.168.20.48:3000',
    );
  });

  it('returns undefined for a tunnel/exp.direct host — not a reachable LAN IP', () => {
    expect(
      deriveApiOriginFromHostUri('abc123.anonymous.19000.exp.direct', 3000),
    ).toBeUndefined();
  });

  it('returns undefined when there is no dev server (production build)', () => {
    expect(deriveApiOriginFromHostUri(undefined, 3000)).toBeUndefined();
  });
});

describe('resolveApiBaseUrl', () => {
  it('accepts an https origin and strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    );
  });

  it('accepts a LAN http origin', () => {
    expect(resolveApiBaseUrl('http://192.168.1.20:3000')).toBe(
      'http://192.168.1.20:3000',
    );
  });

  it('throws a setup-pointing error when missing or malformed', () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
    expect(() => resolveApiBaseUrl('not-a-url')).toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });
});
