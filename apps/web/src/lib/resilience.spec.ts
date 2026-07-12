import { settle, contentState } from './resilience';

describe('settle', () => {
  it('wraps a resolved value as ok + data', async () => {
    const r = await settle(Promise.resolve([1, 2, 3]));
    expect(r).toEqual({ ok: true, data: [1, 2, 3] });
  });

  it('wraps a rejection as not-ok + null data, without throwing', async () => {
    const r = await settle(Promise.reject(new Error('boom')));
    expect(r).toEqual({ ok: false, data: null });
  });
});

describe('contentState', () => {
  it('returns "error" whenever failed, even if non-empty', () => {
    expect(contentState({ failed: true, isEmpty: false })).toBe('error');
    expect(contentState({ failed: true, isEmpty: true })).toBe('error');
  });

  it('returns "empty" when ok but empty', () => {
    expect(contentState({ failed: false, isEmpty: true })).toBe('empty');
  });

  it('returns "content" when ok and non-empty', () => {
    expect(contentState({ failed: false, isEmpty: false })).toBe('content');
  });
});
