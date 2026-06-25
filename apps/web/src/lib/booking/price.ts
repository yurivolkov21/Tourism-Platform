/**
 * Pure price helper for the booking summary. The API is the source of truth for
 * the real charge (it re-computes `totalAmount` from the departure price); this
 * only renders a transparent client-side estimate + per-line breakdown.
 *
 * Children default to the same unit price as adults (`childPriceRatio = 1`);
 * pass a ratio when a departure/tour prices children differently. Money is
 * rounded to 2 decimals to avoid floating-point artefacts in the UI.
 */

export type LineKind = 'adult' | 'child';

export interface PriceLine {
  kind: LineKind;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface BookingTotal {
  total: number;
  lines: PriceLine[];
}

/** Round a money amount to 2 decimals (half-up). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Coerce a count to a non-negative integer (invalid/negative → 0). */
function asCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function computeBookingTotal(
  departurePrice: number,
  numAdults: number,
  numChildren = 0,
  childPriceRatio = 1,
): BookingTotal {
  const adults = asCount(numAdults);
  const children = asCount(numChildren);
  const childUnit = round2(departurePrice * childPriceRatio);

  const lines: PriceLine[] = [];
  if (adults > 0) {
    lines.push({
      kind: 'adult',
      unitPrice: departurePrice,
      quantity: adults,
      subtotal: round2(departurePrice * adults),
    });
  }
  if (children > 0) {
    lines.push({
      kind: 'child',
      unitPrice: childUnit,
      quantity: children,
      subtotal: round2(childUnit * children),
    });
  }

  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
  return { total, lines };
}
