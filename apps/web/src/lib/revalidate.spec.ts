import { isValidRevalidateSecret, tourTag } from './revalidate';

describe('tourTag', () => {
  it('builds the per-tour cache tag from a slug', () => {
    expect(tourTag('ha-long-cruise')).toBe('tour:ha-long-cruise');
  });
});

describe('isValidRevalidateSecret', () => {
  it('rejects when the provided secret is empty', () => {
    expect(isValidRevalidateSecret('', 'expected')).toBe(false);
  });

  it('rejects when the expected secret is empty (server unconfigured)', () => {
    expect(isValidRevalidateSecret('provided', '')).toBe(false);
  });

  it('rejects when both are empty', () => {
    expect(isValidRevalidateSecret('', '')).toBe(false);
  });

  it('rejects a length mismatch', () => {
    expect(isValidRevalidateSecret('ab', 'abc')).toBe(false);
  });

  it('rejects a one-character difference', () => {
    expect(isValidRevalidateSecret('abd', 'abc')).toBe(false);
  });

  it('rejects null/undefined provided values', () => {
    expect(isValidRevalidateSecret(null, 'abc')).toBe(false);
    expect(isValidRevalidateSecret(undefined, 'abc')).toBe(false);
  });

  it('accepts an exact match', () => {
    expect(isValidRevalidateSecret('s3cr3t-value', 's3cr3t-value')).toBe(true);
  });
});
