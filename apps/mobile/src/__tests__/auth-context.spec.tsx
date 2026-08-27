import { useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ApiRequestError } from '@tourism/core';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { getApiClient } from '../lib/api';
import { signInWithGoogle as mockGoogleSignIn } from '../lib/google-auth';

const mockGetSession = jest.fn();
const mockOnChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));
const mockUpdateUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockGetUserIdentities = jest.fn();
const mockUnlinkIdentity = jest.fn();
const mockRefreshSession = jest.fn().mockResolvedValue({ data: {} });

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      // Forwards the listener so a test can fire an auth-state change itself.
      onAuthStateChange: (...a: unknown[]) => (mockOnChange as jest.Mock)(...a),
      updateUser: (...a: unknown[]) => mockUpdateUser(...a),
      signInWithPassword: (...a: unknown[]) => mockSignInWithPassword(...a),
      signOut: (...a: unknown[]) => mockSignOut(...a),
      getUserIdentities: () => mockGetUserIdentities(),
      unlinkIdentity: (...a: unknown[]) => mockUnlinkIdentity(...a),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

jest.mock('../lib/api', () => ({ getApiClient: jest.fn() }));
jest.mock('../lib/google-auth', () => ({ signInWithGoogle: jest.fn() }));

function Probe() {
  const { status, user } = useAuth();
  return (
    <Text>
      {status}:{user?.email ?? 'none'}
    </Text>
  );
}

function ProvidersProbe() {
  const { providers } = useAuth();
  return <Text>providers:{providers.join(',') || 'none'}</Text>;
}

function GoogleAvatarProbe() {
  const { googleAvatarUrl } = useAuth();
  return <Text>googleAvatarUrl:{googleAvatarUrl ?? 'none'}</Text>;
}

function ChangePasswordProbe() {
  const { changePassword } = useAuth();
  const [result, setResult] = useState('idle');
  return (
    <>
      <Pressable
        accessibilityLabel="change-password"
        onPress={async () => {
          const r = await changePassword('newSecret123');
          setResult(r.error ?? 'ok');
        }}
      >
        <Text>change</Text>
      </Pressable>
      <Text>result:{result}</Text>
    </>
  );
}

function SignOutEverywhereProbe() {
  const { signOutEverywhere } = useAuth();
  const [result, setResult] = useState('idle');
  return (
    <>
      <Pressable
        accessibilityLabel="sign-out-everywhere"
        onPress={async () => {
          const r = await signOutEverywhere();
          setResult(r.error ?? 'ok');
        }}
      >
        <Text>sign out everywhere</Text>
      </Pressable>
      <Text>result:{result}</Text>
    </>
  );
}

function DeleteAccountProbe() {
  const { deleteAccount } = useAuth();
  const [result, setResult] = useState('idle');
  return (
    <>
      <Pressable
        accessibilityLabel="delete-account"
        onPress={async () => {
          const r = await deleteAccount();
          setResult(r.error ?? 'ok');
        }}
      >
        <Text>delete</Text>
      </Pressable>
      <Text>result:{result}</Text>
    </>
  );
}

function GoogleProbe() {
  const { signInWithGoogle } = useAuth();
  const [result, setResult] = useState('idle');
  return (
    <>
      <Pressable
        accessibilityLabel="google-signin"
        onPress={async () => {
          const r = await signInWithGoogle();
          setResult(r.error ?? 'ok');
        }}
      >
        <Text>go</Text>
      </Pressable>
      <Text>result:{result}</Text>
    </>
  );
}

function renderProbe(children: ReactNode = <Probe />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  );
  return { ...view, invalidateSpy };
}

test('resolves signedOut when there is no session', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  renderProbe();
  expect(await screen.findByText('signedOut:none')).toBeOnTheScreen();
});

test('resolves signedIn with the user when a session exists', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  renderProbe();
  expect(
    await screen.findByText('signedIn:jane@example.com'),
  ).toBeOnTheScreen();
});

test('signInWithGoogle syncs the user and invalidates auth-scoped queries on success', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  (mockGoogleSignIn as jest.Mock).mockResolvedValueOnce({
    session: { user: { id: 'u1', user_metadata: { full_name: 'Jane' } } },
  });
  const POST = jest.fn().mockResolvedValue({});
  (getApiClient as jest.Mock).mockReturnValue({ POST });

  const { invalidateSpy } = renderProbe(<GoogleProbe />);
  fireEvent.press(await screen.findByLabelText('google-signin'));

  expect(await screen.findByText('result:ok')).toBeOnTheScreen();
  expect(POST).toHaveBeenCalledWith('/api/v1/auth/sync', {
    body: { fullName: 'Jane' },
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wishlist'] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bookings'] });
});

test('signInWithGoogle returns the error untouched and does not sync on failure', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  (mockGoogleSignIn as jest.Mock).mockResolvedValueOnce({
    error: 'cancelled',
  });
  const POST = jest.fn();
  (getApiClient as jest.Mock).mockReturnValue({ POST });

  const { invalidateSpy } = renderProbe(<GoogleProbe />);
  fireEvent.press(await screen.findByLabelText('google-signin'));

  expect(await screen.findByText('result:cancelled')).toBeOnTheScreen();
  expect(POST).not.toHaveBeenCalled();
  expect(invalidateSpy).not.toHaveBeenCalled();
});

