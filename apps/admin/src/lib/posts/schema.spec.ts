import { parseJsonStringArray, postSchema, toPostPayload, type PostInput } from './schema';

const base = { title: 'Three perfect days in Hoi An', content: '## Day 1\nWalk the old town.' };

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
    expect(postSchema.safeParse({ ...base, slug: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects an over-long excerpt', () => {
    expect(postSchema.safeParse({ ...base, excerpt: 'x'.repeat(301) }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(postSchema.safeParse({ ...base, status: 'ARCHIVED' }).success).toBe(false);
  });

  it('accepts a valid status', () => {
    expect(postSchema.safeParse({ ...base, status: 'PUBLISHED' }).success).toBe(true);
  });
});

describe('toPostPayload', () => {
  it('keeps title + content, drops empty optionals', () => {
    const input = postSchema.parse({ ...base, slug: '', excerpt: '' }) as PostInput;
    expect(toPostPayload(input)).toEqual({ title: base.title, content: base.content });
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
