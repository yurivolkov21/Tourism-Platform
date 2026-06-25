import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps a local absolute path', () => {
    expect(safeRedirect('/account')).toBe('/account');
    expect(safeRedirect('/tours?x=1')).toBe('/tours?x=1');
  });

  it('falls back for protocol-relative URLs', () => {
    expect(safeRedirect('//evil.com')).toBe('/');
  });

  it('falls back for absolute external URLs', () => {
    expect(safeRedirect('http://evil.com')).toBe('/');
    expect(safeRedirect('https://evil.com')).toBe('/');
  });

  it('falls back for backslash and control-char tricks', () => {
    expect(safeRedirect('/a\\b')).toBe('/');
    expect(safeRedirect('/a\nb')).toBe('/');
  });

  it('falls back for empty / nullish / non-slash input', () => {
    expect(safeRedirect('')).toBe('/');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect('relative')).toBe('/');
  });

  it('honours a custom fallback (the customer default is /account)', () => {
    expect(safeRedirect(null, '/account')).toBe('/account');
    expect(safeRedirect('//evil.com', '/account')).toBe('/account');
  });
});
