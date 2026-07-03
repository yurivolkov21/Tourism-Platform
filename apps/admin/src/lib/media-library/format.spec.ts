import { formatBytes, ownerHref } from './format';

describe('formatBytes', () => {
  it('formats byte counts human-readably', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(245000)).toBe('239.3 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('returns null when bytes is missing', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(undefined)).toBeNull();
  });
});

describe('ownerHref', () => {
  it('maps content owners to their admin detail routes', () => {
    expect(ownerHref('TOUR', 'hoi-an')).toBe('/tours/hoi-an');
    expect(ownerHref('DESTINATION', 'da-nang')).toBe('/destinations/da-nang');
    expect(ownerHref('POST', 'travel-tips')).toBe('/posts/travel-tips');
  });

  it('returns null for USER owners and missing slugs', () => {
    expect(ownerHref('USER', null)).toBeNull();
    expect(ownerHref('TOUR', null)).toBeNull();
    expect(ownerHref('UNKNOWN', 'x')).toBeNull();
  });
});
