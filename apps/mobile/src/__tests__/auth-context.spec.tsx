import { useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { getApiClient } from '../lib/api';
import { signInWithGoogle as mockGoogleSignIn } from '../lib/google-auth';

const mockGetSession = jest.fn();
const mockOnChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => mockOnChange(),
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
