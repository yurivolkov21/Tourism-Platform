import { parseUuidParam } from './params';

const UUID = '3f2b8c1a-9d4e-4f6a-8b2c-1d5e7f9a0b3c';

describe('parseUuidParam', () => {
  it('passes a valid uuid through (case-insensitive)', () => {
    expect(parseUuidParam(UUID)).toBe(UUID);
    expect(parseUuidParam(UUID.toUpperCase())).toBe(UUID.toUpperCase());
  });

  it('drops missing or malformed values', () => {
    expect(parseUuidParam(undefined)).toBeUndefined();
    expect(parseUuidParam('')).toBeUndefined();
    expect(parseUuidParam('not-a-uuid')).toBeUndefined();
    expect(parseUuidParam('3f2b8c1a-9d4e-4f6a-8b2c')).toBeUndefined();
    expect(parseUuidParam(`${UUID}x`)).toBeUndefined();
  });
});
