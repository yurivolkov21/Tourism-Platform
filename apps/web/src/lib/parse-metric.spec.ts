import { parseMetric } from './parse-metric';

describe('parseMetric', () => {
  it('parses a thousands-separated value with a trailing suffix', () => {
    // Arrange
    const input = '12,000+';

    // Act
    const result = parseMetric(input);

    // Assert
    expect(result).toMatchObject({
      prefix: '',
      value: 12000,
      suffix: '+',
      decimals: 0,
      animate: true,
    });
  });

  it('parses a leading currency prefix and a scale suffix', () => {
    const result = parseMetric('$2M');

    expect(result).toMatchObject({
      prefix: '$',
      value: 2,
      suffix: 'M',
      animate: true,
    });
  });

  it('keeps decimal precision', () => {
    const result = parseMetric('4.9');

    expect(result).toMatchObject({ value: 4.9, decimals: 1, animate: true });
  });

  it('parses a percentage', () => {
    const result = parseMetric('98%');

    expect(result).toMatchObject({ value: 98, suffix: '%', animate: true });
  });

  it('falls back to passthrough (no count) when the value is not a clean number', () => {
    const result = parseMetric('24/7');

    expect(result.animate).toBe(false);
    expect(result.raw).toBe('24/7');
  });

  it('passes through pure text', () => {
    const result = parseMetric('Local experts');

    expect(result.animate).toBe(false);
    expect(result.raw).toBe('Local experts');
  });

  it('trims surrounding whitespace', () => {
    const result = parseMetric('  150+  ');

    expect(result).toMatchObject({
      value: 150,
      suffix: '+',
      animate: true,
      raw: '150+',
    });
  });
});
