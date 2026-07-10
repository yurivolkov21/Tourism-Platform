import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import AccountScreen from '../app/(tabs)/account';
import { fetchProfile, updateProfile } from '../lib/profile';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

let mockStatus = 'signedOut';
const mockSignOut = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ status: mockStatus, user: null, signOut: mockSignOut }),
}));

jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

const mockFetch = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockUpdate = updateProfile as jest.MockedFunction<typeof updateProfile>;

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

test('signed-in users see the profile and can save a new name', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockUpdate.mockResolvedValueOnce({
    fullName: 'Jane N. Doe',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderAccount();
  expect(await screen.findByText('jane@example.com')).toBeOnTheScreen();
  const input = screen.getByLabelText('Display name');
  await userEvent.clear(input);
  await userEvent.type(input, 'Jane N. Doe');
  await userEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Name updated.')).toBeOnTheScreen();
  expect(mockUpdate.mock.calls[0][0]).toBe('Jane N. Doe');
});

test('sign out fires from the menu', async () => {
  mockStatus = 'signedIn';
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderAccount();
  await screen.findByText('jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(mockSignOut).toHaveBeenCalled();
});
