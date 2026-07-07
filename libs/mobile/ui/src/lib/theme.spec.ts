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

  it('maps typography variants to the brand font families', () => {
    const { typography, fontFamilies } = buildTheme('light');
    expect(typography.display.fontFamily).toBe('Fraunces_700Bold');
    expect(typography.title.fontFamily).toBe('Fraunces_600SemiBold');
    expect(typography.body.fontFamily).toBe('Geist_400Regular');
    expect(typography.caption.fontFamily).toBe('Geist_500Medium');
    expect(fontFamilies.sansSemiBold).toBe('Geist_600SemiBold');
  });
});
