import { Prisma } from '@prisma/client';
import { toStripeMinorUnits } from './money';

const D = (v: string) => new Prisma.Decimal(v);

describe('toStripeMinorUnits', () => {
  it('multiplies two-decimal currencies by 100', () => {
    expect(toStripeMinorUnits(D('49.50'), 'USD')).toBe(4950);
    expect(toStripeMinorUnits(D('100.00'), 'usd')).toBe(10000);
    expect(toStripeMinorUnits(D('0.99'), 'EUR')).toBe(99);
  });

  it('passes zero-decimal currencies through as whole units', () => {
    expect(toStripeMinorUnits(D('5000'), 'JPY')).toBe(5000);
    expect(toStripeMinorUnits(D('250000'), 'vnd')).toBe(250000);
    expect(toStripeMinorUnits(D('1200'), 'KRW')).toBe(1200);
  });

  it('rounds to the nearest minor unit', () => {
    expect(toStripeMinorUnits(D('49.999'), 'USD')).toBe(5000);
  });
});
