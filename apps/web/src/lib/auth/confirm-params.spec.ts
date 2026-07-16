import { parseConfirmParams } from './confirm-params';

function q(search: string) {
  return new URLSearchParams(search);
}

describe('parseConfirmParams', () => {
  it.each(['email_change', 'signup', 'recovery', 'invite'])(
    'accepts type=%s with a token_hash',
    (type) => {
      expect(parseConfirmParams(q(`token_hash=abc123&type=${type}`))).toEqual({
        tokenHash: 'abc123',
        type,
      });
    },
  );

  it('ignores extra params (e.g. redirect) and returns only token_hash + type', () => {
    expect(
      parseConfirmParams(
        q('token_hash=abc&type=recovery&redirect=/reset-password'),
      ),
    ).toEqual({ tokenHash: 'abc', type: 'recovery' });
  });

  it('rejects an unknown type', () => {
    expect(parseConfirmParams(q('token_hash=abc&type=magiclink'))).toBeNull();
    expect(parseConfirmParams(q('token_hash=abc&type=foo'))).toBeNull();
  });

  it('rejects a missing type', () => {
    expect(parseConfirmParams(q('token_hash=abc'))).toBeNull();
  });

  it('rejects a missing or empty token_hash', () => {
    expect(parseConfirmParams(q('type=signup'))).toBeNull();
    expect(parseConfirmParams(q('token_hash=&type=signup'))).toBeNull();
  });
});
