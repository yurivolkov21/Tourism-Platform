import { categorySchema, toCategoryPayload } from './schema';

describe('categorySchema', () => {
  it('accepts a minimal valid category', () => {
    const r = categorySchema.safeParse({ name: 'Adventure Tours' });
    expect(r.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const r = categorySchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects an over-long name', () => {
    const r = categorySchema.safeParse({ name: 'x'.repeat(121) });
    expect(r.success).toBe(false);
  });

  it('rejects an over-long slug', () => {
    const r = categorySchema.safeParse({ name: 'A', slug: 'x'.repeat(61) });
    expect(r.success).toBe(false);
  });

  it('rejects a negative order', () => {
    const r = categorySchema.safeParse({ name: 'A', order: -1 });
    expect(r.success).toBe(false);
  });

  it('rejects a non-integer order', () => {
    const r = categorySchema.safeParse({ name: 'A', order: 1.5 });
    expect(r.success).toBe(false);
  });

  it('coerces a numeric-string order', () => {
    const r = categorySchema.safeParse({ name: 'A', order: '3' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.order).toBe(3);
  });

  it('accepts order 0 and a boolean isActive', () => {
    const r = categorySchema.safeParse({
      name: 'Day Tours',
      order: 0,
      isActive: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('toCategoryPayload', () => {
  it('omits empty optionals and keeps set ones', () => {
    expect(
      toCategoryPayload({
        name: 'Adventure',
        slug: '',
        description: 'Thrills',
        order: 2,
        isActive: true,
      }),
    ).toEqual({
      name: 'Adventure',
      description: 'Thrills',
      order: 2,
      isActive: true,
    });
  });

  it('keeps order 0 (a valid explicit value)', () => {
    expect(toCategoryPayload({ name: 'Day Tours', order: 0 })).toEqual({
      name: 'Day Tours',
      order: 0,
    });
  });

  it('keeps name only when nothing else is set', () => {
    expect(toCategoryPayload({ name: 'Cruises' })).toEqual({ name: 'Cruises' });
  });
});
