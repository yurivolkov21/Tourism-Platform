import { MIN_PASSWORD, validatePasswordPair } from './password';

describe('validatePasswordPair', () => {
  it('accepts a long-enough matching pair', () => {
    expect(validatePasswordPair('secret123', 'secret123')).toBeNull();
  });

  it('rejects a too-short password', () => {
    expect(validatePasswordPair('abc', 'abc')).toBe('TOO_SHORT');
    expect(validatePasswordPair('a'.repeat(MIN_PASSWORD - 1), 'a'.repeat(MIN_PASSWORD - 1))).toBe(
      'TOO_SHORT',
    );
  });

  it('rejects a mismatch (checked after length)', () => {
    expect(validatePasswordPair('secret123', 'secret124')).toBe('MISMATCH');
  });

  it('reports length before mismatch', () => {
    expect(validatePasswordPair('abc', 'xyz')).toBe('TOO_SHORT');
  });
});
