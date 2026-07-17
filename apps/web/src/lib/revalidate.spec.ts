import {
  TAGS,
  isAllowedPath,
  isAllowedTag,
  isValidRevalidateSecret,
  parseRevalidatePayload,
  postTag,
  tourTag,
} from './revalidate';

describe('tag taxonomy', () => {
  it('exposes the static surface tags (single source of truth)', () => {
    expect(Object.values(TAGS).sort()).toEqual(
      [
        'site-media',
        'tours',
        'destinations',
        'posts',
        'categories',
        'featured-reviews',
        'trust-stats',
      ].sort(),
    );
  });

  it('builds the per-entity tags from slugs', () => {
    expect(tourTag('ha-long-cruise')).toBe('tour:ha-long-cruise');
    expect(postTag('street-food-hanoi')).toBe('post:street-food-hanoi');
  });
});

describe('isAllowedTag', () => {
  it('accepts every static tag', () => {
    for (const tag of Object.values(TAGS)) {
      expect(isAllowedTag(tag)).toBe(true);
    }
  });

  it('accepts tour:/post: prefixed tags with a non-empty slug', () => {
    expect(isAllowedTag('tour:ha-long')).toBe(true);
    expect(isAllowedTag('post:my-post')).toBe(true);
  });

  it('rejects unknown tags, empty slugs, and junk', () => {
    expect(isAllowedTag('bookings')).toBe(false);
    expect(isAllowedTag('tour:')).toBe(false);
    expect(isAllowedTag('post: ')).toBe(false);
    expect(isAllowedTag('')).toBe(false);
    expect(isAllowedTag('x'.repeat(300))).toBe(false);
  });
});

describe('isAllowedPath', () => {
  it('accepts absolute local paths', () => {
    expect(isAllowedPath('/')).toBe(true);
    expect(isAllowedPath('/blog')).toBe(true);
    expect(isAllowedPath('/tours/ha-long')).toBe(true);
  });

  it('rejects external, protocol-relative, and malformed paths', () => {
    expect(isAllowedPath('https://evil.example.com')).toBe(false);
    expect(isAllowedPath('//evil.example.com')).toBe(false);
    expect(isAllowedPath('blog')).toBe(false);
    expect(isAllowedPath('/a\\b')).toBe(false);
    expect(isAllowedPath('')).toBe(false);
    expect(isAllowedPath('/' + 'x'.repeat(300))).toBe(false);
  });
});

describe('parseRevalidatePayload', () => {
  it('accepts a valid tags/paths body (deduped)', () => {
    expect(
      parseRevalidatePayload({
        tags: ['tours', 'tour:ha-long', 'tours'],
        paths: ['/blog'],
      }),
    ).toEqual({ tags: ['tours', 'tour:ha-long'], paths: ['/blog'] });
  });

  it('maps the legacy { slug } body to the tour tag', () => {
    expect(parseRevalidatePayload({ slug: 'ha-long' })).toEqual({
      tags: ['tour:ha-long'],
      paths: [],
    });
  });

  it('rejects the whole payload when ANY tag or path is invalid (strict allow-list)', () => {
    expect(parseRevalidatePayload({ tags: ['tours', 'bookings'] })).toBeNull();
    expect(
      parseRevalidatePayload({ paths: ['//evil.example.com'] }),
    ).toBeNull();
  });

  it('rejects empty/malformed bodies', () => {
    expect(parseRevalidatePayload({})).toBeNull();
    expect(parseRevalidatePayload(null)).toBeNull();
    expect(parseRevalidatePayload({ tags: [] })).toBeNull();
    expect(parseRevalidatePayload({ tags: 'tours' })).toBeNull();
    expect(parseRevalidatePayload({ tags: [42] })).toBeNull();
  });
});

describe('isValidRevalidateSecret', () => {
  it('rejects when the provided secret is empty', () => {
    expect(isValidRevalidateSecret('', 'expected')).toBe(false);
  });

  it('rejects when the expected secret is empty (server unconfigured)', () => {
    expect(isValidRevalidateSecret('provided', '')).toBe(false);
  });

  it('rejects when both are empty', () => {
    expect(isValidRevalidateSecret('', '')).toBe(false);
  });

  it('rejects a length mismatch', () => {
    expect(isValidRevalidateSecret('ab', 'abc')).toBe(false);
  });

  it('rejects a one-character difference', () => {
    expect(isValidRevalidateSecret('abd', 'abc')).toBe(false);
  });

  it('rejects null/undefined provided values', () => {
    expect(isValidRevalidateSecret(null, 'abc')).toBe(false);
    expect(isValidRevalidateSecret(undefined, 'abc')).toBe(false);
  });

  it('accepts an exact match', () => {
    expect(isValidRevalidateSecret('s3cr3t-value', 's3cr3t-value')).toBe(true);
  });
});
