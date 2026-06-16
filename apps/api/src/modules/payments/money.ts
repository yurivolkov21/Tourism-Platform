import { Prisma } from '@prisma/client';

/**
 * ISO-4217 zero-decimal currencies (Stripe's list) — these have no minor unit,
 * so the amount is passed as-is rather than ×100. Includes VND (our likely VN
 * pricing currency) and JPY/KRW etc. (ADR-0008 `toProviderAmount`, R1).
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG',
  'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Converts a `Decimal` money amount into the smallest unit a payment provider
 * expects (cents for USD; whole units for zero-decimal currencies). Rounds
 * half-up; our amounts cap at `Decimal(12,2)` so there is no float drift here.
 */
export function toStripeMinorUnits(
  amount: Prisma.Decimal,
  currency: string,
): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  const scaled = isZeroDecimal ? amount : amount.mul(100);
  return Math.round(scaled.toNumber());
}
