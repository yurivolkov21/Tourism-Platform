import { buildTheme } from './theme';

describe('buildTheme', () => {
  it('exposes hex token colors per scheme', () => {
    const light = buildTheme('light');
    const dark = buildTheme('dark');
    expect(light.colors['background']).toMatch(/^#[0-9a-f]{6,8}$/);
    expect(dark.colors['background']).toMatch(/^#[0-9a-f]{6,8}$/);
    expect(light.colors['background']).not.toBe(dark.colors['background']);
  });

  it('derives the radius scale from the base dp', () => {
    const { radius } = buildTheme('light');
    expect(radius.md).toBe(6);
    expect(radius.sm).toBe(3);
    expect(radius.lg).toBe(9);
    expect(radius.xl).toBe(12);
  });

  it('spaces on a 4dp grid', () => {
    expect(buildTheme('light').spacing(4)).toBe(16);
  });
});
