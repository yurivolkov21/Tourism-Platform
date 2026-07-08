import { computeBookingTotal } from './price';

test('adults only', () => {
  expect(computeBookingTotal(120, 2)).toEqual({
    total: 240,
    lines: [{ kind: 'adult', unitPrice: 120, quantity: 2, subtotal: 240 }],
  });
});

test('adults + children at the same unit price by default', () => {
  const { total, lines } = computeBookingTotal(100, 2, 1);
  expect(total).toBe(300);
  expect(lines).toHaveLength(2);
  expect(lines[1]).toEqual({ kind: 'child', unitPrice: 100, quantity: 1, subtotal: 100 });
});

test('rounds money half-up to 2 decimals', () => {
  const { total } = computeBookingTotal(33.335, 3);
  expect(total).toBe(100.01);
});

test('child ratio prices children differently', () => {
  const { lines } = computeBookingTotal(100, 1, 2, 0.5);
  expect(lines[1]).toEqual({ kind: 'child', unitPrice: 50, quantity: 2, subtotal: 100 });
});

test('invalid or negative counts collapse to 0', () => {
  expect(computeBookingTotal(100, -2, Number.NaN)).toEqual({ total: 0, lines: [] });
});

test('fractional counts floor', () => {
  expect(computeBookingTotal(100, 2.9).total).toBe(200);
});
