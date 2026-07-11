import { assembleMediaSet, canAddToSet, parseMediaField } from './media';

describe('alt round-trip', () => {
  test('parseMediaField keeps a valid alt string', () => {
    const json = JSON.stringify([
      { publicId: 'h1', role: 'hero', alt: 'Lantern-lit old town' },
    ]);
    const [item] = parseMediaField(json);
    expect(item.alt).toBe('Lantern-lit old town');
  });

  test('parseMediaField keeps an explicit null alt (clear signal)', () => {
    const json = JSON.stringify([{ publicId: 'h1', role: 'hero', alt: null }]);
    const [item] = parseMediaField(json);
    expect(item.alt).toBeNull();
  });

  test('parseMediaField drops alt when absent (undefined = preserve stored)', () => {
    const json = JSON.stringify([{ publicId: 'h1', role: 'hero' }]);
    const [item] = parseMediaField(json);
    expect('alt' in item).toBe(false);
  });

  test('parseMediaField drops an over-length alt string', () => {
    const json = JSON.stringify([
      { publicId: 'h1', role: 'hero', alt: 'x'.repeat(301) },
    ]);
    const [item] = parseMediaField(json);
    expect('alt' in item).toBe(false);
  });

  test('parseMediaField drops a non-string, non-null alt', () => {
    const json = JSON.stringify([{ publicId: 'h1', role: 'hero', alt: 42 }]);
    const [item] = parseMediaField(json);
    expect('alt' in item).toBe(false);
  });

  test('assembleMediaSet includes alt when the item carries a string value', () => {
    const [payload] = assembleMediaSet([
      { publicId: 'h1', role: 'hero', alt: 'Old town at dusk' },
    ]);
    expect(payload.alt).toBe('Old town at dusk');
  });

  test('assembleMediaSet includes alt: null when the item explicitly clears it', () => {
    const [payload] = assembleMediaSet([
      { publicId: 'h1', role: 'hero', alt: null },
    ]);
    expect(payload.alt).toBeNull();
  });

  test('assembleMediaSet omits alt entirely when the item does not carry it (preserve stored)', () => {
    const [payload] = assembleMediaSet([{ publicId: 'h1', role: 'hero' }]);
    expect('alt' in payload).toBe(false);
  });
});

describe('canAddToSet', () => {
  test('true when the candidate publicId is not already in the set', () => {
    expect(
      canAddToSet([{ publicId: 'a' }, { publicId: 'b' }], { publicId: 'c' }),
    ).toBe(true);
  });

  test('false when the candidate publicId is already present (compound-unique guard)', () => {
    expect(
      canAddToSet([{ publicId: 'a' }, { publicId: 'b' }], { publicId: 'b' }),
    ).toBe(false);
  });

  test('true for an empty set', () => {
    expect(canAddToSet([], { publicId: 'a' })).toBe(true);
  });
});
