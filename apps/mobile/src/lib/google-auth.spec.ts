const mockCreateURL = jest.fn((_path: string) => 'nexora://auth/callback');
const mockParse = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockLinkIdentity = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSetSession = jest.fn();

jest.mock('expo-linking', () => ({
  createURL: (path: string) => mockCreateURL(path),
  parse: (url: string) => mockParse(url),
  // `deep-link` (imported transitively) subscribes at module scope.
  addEventListener: () => ({ remove: jest.fn() }),
  getInitialURL: () => Promise.resolve(null),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (url: string, redirectTo: string) =>
    mockOpenAuthSessionAsync(url, redirectTo),
}));

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (options: unknown) => mockSignInWithOAuth(options),
      linkIdentity: (options: unknown) => mockLinkIdentity(options),
      exchangeCodeForSession: (code: string) =>
        mockExchangeCodeForSession(code),
      setSession: (session: unknown) => mockSetSession(session),
    },
  },
}));

import { linkGoogleIdentity, signInWithGoogle } from './google-auth';

const authorizeUrl = 'https://project.supabase.co/auth/v1/authorize?...';

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateURL.mockReturnValue('nexora://auth/callback');
});

test('returns a mapped error when signInWithOAuth fails, without opening the browser', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: null },
    error: { message: 'boom' },
  });

  const result = await signInWithGoogle();

  expect(result).toEqual({ error: 'generic' });
  expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
});

test('returns cancelled when the user closes the browser, without exchanging a code', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' });

  const result = await signInWithGoogle();

  expect(result).toEqual({ error: 'cancelled' });
  expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
});

test('returns the session via the implicit flow (tokens in the URL fragment)', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({
    type: 'success',
    url: 'nexora://auth/callback#access_token=at1&refresh_token=rt1&expires_in=3600',
  });
  const session = { user: { id: 'u1' } };
  mockSetSession.mockResolvedValueOnce({
    data: { session, user: session.user },
    error: null,
  });

  const result = await signInWithGoogle();

  expect(mockSetSession).toHaveBeenCalledWith({
    access_token: 'at1',
    refresh_token: 'rt1',
  });
  expect(result).toEqual({ session });
  expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
});

test('returns a mapped error when setSession fails for the implicit flow', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({
    type: 'success',
    url: 'nexora://auth/callback#access_token=at1&refresh_token=rt1',
  });
  mockSetSession.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: { message: 'boom' },
  });

  const result = await signInWithGoogle();

  expect(result).toEqual({ error: 'generic' });
});

test('returns the session on a successful code exchange (PKCE fallback)', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({
    type: 'success',
    url: 'nexora://auth/callback?code=abc123',
  });
  mockParse.mockReturnValueOnce({ queryParams: { code: 'abc123' } });
  const session = { user: { id: 'u1' } };
  mockExchangeCodeForSession.mockResolvedValueOnce({
    data: { session, user: session.user },
    error: null,
  });

  const result = await signInWithGoogle();

  expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
  expect(result).toEqual({ session });
});

test('returns a mapped error when the code exchange fails', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({
    type: 'success',
    url: 'nexora://auth/callback?code=abc123',
  });
  mockParse.mockReturnValueOnce({ queryParams: { code: 'abc123' } });
  mockExchangeCodeForSession.mockResolvedValueOnce({
    data: { session: null, user: null },
    error: { message: 'boom' },
  });

  const result = await signInWithGoogle();

  expect(result).toEqual({ error: 'generic' });
});

test('returns a generic error when the redirect URL has no code param', async () => {
  mockSignInWithOAuth.mockResolvedValueOnce({
    data: { url: authorizeUrl },
    error: null,
  });
  mockOpenAuthSessionAsync.mockResolvedValueOnce({
    type: 'success',
    url: 'nexora://auth/callback',
  });
  mockParse.mockReturnValueOnce({ queryParams: {} });

  const result = await signInWithGoogle();

  expect(result).toEqual({ error: 'generic' });
  expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
});

describe('linkGoogleIdentity', () => {
  it('opens the consent browser and reports success with nothing to adopt', async () => {
    // The identity is attached SERVER-side, so unlike a sign-in there is no
    // session in the redirect — the caller re-reads the JWT instead.
    mockLinkIdentity.mockResolvedValueOnce({
      data: { url: authorizeUrl },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'nexora://auth/callback',
    });

    await expect(linkGoogleIdentity()).resolves.toEqual({});
    expect(mockLinkIdentity).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'nexora://auth/callback',
        skipBrowserRedirect: true,
      },
    });
  });

  it('treats a closed browser as a cancellation, not a failure', async () => {
    mockLinkIdentity.mockResolvedValueOnce({
      data: { url: authorizeUrl },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValueOnce({ type: 'dismiss' });

    await expect(linkGoogleIdentity()).resolves.toEqual({
      error: 'cancelled',
    });
  });

  it('reads a refusal out of the redirect, which "success" alone would hide', async () => {
    // A browser that completed is not the same as a link that landed: Supabase
    // reports "this Google account belongs to someone else" in the URL.
    mockLinkIdentity.mockResolvedValueOnce({
      data: { url: authorizeUrl },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValueOnce({
      type: 'success',
      url: 'nexora://auth/callback#error_code=identity_already_exists',
    });

    await expect(linkGoogleIdentity()).resolves.toEqual({
      error: 'providerAlreadyLinked',
    });
  });

  it('maps a refused linkIdentity without opening the browser', async () => {
    mockLinkIdentity.mockResolvedValueOnce({
      data: null,
      error: { code: 'manual_linking_disabled', message: 'disabled' },
    });

    await expect(linkGoogleIdentity()).resolves.toEqual({
      error: 'manualLinkingDisabled',
    });
    expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
  });
});
