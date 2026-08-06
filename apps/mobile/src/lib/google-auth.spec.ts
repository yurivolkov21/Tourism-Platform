const mockCreateURL = jest.fn((_path: string) => 'nexora://auth/callback');
const mockParse = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSetSession = jest.fn();

jest.mock('expo-linking', () => ({
  createURL: (path: string) => mockCreateURL(path),
  parse: (url: string) => mockParse(url),
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
      exchangeCodeForSession: (code: string) =>
        mockExchangeCodeForSession(code),
      setSession: (session: unknown) => mockSetSession(session),
    },
  },
}));

import { signInWithGoogle } from './google-auth';

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
