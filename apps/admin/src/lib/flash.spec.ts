import { flashPath, resolveFlash } from './flash';

describe('resolveFlash', () => {
  test('maps known keys to a typed message', () => {
    expect(resolveFlash('created')).toEqual({ type: 'success', text: 'Created successfully.' });
    expect(resolveFlash('updated')).toEqual({ type: 'success', text: 'Changes saved.' });
  });

  test('null / undefined / unknown → null', () => {
    expect(resolveFlash(null)).toBeNull();
    expect(resolveFlash(undefined)).toBeNull();
    expect(resolveFlash('nope')).toBeNull();
  });
});

describe('flashPath', () => {
  test('appends flash to a bare path', () => {
    expect(flashPath('/tours', 'created')).toBe('/tours?flash=created');
  });

  test('preserves an existing query string', () => {
    expect(flashPath('/tours?status=draft', 'updated')).toBe('/tours?status=draft&flash=updated');
  });
});
