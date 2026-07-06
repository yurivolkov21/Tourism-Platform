import { resolveFlash, flashPath } from './flash';

describe('resolveFlash', () => {
  it('maps a known key to its message', () => {
    expect(resolveFlash('account-deleted')).toEqual({
      type: 'success',
      text: 'Your account has been deleted.',
    });
  });
  it('returns null for an unknown or empty key', () => {
    expect(resolveFlash('nope')).toBeNull();
    expect(resolveFlash(null)).toBeNull();
    expect(resolveFlash(undefined)).toBeNull();
    expect(resolveFlash('')).toBeNull();
  });
});

describe('flashPath', () => {
  it('appends the flash key to a bare path', () => {
    expect(flashPath('/', 'account-deleted')).toBe('/?flash=account-deleted');
  });
  it('preserves an existing query string', () => {
    expect(flashPath('/account?tab=security', 'account-deleted')).toBe(
      '/account?tab=security&flash=account-deleted',
    );
  });
});
