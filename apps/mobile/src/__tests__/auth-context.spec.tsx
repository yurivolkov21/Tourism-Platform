import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../lib/auth-context';

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

function Probe() {
  const { status, user } = useAuth();
  return (
    <Text>
      {status}:{user?.email ?? 'none'}
    </Text>
  );
}

function renderProbe() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
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
