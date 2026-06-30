import { slugify } from './slugify';

test('strips Vietnamese diacritics and kebab-cases', () => {
  expect(slugify('Hội An')).toBe('hoi-an');
  expect(slugify('Đà Nẵng')).toBe('da-nang');
  expect(slugify('Hạ Long Bay')).toBe('ha-long-bay');
  expect(slugify('Ninh Bình')).toBe('ninh-binh');
});

test('lowercases, collapses separators, trims hyphens', () => {
  expect(slugify('Hoi An')).toBe('hoi-an');
  expect(slugify('  Hoi   An  ')).toBe('hoi-an');
  expect(slugify('Hoi-An')).toBe('hoi-an');
  expect(slugify('Phú Quốc!!!')).toBe('phu-quoc');
});

test('handles empty / non-alphanumeric input', () => {
  expect(slugify('')).toBe('');
  expect(slugify('   ')).toBe('');
  expect(slugify('— / —')).toBe('');
});
