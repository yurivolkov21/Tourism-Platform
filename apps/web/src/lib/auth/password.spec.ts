import {
  MIN_PASSWORD,
  passwordStrengthTone,
  scorePassword,
  validatePasswordPair,
} from './password';

describe('validatePasswordPair', () => {
  it('accepts a long-enough matching pair', () => {
    expect(validatePasswordPair('secret123', 'secret123')).toBeNull();
  });

  it('rejects a too-short password', () => {
    expect(validatePasswordPair('abc', 'abc')).toBe('TOO_SHORT');
    expect(
      validatePasswordPair(
        'a'.repeat(MIN_PASSWORD - 1),
        'a'.repeat(MIN_PASSWORD - 1),
      ),
    ).toBe('TOO_SHORT');
  });

  it('rejects a mismatch (checked after length)', () => {
    expect(validatePasswordPair('secret123', 'secret124')).toBe('MISMATCH');
  });

  it('reports length before mismatch', () => {
    expect(validatePasswordPair('abc', 'xyz')).toBe('TOO_SHORT');
  });
});

describe('scorePassword', () => {
  it('scores 0 for empty and 5 for a strong password', () => {
    expect(scorePassword('').score).toBe(0);
    expect(scorePassword('Abcdef1!').score).toBe(5);
  });

  it('counts each met requirement', () => {
    const { score, rules } = scorePassword('abcdefgh'); // length + lower
    expect(score).toBe(2);
    expect(rules.find((r) => r.key === 'lower')?.met).toBe(true);
    expect(rules.find((r) => r.key === 'upper')?.met).toBe(false);
  });
});

describe('passwordStrengthTone', () => {
  it('maps scores to token tones', () => {
    expect(passwordStrengthTone(0)).toBe('bg-border');
    expect(passwordStrengthTone(2)).toBe('bg-destructive');
    expect(passwordStrengthTone(3)).toBe('bg-warning');
    expect(passwordStrengthTone(5)).toBe('bg-success');
  });
});
