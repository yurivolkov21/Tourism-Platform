import {
  isoToLocalDatetimeInput,
  localDatetimeToIso,
  parseJsonStringArray,
  postSchema,
  toPostPayload,
  type PostInput,
} from './schema';

const base = {
  title: 'Three perfect days in Hoi An',
  content: '## Day 1\nWalk the old town.',
};

describe('postSchema', () => {
  it('accepts a minimal valid post', () => {
    expect(postSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(postSchema.safeParse({ ...base, title: '' }).success).toBe(false);
  });

  it('rejects empty content', () => {
    expect(postSchema.safeParse({ ...base, content: '' }).success).toBe(false);
  });

  it('rejects an over-long slug', () => {
    expect(
      postSchema.safeParse({ ...base, slug: 'x'.repeat(81) }).success,
    ).toBe(false);
  });

  it('rejects an over-long excerpt', () => {
    expect(
      postSchema.safeParse({ ...base, excerpt: 'x'.repeat(301) }).success,
    ).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(postSchema.safeParse({ ...base, status: 'ARCHIVED' }).success).toBe(
      false,
    );
  });

  it('accepts a valid status', () => {
    expect(postSchema.safeParse({ ...base, status: 'PUBLISHED' }).success).toBe(
      true,
    );
  });
});

describe('postSchema — SEO + schedule fields', () => {
  it('accepts metaTitle up to 70 chars, rejects 71', () => {
    expect(
      postSchema.safeParse({ ...base, metaTitle: 'x'.repeat(70) }).success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ ...base, metaTitle: 'x'.repeat(71) }).success,
    ).toBe(false);
  });

  it('accepts metaDescription up to 160 chars, rejects 161', () => {
    expect(
      postSchema.safeParse({ ...base, metaDescription: 'x'.repeat(160) })
        .success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ ...base, metaDescription: 'x'.repeat(161) })
        .success,
    ).toBe(false);
  });

  it('accepts a blank or valid datetime-local publishedAt, rejects garbage', () => {
    expect(postSchema.safeParse({ ...base, publishedAt: '' }).success).toBe(
      true,
    );
    expect(
      postSchema.safeParse({ ...base, publishedAt: '2026-08-01T09:00' })
        .success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ ...base, publishedAt: 'not-a-date' }).success,
    ).toBe(false);
  });
});

describe('toPostPayload', () => {
  it('keeps title + content, drops empty optionals', () => {
    const input = postSchema.parse({
      ...base,
      slug: '',
      excerpt: '',
    }) as PostInput;
    expect(toPostPayload(input)).toEqual({
      title: base.title,
      content: base.content,
    });
  });

  it('includes slug, excerpt, and status when set', () => {
    const input = postSchema.parse({
      ...base,
      slug: 'hoi-an',
      excerpt: 'A short stroll',
      status: 'PUBLISHED',
    }) as PostInput;
    expect(toPostPayload(input)).toEqual({
      title: base.title,
      content: base.content,
      slug: 'hoi-an',
      excerpt: 'A short stroll',
      status: 'PUBLISHED',
    });
  });
});

