import { postSchema, toPostPayload, type PostInput } from './schema';

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