test('exposes the linked providers from app_metadata', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: {
      session: {
        user: {
          id: 'u1',
          email: 'jane@example.com',
          app_metadata: { providers: ['google', 'email'] },
        },
      },
    },
  });
  renderProbe(<ProvidersProbe />);
  expect(await screen.findByText('providers:google,email')).toBeOnTheScreen();
});

test('a guest has no linked providers', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  renderProbe(<ProvidersProbe />);
  expect(await screen.findByText('providers:none')).toBeOnTheScreen();
});

test('exposes the Google profile photo from user_metadata', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: {
      session: {
        user: {
          id: 'u1',
          email: 'jane@example.com',
          user_metadata: { avatar_url: 'https://lh3.google/pic.jpg' },
        },
      },
    },
  });
  renderProbe(<GoogleAvatarProbe />);
  expect(
    await screen.findByText('googleAvatarUrl:https://lh3.google/pic.jpg'),
  ).toBeOnTheScreen();
});

test('a user with no Google metadata has no googleAvatarUrl', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  renderProbe(<GoogleAvatarProbe />);
  expect(await screen.findByText('googleAvatarUrl:none')).toBeOnTheScreen();
});

test('changePassword calls Supabase updateUser and returns ok', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  mockUpdateUser.mockResolvedValueOnce({ error: null });

  renderProbe(<ChangePasswordProbe />);
  fireEvent.press(await screen.findByLabelText('change-password'));

  expect(await screen.findByText('result:ok')).toBeOnTheScreen();
  expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecret123' });
});

test('changePassword maps a Supabase error', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  mockUpdateUser.mockResolvedValueOnce({
    error: { message: 'Password should be at least 8 characters' },
  });

  renderProbe(<ChangePasswordProbe />);
  fireEvent.press(await screen.findByLabelText('change-password'));

  expect(await screen.findByText('result:weakPassword')).toBeOnTheScreen();
});

test('deleteAccount calls DELETE then signs out on success', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  const DELETE = jest.fn().mockResolvedValue({});
  (getApiClient as jest.Mock).mockReturnValue({ DELETE });
  mockSignOut.mockClear();

  renderProbe(<DeleteAccountProbe />);
  fireEvent.press(await screen.findByLabelText('delete-account'));

  expect(await screen.findByText('result:ok')).toBeOnTheScreen();
  expect(DELETE).toHaveBeenCalledWith('/api/v1/users/me');
  expect(mockSignOut).toHaveBeenCalled();
});

test('deleteAccount surfaces the server message and does not sign out', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  const DELETE = jest.fn().mockRejectedValue(
    new ApiRequestError(409, {
      code: 'HAS_BOOKINGS',
      message: 'You have active bookings.',
    }),
  );
  (getApiClient as jest.Mock).mockReturnValue({ DELETE });
  mockSignOut.mockClear();

  renderProbe(<DeleteAccountProbe />);
  fireEvent.press(await screen.findByLabelText('delete-account'));

  expect(
    await screen.findByText('result:You have active bookings.'),
  ).toBeOnTheScreen();
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('signOutEverywhere revokes every session, not just this device', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  mockSignOut.mockResolvedValueOnce({ error: null });

  renderProbe(<SignOutEverywhereProbe />);
  fireEvent.press(await screen.findByLabelText('sign-out-everywhere'));

  expect(await screen.findByText('result:ok')).toBeOnTheScreen();
  expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
});

test('signOutEverywhere maps a Supabase failure and keeps the session', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  mockSignOut.mockResolvedValueOnce({ error: { message: 'boom' } });

  renderProbe(<SignOutEverywhereProbe />);
  fireEvent.press(await screen.findByLabelText('sign-out-everywhere'));

  expect(await screen.findByText('result:generic')).toBeOnTheScreen();
});

// ── Session-lifecycle hardening (2026-08-27) ───────────────────────────────

function SignOutProbe() {
  const { signOut } = useAuth();
  return (
    <Pressable accessibilityLabel="sign-out" onPress={() => void signOut()}>
      <Text>sign out</Text>
    </Pressable>
  );
}

function ChangePasswordWithCurrentProbe() {
  const { changePassword } = useAuth();
  const [result, setResult] = useState('idle');
  return (
    <>
      <Pressable
        accessibilityLabel="change-password"
        onPress={async () => {
          const r = await changePassword('newSecret123', 'oldSecret123');
          setResult(r.error ? `${r.error}:${r.field ?? 'none'}` : 'ok');
        }}
      >
        <Text>change</Text>
      </Pressable>
      <Text>result:{result}</Text>
    </>
  );
}

