import { destinationSchema, toDestinationPayload } from './schema';

describe('destinationSchema', () => {
  it('accepts a minimal valid destination', () => {
    const r = destinationSchema.safeParse({ name: 'Hoi An' });
    expect(r.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const r = destinationSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects an over-long name', () => {
    const r = destinationSchema.safeParse({ name: 'x'.repeat(121) });
    expect(r.success).toBe(false);
  });

  it('rejects an over-long slug', () => {
    const r = destinationSchema.safeParse({ name: 'A', slug: 'x'.repeat(81) });
    expect(r.success).toBe(false);
  });

  it('accepts optional fields and a boolean isActive', () => {
    const r = destinationSchema.safeParse({
      name: 'Sa Pa',
      region: 'Northern Vietnam',
      isActive: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('toDestinationPayload', () => {
  it('omits empty optionals and keeps set ones', () => {
    expect(
      toDestinationPayload({
        name: 'Hoi An',
        slug: '',
        region: 'Central Vietnam',
        isActive: true,
      }),
    ).toEqual({ name: 'Hoi An', region: 'Central Vietnam', isActive: true });
  });

  it('keeps name only when nothing else is set', () => {
    expect(toDestinationPayload({ name: 'Hue' })).toEqual({ name: 'Hue' });
  });
});
