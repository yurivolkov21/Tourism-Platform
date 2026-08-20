import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { messages } from '@tourism/i18n';
import type { components } from '@tourism/core';
import AccountSettingsScreen from '../app/account-settings';
import { fetchProfile, updateProfile } from '../lib/profile';
import { removeAvatar, uploadAvatar } from '../lib/avatar';

type UserDto = components['schemas']['UserDto'];

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

let mockStatus = 'signedIn';
let mockProviders: string[] = [];
let mockGoogleAvatarUrl: string | null = null;
const mockChangePassword = jest.fn();
const mockChangeEmail = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: mockStatus,
    user: null,
    providers: mockProviders,
    googleAvatarUrl: mockGoogleAvatarUrl,
    signOut: jest.fn(),
    changePassword: mockChangePassword,
    changeEmail: mockChangeEmail,
    deleteAccount: mockDeleteAccount,
  }),
}));

jest.mock('../lib/profile', () => ({
  ...jest.requireActual('../lib/profile'),
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../lib/avatar', () => ({
  uploadAvatar: jest.fn(),
  removeAvatar: jest.fn(),
}));

const mockRequestPermission = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) =>
    mockRequestPermission(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunchLibrary(...a),
}));

const mockFetch = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const mockUpdate = updateProfile as jest.MockedFunction<typeof updateProfile>;
const mockUploadAvatar = uploadAvatar as jest.MockedFunction<
  typeof uploadAvatar
>;
const mockRemoveAvatar = removeAvatar as jest.MockedFunction<
  typeof removeAvatar
>;

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
  mockGoogleAvatarUrl = null;
});

test('shows the profile and can save a new name', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane Doe',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
  });
  mockUpdate.mockResolvedValueOnce({
    fullName: 'Jane N. Doe',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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
    avatarUrl: null,
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

test('picking a photo uploads it and shows the success line', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
  });
  mockRequestPermission.mockResolvedValueOnce({ granted: true });
  mockLaunchLibrary.mockResolvedValueOnce({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      },
    ],
  });
  mockUploadAvatar.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    avatarUrl: 'https://cdn/avatar.jpg',
  } as UserDto);
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Change photo' }));

  expect(await screen.findByText('Photo updated.')).toBeOnTheScreen();
  expect(mockUploadAvatar.mock.calls[0][0]).toEqual({
    uri: 'file:///tmp/photo.jpg',
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
});

test('cancelling the picker does not call uploadAvatar', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
  });
  mockRequestPermission.mockResolvedValueOnce({ granted: true });
  mockLaunchLibrary.mockResolvedValueOnce({ canceled: true, assets: null });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Change photo' }));

  expect(mockUploadAvatar).not.toHaveBeenCalled();
});

test('Remove appears once a photo is set and clears it', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: 'https://cdn/avatar.jpg',
  });
  mockRemoveAvatar.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    avatarUrl: null,
  } as UserDto);
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Remove' }));

  expect(await screen.findByText('Photo updated.')).toBeOnTheScreen();
  expect(mockRemoveAvatar).toHaveBeenCalled();
});

test('a failed password change surfaces the mapped error instead of failing silently', async () => {
  mockFetch.mockResolvedValueOnce({
    fullName: 'Jane',
    phone: '',
    email: 'jane@example.com',
    initial: 'J',
    avatarUrl: null,
  });
  mockChangePassword.mockResolvedValueOnce({ error: 'weakPassword' });
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

  expect(
    await screen.findByText(messages.mobile.authErrors.weakPassword),
  ).toBeOnTheScreen();
});

const passwordOnly = {
  fullName: 'Jane',
  phone: '',
  email: 'jane@example.com',
  initial: 'J',
  avatarUrl: null,
};

test('change email: password-only accounts get the form and send a confirmation', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce(passwordOnly);
  mockChangeEmail.mockResolvedValueOnce({});
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('New email'), 'new@example.com');
  await userEvent.type(screen.getByLabelText('Current password'), 'secret123');
  await userEvent.press(
    screen.getByRole('button', { name: 'Send confirmation' }),
  );

  expect(mockChangeEmail).toHaveBeenCalledWith('new@example.com', 'secret123');
  const email = messages.auth.account.securityPage.email;
  expect(
    await screen.findByText(`${email.sent} ${email.sentHint}`),
  ).toBeOnTheScreen();
});

test('change email: a bad email never reaches the API', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce(passwordOnly);
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('New email'), 'nope');
  await userEvent.type(screen.getByLabelText('Current password'), 'secret123');
  await userEvent.press(
    screen.getByRole('button', { name: 'Send confirmation' }),
  );

  expect(
    await screen.findByText(messages.mobile.authErrors.emailInvalid),
  ).toBeOnTheScreen();
  expect(mockChangeEmail).not.toHaveBeenCalled();
});

test('change email: a wrong current password is blamed on that field', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce(passwordOnly);
  mockChangeEmail.mockResolvedValueOnce({
    error: 'invalidCredentials',
    field: 'password',
  });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('New email'), 'new@example.com');
  await userEvent.type(screen.getByLabelText('Current password'), 'wrong');
  await userEvent.press(
    screen.getByRole('button', { name: 'Send confirmation' }),
  );

  expect(
    await screen.findByText(messages.mobile.authErrors.invalidCredentials),
  ).toBeOnTheScreen();
});

test('change email: a Google-linked account sees the managed note instead', async () => {
  mockProviders = ['google', 'email'];
  mockFetch.mockResolvedValueOnce(passwordOnly);
  renderScreen();
  await screen.findByText('jane@example.com');

  expect(
    screen.getByText(messages.auth.account.securityPage.email.managedNote),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText('New email')).not.toBeOnTheScreen();
});