test('the plain sign out is local — it must not revoke the other devices', async () => {
  mockSignOut.mockClear();
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });

  renderProbe(<SignOutProbe />);
  fireEvent.press(await screen.findByLabelText('sign-out'));

  // supabase-js defaults signOut to `scope: 'global'`, which would sign the
  // user out of their browser too. The scope has to be passed explicitly.
  await screen.findByLabelText('sign-out');
  expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
});

test('a password change re-authenticates, then revokes the other sessions', async () => {
  mockSignOut.mockClear();
  mockSignInWithPassword.mockClear();
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  mockSignInWithPassword.mockResolvedValueOnce({ error: null });
  mockUpdateUser.mockResolvedValueOnce({ error: null });

  renderProbe(<ChangePasswordWithCurrentProbe />);
  fireEvent.press(await screen.findByLabelText('change-password'));

  expect(await screen.findByText('result:ok')).toBeOnTheScreen();
  expect(mockSignInWithPassword).toHaveBeenCalledWith({
    email: 'jane@example.com',
    password: 'oldSecret123',
  });
  // A stolen session must not outlive the password meant to shut it out.
  expect(mockSignOut).toHaveBeenCalledWith({ scope: 'others' });
});

test('a wrong current password blocks the change and blames that field', async () => {
  mockUpdateUser.mockClear();
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  mockSignInWithPassword.mockResolvedValueOnce({
    error: { message: 'Invalid login credentials' },
  });

  renderProbe(<ChangePasswordWithCurrentProbe />);
  fireEvent.press(await screen.findByLabelText('change-password'));

  expect(
    await screen.findByText('result:wrongPassword:currentPassword'),
  ).toBeOnTheScreen();
  expect(mockUpdateUser).not.toHaveBeenCalled();
});

test('a session ending on its own drops the account-scoped caches', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null } });
  // Capture the listener so the test can fire a SIGNED_OUT that nobody asked
  // for — an expired refresh token, or a revocation from another device.
  let emit: ((event: string, session: unknown) => void) | undefined;
  mockOnChange.mockImplementationOnce((...args: unknown[]) => {
    emit = args[0] as (event: string, session: unknown) => void;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const removeSpy = jest.spyOn(client, 'removeQueries');
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await screen.findByText('signedOut:none');

  act(() => emit?.('SIGNED_OUT', null));

  expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
  expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['bookings'] });
  expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['wishlist'] });
});

test('a restored session is re-mirrored on boot', async () => {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { user: { id: 'u1', email: 'jane@example.com' } } },
  });
  const POST = jest.fn().mockResolvedValue({});
  (getApiClient as jest.Mock).mockReturnValue({ POST });

  renderProbe();
  await screen.findByText('signedIn:jane@example.com');

  // Without this, a sync that failed at sign-in time was never retried and
  // every authed screen 401ed forever.
  expect(POST).toHaveBeenCalledWith('/api/v1/auth/sync', { body: {} });
});

// ── Identity claims are refreshed after they change (2026-08-27) ───────────

function ChangePasswordProvidersProbe() {
  const { changePassword, providers } = useAuth();
  return (
    <>
      <Pressable
        accessibilityLabel="change-password"
        onPress={() => void changePassword('Secret12!')}
      >
        <Text>change</Text>
      </Pressable>
      <Text>providers:{providers.join(',') || 'none'}</Text>
    </>
  );
}

test('setting a password refreshes the linked providers', async () => {
  // `updateUser({ password })` on a Google-only account makes Supabase create
  // the `email` identity — but `app_metadata.providers` rides in the JWT, so
  // without a refresh the account screen keeps offering "Set up".
  mockGetSession.mockResolvedValueOnce({
    data: {
      session: {
        user: {
          id: 'u1',
          email: 'jane@example.com',
          app_metadata: { providers: ['google'] },
        },
      },
    },
  });
  mockUpdateUser.mockResolvedValueOnce({ error: null });
  mockRefreshSession
    .mockResolvedValueOnce({ data: {} }) // the boot refresh
    .mockResolvedValueOnce({
      data: {
        session: {
          user: {
            app_metadata: { providers: ['google', 'email'] },
            user_metadata: {},
          },
        },
      },
    });

  renderProbe(<ChangePasswordProvidersProbe />);
  await screen.findByText('providers:google');

  fireEvent.press(screen.getByLabelText('change-password'));
  expect(await screen.findByText('providers:google,email')).toBeOnTheScreen();
});

test('a restored session re-reads its identity claims on launch', async () => {
  // Covers an identity changed elsewhere (the web app, another device): the
  // stored token predates it, so the screen would show yesterday's truth.
  mockRefreshSession.mockClear();
  mockGetSession.mockResolvedValueOnce({
    data: {
      session: {
        user: {
          id: 'u1',
          email: 'jane@example.com',
          app_metadata: { providers: ['google'] },
        },
      },
    },
  });
  mockRefreshSession.mockResolvedValueOnce({
    data: {
      session: {
        user: {
          app_metadata: { providers: ['google', 'email'] },
          user_metadata: {},
        },
      },
    },
  });

  renderProbe(<ProvidersProbe />);
  expect(await screen.findByText('providers:google,email')).toBeOnTheScreen();
});
