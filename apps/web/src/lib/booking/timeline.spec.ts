import { buildBookingTimeline, type TimelineInput } from './timeline';

/** Minimal booking shape the timeline reads; overridable per test. */
function make(overrides: Partial<TimelineInput> = {}): TimelineInput {
  return {
    status: 'PAID',
    createdAt: '2026-08-01T09:00:00.000Z',
    departure: { startDate: '2026-09-14', endDate: '2026-09-16' },
    ...overrides,
  };
}

const at = (day: string) => new Date(`${day}T12:00:00.000Z`);

describe('buildBookingTimeline', () => {
  it('marks payment as the current step while the booking is PENDING', () => {
    const steps = buildBookingTimeline(
      make({ status: 'PENDING' }),
      at('2026-08-02'),
    );
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['booked', 'done'],
      ['paid', 'current'],
      ['departure', 'upcoming'],
      ['completed', 'upcoming'],
    ]);
  });

  it('marks departure as the current step once PAID and before the start date', () => {
    const steps = buildBookingTimeline(make(), at('2026-08-02'));
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['booked', 'done'],
      ['paid', 'done'],
      ['departure', 'current'],
      ['completed', 'upcoming'],
    ]);
  });

  it('treats the start date itself as the trip being under way', () => {
    const steps = buildBookingTimeline(make(), at('2026-09-14'));
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['booked', 'done'],
      ['paid', 'done'],
      ['departure', 'done'],
      ['completed', 'current'],
    ]);
  });

  it('treats the end date itself as still under way, not completed', () => {
    const steps = buildBookingTimeline(make(), at('2026-09-16'));
    expect(steps.at(-1)).toMatchObject({ key: 'completed', state: 'current' });
  });

  it('completes every step once the end date has passed', () => {
    const steps = buildBookingTimeline(make(), at('2026-09-17'));
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('stops at a cancelled step and never claims a payment it cannot see', () => {
    // A CANCELLED booking may have been self-cancelled while PENDING — the status alone
    // does not prove a payment happened, so no `paid` step is emitted.
    const steps = buildBookingTimeline(
      make({ status: 'CANCELLED' }),
      at('2026-08-02'),
    );
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['booked', 'done'],
      ['cancelled', 'stopped'],
    ]);
  });

  it('keeps the paid step for a refund — a refund proves the payment landed', () => {
    const steps = buildBookingTimeline(
      make({ status: 'REFUNDED' }),
      at('2026-08-02'),
    );
    expect(steps.map((s) => [s.key, s.state])).toEqual([
      ['booked', 'done'],
      ['paid', 'done'],
      ['refunded', 'stopped'],
    ]);
  });

  it('treats a partial refund the same as a refund', () => {
    const steps = buildBookingTimeline(
      make({ status: 'PARTIALLY_REFUNDED' }),
      at('2026-08-02'),
    );
    expect(steps.at(-1)).toMatchObject({ key: 'refunded', state: 'stopped' });
  });

  it('never renders upcoming steps after a terminal status', () => {
    for (const status of ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']) {
      const steps = buildBookingTimeline(make({ status }), at('2026-08-02'));
      expect(steps.some((s) => s.state === 'upcoming')).toBe(false);
    }
  });

  // The API documents these as `format: date` but sends serialised Prisma `Date`s — a raw string
  // compare against those would hide the departure day itself.
  it('accepts the full ISO datetimes the API actually sends', () => {
    const iso = make({
      departure: {
        startDate: '2026-09-14T00:00:00.000Z',
        endDate: '2026-09-16T00:00:00.000Z',
      },
    });
    expect(
      buildBookingTimeline(iso, at('2026-08-02')).map((s) => s.state),
    ).toEqual(['done', 'done', 'current', 'upcoming']);
    expect(
      buildBookingTimeline(iso, at('2026-09-14')).map((s) => s.state),
    ).toEqual(['done', 'done', 'done', 'current']);
    expect(
      buildBookingTimeline(iso, at('2026-09-17')).every(
        (s) => s.state === 'done',
      ),
    ).toBe(true);
  });

  it('carries the date behind each dated step', () => {
    const steps = buildBookingTimeline(make(), at('2026-08-02'));
    expect(steps[0].date).toBe('2026-08-01T09:00:00.000Z');
    expect(steps[2].date).toBe('2026-09-14');
    expect(steps[3].date).toBe('2026-09-16');
    // The paid step has no timestamp of its own on the DTO — omitted, never faked.
    expect(steps[1].date).toBeUndefined();
  });

  it('falls back to a live clock when no `now` is passed', () => {
    expect(() => buildBookingTimeline(make())).not.toThrow();
  });
});
