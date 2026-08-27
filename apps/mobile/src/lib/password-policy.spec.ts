import {
  MIN_PASSWORD,
  meetsPasswordPolicy,
  passwordStrengthTone,
  scorePassword,
} from './password-policy';

describe('scorePassword', () => {
  it('scores an empty password at zero with every rule unmet', () => {
    const { score, rules } = scorePassword('');
    expect(score).toBe(0);
    expect(rules.every((r) => !r.met)).toBe(true);
  });

  it('reports exactly which rules a partial password meets', () => {
    // 8+ chars and a lowercase letter, nothing else.
    const { score, rules } = scorePassword('abcdefgh');
    expect(score).toBe(2);
    expect(rules.find((r) => r.key === 'length')?.met).toBe(true);
    expect(rules.find((r) => r.key === 'lower')?.met).toBe(true);
    expect(rules.find((r) => r.key === 'upper')?.met).toBe(false);
    expect(rules.find((r) => r.key === 'number')?.met).toBe(false);
    expect(rules.find((r) => r.key === 'special')?.met).toBe(false);
  });

  it('scores a fully compliant password at five', () => {
    expect(scorePassword('Abcdef1!').score).toBe(5);
  });

  it('fails the length rule one character short', () => {
    const rules = scorePassword('Abcde1!').rules;
    expect(rules.find((r) => r.key === 'length')?.met).toBe(false);
  });
});

describe('meetsPasswordPolicy', () => {
  it('accepts a password satisfying every rule', () => {
    expect(meetsPasswordPolicy('Abcdef1!')).toBe(true);
  });

  it.each([
    ['too short', 'Ab1!'],
    ['no uppercase', 'abcdef1!'],
    ['no lowercase', 'ABCDEF1!'],
    ['no number', 'Abcdefg!'],
    ['no special character', 'Abcdefg1'],
  ])('rejects a password with %s', (_case, password) => {
    expect(meetsPasswordPolicy(password)).toBe(false);
  });

  it('treats MIN_PASSWORD as the length boundary', () => {
    expect(meetsPasswordPolicy(`Ab1!${'c'.repeat(MIN_PASSWORD - 5)}`)).toBe(
      false,
    );
    expect(meetsPasswordPolicy(`Ab1!${'c'.repeat(MIN_PASSWORD - 4)}`)).toBe(
      true,
    );
  });
});

describe('passwordStrengthTone', () => {
  it('maps each band to a theme colour token', () => {
    expect(passwordStrengthTone(0)).toBe('border');
    expect(passwordStrengthTone(1)).toBe('destructive');
    expect(passwordStrengthTone(2)).toBe('destructive');
    expect(passwordStrengthTone(3)).toBe('warning');
    expect(passwordStrengthTone(4)).toBe('rating');
    expect(passwordStrengthTone(5)).toBe('success');
  });
});
