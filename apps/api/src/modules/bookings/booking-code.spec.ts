import { mintBookingCode } from './booking-code';

describe('mintBookingCode', () => {
  const FORMAT = /^BK-[A-Z0-9]{8}$/;

  it('always produces the BK- + 8 base36 format', () => {
    for (let i = 0; i < 2000; i++) {
      expect(mintBookingCode()).toMatch(FORMAT);
    }
  });

  it('is overwhelmingly unique across many draws', () => {
    const draws = 5000;
    const seen = new Set<string>();
    for (let i = 0; i < draws; i++) seen.add(mintBookingCode());
    // Allow a tiny collision margin; in practice this is 0 at 36^8 space.
    expect(seen.size).toBeGreaterThan(draws - 5);
  });
});
