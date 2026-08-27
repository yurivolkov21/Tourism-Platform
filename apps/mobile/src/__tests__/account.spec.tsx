import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import AccountScreen from '../app/(tabs)/account';
import { fetchProfile } from '../lib/profile';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
}));

let mockStatus = 'signedOut';
const mockSignOut = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: mockStatus,
    user: null,
    providers: [],
    signOut: mockSignOut,
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  }),
}));

jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
}));

const mockFetch = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

function renderAccount() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AccountScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedOut';
});

test('guests see the account gate', () => {
  renderAccount();
  expect(screen.getByText('Your account')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
});

test('signed-in users see a short menu — "Your Profile" opens the settings screen', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane Doe',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
    hasPassword: false,
  });
  renderAccount();
  expect(await screen.findByText('jane@example.com')).toBeOnTheScreen();

  await userEvent.press(screen.getByRole('button', { name: 'Your Profile' }));
  expect(mockPush).toHaveBeenCalledWith('/account-settings');
});

test('sign out asks for a themed confirm sheet, then signs out', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
    hasPassword: false,
  });
  renderAccount();
  await screen.findByText('jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(mockSignOut).not.toHaveBeenCalled();

  await userEvent.press(screen.getByRole('button', { name: 'Yes, sign out' }));
  expect(mockSignOut).toHaveBeenCalled();
});

test('sign out: dismissing the confirm sheet does not sign out', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
    hasPassword: false,
  });
  renderAccount();
  await screen.findByText('jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  await userEvent.press(screen.getByRole('button', { name: 'Stay signed in' }));
  expect(mockSignOut).not.toHaveBeenCalled();
});

test('the menu leads to app settings and to one Legal destination', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
    hasPassword: false,
  });
  renderAccount();
  await screen.findByText('jane@example.com');

  // The three policy rows collapsed into one (2026-08-20).
  expect(screen.queryByText('Privacy policy')).not.toBeOnTheScreen();

  await userEvent.press(screen.getByRole('button', { name: 'App settings' }));
  expect(mockPush).toHaveBeenCalledWith('/app-settings');

  await userEvent.press(screen.getByRole('button', { name: 'Legal' }));
  expect(mockPush).toHaveBeenCalledWith('/legal');
});
