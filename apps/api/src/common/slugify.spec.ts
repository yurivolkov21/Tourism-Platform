import { slugify } from './slugify';

describe('slugify', () => {
  it('kebab-cases and strips Vietnamese diacritics', () => {
    expect(slugify('Hội An 2024')).toBe('hoi-an-2024');
    expect(slugify('ĐÀ NẴNG / Huế')).toBe('da-nang-hue');
  });

  it('returns empty string for symbol-only input', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('collapses runs and trims leading/trailing hyphens', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world');
  });
});
