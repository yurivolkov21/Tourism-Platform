import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import AccountSettingsScreen from '../app/account-settings';
import { fetchProfile, updateProfile } from '../lib/profile';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

let mockStatus = 'signedIn';
let mockProviders: string[] = [];
const mockChangePassword = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: mockStatus,
    user: null,
    providers: mockProviders,
    signOut: jest.fn(),
    changePassword: mockChangePassword,
    deleteAccount: mockDeleteAccount,
  }),
}));

jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

const mockFetch = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockUpdate = updateProfile as jest.MockedFunction<typeof updateProfile>;

function renderScreen() {
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
          <AccountSettingsScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedIn';
  mockProviders = [];
});

test('shows the profile and can save a new name', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane Doe',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockUpdate.mockResolvedValueOnce({
    fullName: 'Jane N. Doe',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderScreen();
  expect(await screen.findByText('jane@example.com')).toBeOnTheScreen();
  const input = screen.getByLabelText('Display name');
  await userEvent.clear(input);
  await userEvent.type(input, 'Jane N. Doe');
  await userEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Name updated.')).toBeOnTheScreen();
  expect(mockUpdate.mock.calls[0][0]).toEqual({ fullName: 'Jane N. Doe' });
});

test('Save stays disabled until the phone number actually changes', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '+84901234567',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderScreen();
  await screen.findByText('jane@example.com');
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

  const phoneInput = screen.getByLabelText('Phone');
  await userEvent.clear(phoneInput);
  await userEvent.type(phoneInput, '+84907654321');
  expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
});

test('change password validates locally before calling the API', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('New password'), 'short');
  await userEvent.type(screen.getByLabelText('Confirm new password'), 'short');
  await userEvent.press(
    screen.getByRole('button', { name: 'Update password' }),
  );
  expect(
    await screen.findByText('Use at least 8 characters.'),
  ).toBeOnTheScreen();
  expect(mockChangePassword).not.toHaveBeenCalled();
});

test('change password calls the API once valid and shows the success line', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockChangePassword.mockResolvedValueOnce({});
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('New password'), 'secret123');
  await userEvent.type(
    screen.getByLabelText('Confirm new password'),
    'secret123',
  );
  await userEvent.press(
    screen.getByRole('button', { name: 'Update password' }),
  );
  expect(await screen.findByText('Password updated.')).toBeOnTheScreen();
  expect(mockChangePassword).toHaveBeenCalledWith('secret123');
});

test('connected accounts: shows the empty state with no linked providers', async () => {
  mockProviders = [];
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderScreen();
  expect(
    await screen.findByText('No connected accounts yet.'),
  ).toBeOnTheScreen();
});

test('connected accounts: lists the linked providers read-only', async () => {
  mockProviders = ['google', 'email'];
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  renderScreen();
  expect(await screen.findByText('Google')).toBeOnTheScreen();
  expect(screen.getByText('Email & password')).toBeOnTheScreen();
});

test('delete account asks for a confirm sheet, then deletes and leaves the screen', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockDeleteAccount.mockResolvedValueOnce({});
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  expect(mockDeleteAccount).not.toHaveBeenCalled();

  await userEvent.press(
    screen.getByRole('button', { name: 'Yes, delete my account' }),
  );
  expect(mockDeleteAccount).toHaveBeenCalled();
  await screen.findByRole('button', { name: 'Delete account' }); // settles before asserting the redirect
  expect(mockReplace).toHaveBeenCalledWith('/');
});

test('delete account surfaces the server error inline and stays put', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
  });
  mockDeleteAccount.mockResolvedValueOnce({
    error: 'You have active bookings.',
  });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.press(
    screen.getByRole('button', { name: 'Yes, delete my account' }),
  );
  expect(
    await screen.findByText('You have active bookings.'),
  ).toBeOnTheScreen();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('signed-out users are redirected away (Redirect renders in place of the form)', () => {
  mockStatus = 'signedOut';
  renderScreen();
  expect(screen.queryByLabelText('Display name')).not.toBeOnTheScreen();
});
