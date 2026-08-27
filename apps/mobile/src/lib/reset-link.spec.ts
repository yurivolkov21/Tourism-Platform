import { describeRecoveryLink, parseRecoveryLink } from './reset-link';

test('reads the session out of the fragment, where the query parser never looks', () => {
  expect(
    parseRecoveryLink(
      'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1&type=recovery',
    ),
  ).toEqual({ kind: 'tokens', accessToken: 'a1', refreshToken: 'r1' });
});

test('reads the token_hash shape, which verifies server-side', () => {
  expect(
    parseRecoveryLink(
      'tourism-mobile://auth/reset?token_hash=h1&type=recovery',
    ),
  ).toEqual({ kind: 'tokenHash', tokenHash: 'h1', type: 'recovery' });
});

test('defaults the token_hash type to recovery when the link omits it', () => {
  expect(
    parseRecoveryLink('tourism-mobile://auth/reset?token_hash=h1'),
  ).toEqual({ kind: 'tokenHash', tokenHash: 'h1', type: 'recovery' });
});

test('reads the PKCE code shape', () => {
  expect(parseRecoveryLink('tourism-mobile://auth/reset?code=c1')).toEqual({
    kind: 'code',
    code: 'c1',
  });
});

test('reports an expired link instead of pretending nothing arrived', () => {
  expect(
    parseRecoveryLink(
      'tourism-mobile://auth/reset#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
    ),
  ).toEqual({ kind: 'error', code: 'otp_expired' });
});

test('falls back to `error` when Supabase sends no error_code', () => {
  expect(
    parseRecoveryLink('tourism-mobile://auth/reset#error=access_denied'),
  ).toEqual({ kind: 'error', code: 'access_denied' });
});

test('an error wins over any stale token in the same link', () => {
  expect(
    parseRecoveryLink(
      'tourism-mobile://auth/reset#error_code=otp_expired&access_token=a1&refresh_token=r1',
    ),
  ).toEqual({ kind: 'error', code: 'otp_expired' });
});

test('returns null while no link has arrived yet', () => {
  expect(parseRecoveryLink(null)).toBeNull();
  expect(parseRecoveryLink(undefined)).toBeNull();
  expect(parseRecoveryLink('tourism-mobile://auth/reset')).toBeNull();
});

test('ignores a fragment that carries only half a session', () => {
  // A refresh token alone cannot open a session — treat it as nothing, not as
  // a usable result the screen would then fail on.
  expect(
    parseRecoveryLink('tourism-mobile://auth/reset#refresh_token=r1'),
  ).toBeNull();
});

test('reads params from the query and the fragment of the same URL', () => {
  expect(
    parseRecoveryLink(
      'exp://192.168.1.5:8081/--/auth/reset?type=recovery#access_token=a1&refresh_token=r1',
    ),
  ).toEqual({ kind: 'tokens', accessToken: 'a1', refreshToken: 'r1' });
});

describe('describeRecoveryLink', () => {
  it('lists parameter names without ever exposing their values', () => {
    const described = describeRecoveryLink(
      'tourism-mobile://auth/reset#access_token=SECRET&refresh_token=ALSOSECRET',
    );
    expect(described).toBe(
      'tourism-mobile://auth/reset [access_token, refresh_token]',
    );
    expect(described).not.toContain('SECRET');
  });

  it('describes a bare or missing link', () => {
    expect(describeRecoveryLink('tourism-mobile://auth/reset')).toBe(
      'tourism-mobile://auth/reset [no params]',
    );
    expect(describeRecoveryLink(null)).toBe('no url');
  });
});
