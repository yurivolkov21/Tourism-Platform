import { isValidNewsletterEmail } from './newsletter-form';

describe('isValidNewsletterEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidNewsletterEmail('jane@example.com')).toBe(true);
  });

  it('accepts surrounding whitespace (normalized server-side)', () => {
    expect(isValidNewsletterEmail('  jane@example.com  ')).toBe(true);
  });

  it('rejects empty, missing @, missing domain dot, and over-long input', () => {
    expect(isValidNewsletterEmail('')).toBe(false);
    expect(isValidNewsletterEmail('jane.example.com')).toBe(false);
    expect(isValidNewsletterEmail('jane@example')).toBe(false);
    expect(isValidNewsletterEmail(`${'a'.repeat(200)}@example.com`)).toBe(
      false,
    );
  });
});
