import {
  departureSchema,
  toDeparturePayload,
  type DepartureInput,
} from './schema';

const base = { startDate: '2026-08-15', endDate: '2026-08-18', seatsTotal: 15 };

describe('departureSchema', () => {
  it('accepts a minimal valid departure', () => {
    expect(departureSchema.safeParse(base).success).toBe(true);
  });

  it('accepts equal start and end dates', () => {
    expect(
      departureSchema.safeParse({ ...base, endDate: base.startDate }).success,
    ).toBe(true);
  });

  it('rejects endDate before startDate', () => {
    const r = departureSchema.safeParse({ ...base, endDate: '2026-08-10' });
    expect(r.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(
      departureSchema.safeParse({ ...base, startDate: '15/08/2026' }).success,
    ).toBe(false);
  });

  it('coerces a numeric-string seatsTotal', () => {
    const r = departureSchema.safeParse({ ...base, seatsTotal: '20' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.seatsTotal).toBe(20);
  });

  it('rejects seats out of range', () => {
    expect(departureSchema.safeParse({ ...base, seatsTotal: 0 }).success).toBe(
      false,
    );
    expect(
      departureSchema.safeParse({ ...base, seatsTotal: 1001 }).success,
    ).toBe(false);
  });

  it('rejects a negative price override', () => {
    expect(
      departureSchema.safeParse({ ...base, priceOverride: -1 }).success,
    ).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(
      departureSchema.safeParse({ ...base, status: 'PAUSED' }).success,
    ).toBe(false);
  });
});

describe('toDeparturePayload', () => {
  it('sends dates + seats, drops blank optionals', () => {
    const input = departureSchema.parse(base) as DepartureInput;
    expect(toDeparturePayload(input)).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-18',
      seatsTotal: 15,
    });
  });

  it('includes price overrides and status when set', () => {
    const input = departureSchema.parse({
      ...base,
      priceOverride: 59,
      compareAtPrice: 79,
      status: 'CLOSED',
    }) as DepartureInput;
    expect(toDeparturePayload(input)).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-18',
      seatsTotal: 15,
      priceOverride: 59,
      compareAtPrice: 79,
      status: 'CLOSED',
    });
  });
});
