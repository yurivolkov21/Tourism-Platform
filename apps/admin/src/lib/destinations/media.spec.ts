import { parseMediaField, assembleMediaSet, cloudinaryUrl, type MediaInput } from './media';

test('parseMediaField keeps valid items, ≤1 hero, ≤9 gallery', () => {
  const gallery = Array.from({ length: 12 }, (_, i) => ({ publicId: `g${i}`, role: 'gallery' }));
  const json = JSON.stringify([
    { publicId: 'h1', role: 'hero' },
    { publicId: 'h2', role: 'hero' },
    ...gallery,
    { role: 'gallery' }, // malformed (no publicId) → dropped
  ]);
  const out = parseMediaField(json);
  expect(out.filter((m) => m.role === 'hero')).toHaveLength(1);
  expect(out.filter((m) => m.role === 'gallery')).toHaveLength(9);
});

test('parseMediaField tolerates junk', () => {
  expect(parseMediaField('')).toEqual([]);
  expect(parseMediaField('not json')).toEqual([]);
  expect(parseMediaField('{}')).toEqual([]);
});

test('assembleMediaSet emits hero first then ordered gallery', () => {
  const items: MediaInput[] = [
    { publicId: 'g1', role: 'gallery' },
    { publicId: 'h1', role: 'hero', format: 'jpg', width: 1920, height: 1080 },
    { publicId: 'g2', role: 'gallery' },
  ];
  const set = assembleMediaSet(items);
  expect(set.map((m) => m.publicId)).toEqual(['h1', 'g1', 'g2']);
  expect(set.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
  expect(set[0]).toMatchObject({ type: 'IMAGE', role: 'hero', format: 'jpg' });
});

test('cloudinaryUrl builds a delivery URL', () => {
  expect(cloudinaryUrl('demo', 'tourism/destinations/hero/123-x', 'jpg')).toBe(
    'https://res.cloudinary.com/demo/image/upload/tourism/destinations/hero/123-x.jpg',
  );
  expect(cloudinaryUrl('demo', 'p')).toBe('https://res.cloudinary.com/demo/image/upload/p');
});