describe('tags + related tours fields', () => {
  it('accepts arrays within caps and forwards them in the payload', () => {
    const parsed = postSchema.safeParse({
      title: 'T',
      content: 'c',
      tags: ['Hạ Long', 'Cruises'],
      relatedTourSlugs: ['halong-heritage-cruise'],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const payload = toPostPayload(parsed.data);
    expect(payload.tags).toEqual(['Hạ Long', 'Cruises']);
    expect(payload.relatedTourSlugs).toEqual(['halong-heritage-cruise']);
  });

  it('forwards empty arrays (replace-all clear) but omits undefined', () => {
    const parsed = postSchema.safeParse({ title: 'T', content: 'c', tags: [] });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const payload = toPostPayload(parsed.data);
    expect(payload.tags).toEqual([]);
    expect('relatedTourSlugs' in payload).toBe(false);
  });

  it('rejects over-cap arrays', () => {
    expect(
      postSchema.safeParse({
        title: 'T',
        content: 'c',
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
      }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({
        title: 'T',
        content: 'c',
        relatedTourSlugs: ['a', 'b', 'c', 'd'],
      }).success,
    ).toBe(false);
  });
});

describe('toPostPayload — SEO + schedule', () => {
  it('create mode: omits empty metaTitle/metaDescription/publishedAt', () => {
    const input = postSchema.parse({
      ...base,
      metaTitle: '',
      metaDescription: '',
      publishedAt: '',
    }) as PostInput;
    const payload = toPostPayload(input, 'create');
    expect('metaTitle' in payload).toBe(false);
    expect('metaDescription' in payload).toBe(false);
    expect('publishedAt' in payload).toBe(false);
  });

  it('create mode: sends trimmed strings + ISO publishedAt when provided', () => {
    const input = postSchema.parse({
      ...base,
      metaTitle: '  Hoi An in 3 days  ',
      metaDescription: 'A short SEO description.',
      publishedAt: '2026-08-01T02:00:00.000Z',
    }) as PostInput;
    const payload = toPostPayload(input, 'create');
    expect(payload.metaTitle).toBe('Hoi An in 3 days');
    expect(payload.metaDescription).toBe('A short SEO description.');
    // ISO passthrough — the browser already did the local→UTC conversion.
    expect(payload.publishedAt).toBe('2026-08-01T02:00:00.000Z');
  });

  it('update mode: blanked metaTitle/metaDescription/publishedAt send null (CLEAR / publish-now)', () => {
    const input = postSchema.parse({
      ...base,
      metaTitle: '',
      metaDescription: '',
      publishedAt: '',
    }) as PostInput;
    const payload = toPostPayload(input, 'update');
    expect(payload.metaTitle).toBeNull();
    expect(payload.metaDescription).toBeNull();
    // Blank on update = clear the schedule (API re-stamps now on PUBLISHED).
    expect(payload.publishedAt).toBeNull();
  });

  it('update mode: non-empty values still send plain strings/ISO (not null)', () => {
    const input = postSchema.parse({
      ...base,
      metaTitle: 'Title',
      metaDescription: 'Description',
      publishedAt: '2026-08-01T02:00:00.000Z',
    }) as PostInput;
    const payload = toPostPayload(input, 'update');
    expect(payload.metaTitle).toBe('Title');
    expect(payload.metaDescription).toBe('Description');
    expect(payload.publishedAt).toBe('2026-08-01T02:00:00.000Z');
  });

  it('default mode is create (backward-compatible call sites)', () => {
    const input = postSchema.parse({ ...base, metaTitle: '' }) as PostInput;
    expect('metaTitle' in toPostPayload(input)).toBe(false);
  });
});

describe('localDatetimeToIso / isoToLocalDatetimeInput', () => {
  it('empty/blank input → undefined', () => {
    expect(localDatetimeToIso('')).toBeUndefined();
    expect(localDatetimeToIso('   ')).toBeUndefined();
  });

  it('malformed input → undefined', () => {
    expect(localDatetimeToIso('not-a-date')).toBeUndefined();
  });

  it('round-trips a datetime-local value through ISO and back', () => {
    const value = '2026-08-01T09:15';
    const iso = localDatetimeToIso(value);
    expect(iso).toBeDefined();
    expect(isoToLocalDatetimeInput(iso as string)).toBe(value);
  });

  it('isoToLocalDatetimeInput on null/invalid → empty string', () => {
    expect(isoToLocalDatetimeInput(null)).toBe('');
    expect(isoToLocalDatetimeInput('not-a-date')).toBe('');
  });
});

describe('parseJsonStringArray', () => {
  it('parses a JSON string array', () => {
    expect(parseJsonStringArray('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns undefined for null, empty, malformed, or non-string-array JSON', () => {
    expect(parseJsonStringArray(null)).toBeUndefined();
    expect(parseJsonStringArray('')).toBeUndefined();
    expect(parseJsonStringArray('{oops')).toBeUndefined();
    expect(parseJsonStringArray('[1,2]')).toBeUndefined();
  });
});
