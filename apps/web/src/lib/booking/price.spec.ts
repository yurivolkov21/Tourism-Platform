import { computeBookingTotal } from './price';

describe('computeBookingTotal', () => {
  it('totals adults only when there are no children', () => {
    const result = computeBookingTotal(150, 2);

    expect(result.total).toBe(300);
    expect(result.lines).toEqual([
      { kind: 'adult', unitPrice: 150, quantity: 2, subtotal: 300 },
    ]);
  });

  it('adds a child line at the same unit price by default', () => {
    const result = computeBookingTotal(150, 2, 1);

    expect(result.total).toBe(450);
    expect(result.lines).toEqual([
      { kind: 'adult', unitPrice: 150, quantity: 2, subtotal: 300 },
      { kind: 'child', unitPrice: 150, quantity: 1, subtotal: 150 },
    ]);
  });

  it('applies a child price ratio and rounds to 2 decimals', () => {
    const result = computeBookingTotal(149, 1, 2, 0.5);

    // child unit = round(149 * 0.5) = 74.50
    expect(result.lines[1]).toEqual({
      kind: 'child',
      unitPrice: 74.5,
      quantity: 2,
      subtotal: 149,
    });
    expect(result.total).toBe(298);
  });

  it('omits the child line when numChildren is 0', () => {
    const result = computeBookingTotal(99, 3, 0);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].kind).toBe('adult');
  });

  it('clamps negative party sizes to 0', () => {
    const result = computeBookingTotal(100, -2, -1);

    expect(result.total).toBe(0);
    expect(result.lines).toEqual([]);
  });
});
