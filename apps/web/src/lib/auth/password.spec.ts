import {
  meetsPasswordPolicy,
  passwordStrengthTone,
  scorePassword,
  validatePasswordPair,
} from './password';

describe('meetsPasswordPolicy', () => {
  it('requires length + all four character classes', () => {
    expect(meetsPasswordPolicy('Abcdef1!')).toBe(true);
    expect(meetsPasswordPolicy('abcdef1!')).toBe(false); // no uppercase
    expect(meetsPasswordPolicy('Abcdefg!')).toBe(false); // no number
    expect(meetsPasswordPolicy('Abcdef12')).toBe(false); // no symbol
    expect(meetsPasswordPolicy('Ab1!')).toBe(false); // too short
    expect(meetsPasswordPolicy('secret123')).toBe(false); // no upper/symbol
  });
});

describe('validatePasswordPair', () => {
  it('accepts a policy-compliant matching pair', () => {
    expect(validatePasswordPair('Abcdef1!', 'Abcdef1!')).toBeNull();
  });

  it('rejects a password that does not meet the policy', () => {
    expect(validatePasswordPair('abc', 'abc')).toBe('WEAK');
    expect(validatePasswordPair('secret123', 'secret123')).toBe('WEAK');
  });

  it('rejects a mismatch (checked after the policy)', () => {
    expect(validatePasswordPair('Abcdef1!', 'Abcdef2@')).toBe('MISMATCH');
  });

  it('reports WEAK before mismatch', () => {
    expect(validatePasswordPair('abc', 'xyz')).toBe('WEAK');
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
