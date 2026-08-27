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
const mockDeleteAccount = jest.fn();
const mockLinkProvider = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: mockStatus,
    user: null,
    providers: mockProviders,
    googleAvatarUrl: mockGoogleAvatarUrl,
    signOut: jest.fn(),
    changePassword: mockChangePassword,
    linkProvider: mockLinkProvider,
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

/** Base profile for the tests; spread to vary a field. */
const janeProfile = {
  fullName: 'Jane',
  phone: '',
  email: 'jane@example.com',
  initial: 'J',
  avatarUrl: null,
  hasPassword: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedIn';
  mockProviders = [];
  mockGoogleAvatarUrl = null;
});

test('shows the profile and can save a new name', async () => {
  mockFetch.mockResolvedValueOnce({
    ...janeProfile,
    fullName: 'Jane Doe',
    phone: '',
    avatarUrl: null,
  });
  mockUpdate.mockResolvedValueOnce({
    ...janeProfile,
    fullName: 'Jane N. Doe',
    phone: '',
    avatarUrl: null,
  });
  renderScreen();
  expect(await screen.findByText('jane@example.com')).toBeOnTheScreen();
  const input = screen.getByLabelText('Display name');
  await userEvent.clear(input);
  await userEvent.type(input, 'Jane N. Doe');
  await userEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(
    await screen.findByText(messages.mobile.account.editNameSaved),
  ).toBeOnTheScreen();
  expect(mockUpdate.mock.calls[0][0]).toEqual({ fullName: 'Jane N. Doe' });
});

test('Save stays disabled until the phone number actually changes', async () => {
  mockFetch.mockResolvedValueOnce({
    ...janeProfile,
    fullName: 'Jane',
    phone: '+84901234567',
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
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  // Every character class present, only length missing → the message says so.
  await userEvent.type(screen.getByLabelText('New password'), 'Ab1!');
  await userEvent.type(screen.getByLabelText('Confirm new password'), 'Ab1!');
  await userEvent.press(
    screen.getByRole('button', { name: 'Update password' }),
  );
  expect(
    await screen.findByText(messages.mobile.authErrors.passwordTooShort),
  ).toBeOnTheScreen();
  expect(mockChangePassword).not.toHaveBeenCalled();
});

test('change password calls the API once valid and shows the success line', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  mockChangePassword.mockResolvedValueOnce({});
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('Current password'), 'OldPass1!');
  await userEvent.type(screen.getByLabelText('New password'), 'Secret12!');
  await userEvent.type(
    screen.getByLabelText('Confirm new password'),
    'Secret12!',
  );
  await userEvent.press(
    screen.getByRole('button', { name: 'Update password' }),
  );
  expect(await screen.findByText(/Password updated\./)).toBeOnTheScreen();
  expect(mockChangePassword).toHaveBeenCalledWith('Secret12!', 'OldPass1!');
});

test('a Google-only account gets no change-password section at all', async () => {
  // Minting a FIRST password from an unlocked device would create a credential
  // that outlives even "Sign out of all devices".
  mockProviders = ['google'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: false });
  renderScreen();
  await screen.findByText('jane@example.com');

  expect(screen.queryByLabelText('New password')).not.toBeOnTheScreen();
  expect(screen.queryByLabelText('Current password')).not.toBeOnTheScreen();
});

test('an account with both Google and a password still gets the section', async () => {
  mockProviders = ['google', 'email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  expect(screen.getByLabelText('Current password')).toBeOnTheScreen();
  expect(screen.getByLabelText('New password')).toBeOnTheScreen();
});

test('connected accounts: shows the empty state with no linked providers', async () => {
  mockProviders = [];
  mockFetch.mockResolvedValueOnce(janeProfile);
  renderScreen();
  expect(
    await screen.findByText('No connected accounts yet.'),
  ).toBeOnTheScreen();
});

test('connected accounts: lists the linked providers read-only', async () => {
  mockProviders = ['google', 'email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  expect(await screen.findByText('Google')).toBeOnTheScreen();
  expect(screen.getByText('Email & password')).toBeOnTheScreen();
});

test('delete account asks for a confirm sheet, then deletes and leaves the screen', async () => {
  mockFetch.mockResolvedValueOnce(janeProfile);
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
  mockFetch.mockResolvedValueOnce(janeProfile);
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
  mockFetch.mockResolvedValueOnce(janeProfile);
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
  mockFetch.mockResolvedValueOnce(janeProfile);
  mockRequestPermission.mockResolvedValueOnce({ granted: true });
  mockLaunchLibrary.mockResolvedValueOnce({ canceled: true, assets: null });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByRole('button', { name: 'Change photo' }));

  expect(mockUploadAvatar).not.toHaveBeenCalled();
});

test('Remove appears once a photo is set and clears it', async () => {
  mockFetch.mockResolvedValueOnce({
    ...janeProfile,
    fullName: 'Jane',
    phone: '',
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
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  mockChangePassword.mockResolvedValueOnce({ error: 'weakPassword' });
  // The section is gated on the API's verdict, not on the provider list.
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('Current password'), 'OldPass1!');
  await userEvent.type(screen.getByLabelText('New password'), 'Secret12!');
  await userEvent.type(
    screen.getByLabelText('Confirm new password'),
    'Secret12!',
  );
  await userEvent.press(
    screen.getByRole('button', { name: 'Update password' }),
  );

  expect(
    await screen.findByText(messages.mobile.authErrors.weakPassword),
  ).toBeOnTheScreen();
});

// ── Per-field error clarity (2026-08-27) ────────────────────────────────────
// Every case below used to end in a message that either named the wrong field
// or said nothing at all ("Something went wrong", a greyed-out Save button).

test('an emptied name explains itself on blur instead of greying Save out', async () => {
  mockFetch.mockResolvedValueOnce(janeProfile);
  renderScreen();
  await screen.findByText('jane@example.com');

  const name = screen.getByLabelText('Display name');
  await userEvent.clear(name);
  // Leaving the field is enough — no submit needed.
  await userEvent.type(screen.getByLabelText('Phone'), '+84901234567');

  expect(
    await screen.findByText(messages.mobile.authErrors.nameRequired),
  ).toBeOnTheScreen();
});

test('a malformed phone blames the phone, not the name', async () => {
  mockFetch.mockResolvedValueOnce(janeProfile);
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.type(screen.getByLabelText('Phone'), '09-abc');
  await userEvent.press(screen.getByRole('button', { name: 'Save' }));

  expect(
    await screen.findByText(messages.mobile.authErrors.phoneInvalid),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(messages.mobile.authErrors.nameRequired),
  ).not.toBeOnTheScreen();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test('the new-password field shows a live requirements checklist', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  // Nothing typed yet: no checklist shouting at an untouched field.
  expect(
    screen.queryByText(messages.auth.passwordRules['upper']),
  ).not.toBeOnTheScreen();

  await userEvent.type(screen.getByLabelText('New password'), 'abc');
  expect(
    await screen.findByText(messages.auth.passwordRules['upper']),
  ).toBeOnTheScreen();
  expect(screen.getByText(messages.auth.passwordStrength(1))).toBeOnTheScreen();
});

const tc = messages.auth.account.connected;

// ── Connecting Google to a password account (2026-08-27) ──────────────────
// The common direction: register with an email, then link Google so later
// logins are one tap. (Adding a password to a Google account is the rare one.)

test('an account without Google is offered a Connect button', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  mockLinkProvider.mockResolvedValueOnce({});
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByLabelText(`${tc.connect} ${tc.google}`));
  expect(mockLinkProvider).toHaveBeenCalledWith('google');
});

test('an account that already has Google is not offered it again', async () => {
  mockProviders = ['email', 'google'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  expect(
    screen.queryByLabelText(`${tc.connect} ${tc.google}`),
  ).not.toBeOnTheScreen();
});

test('a refused link says why rather than failing quietly', async () => {
  mockProviders = ['email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  mockLinkProvider.mockResolvedValueOnce({ error: 'providerAlreadyLinked' });
  renderScreen();
  await screen.findByText('jane@example.com');

  await userEvent.press(screen.getByLabelText(`${tc.connect} ${tc.google}`));
  expect(
    await screen.findByText(
      `${tc.connectError} ${messages.mobile.authErrors.providerAlreadyLinked}`,
    ),
  ).toBeOnTheScreen();
});

test('a password with no email identity is still listed as a sign-in method', async () => {
  // Supabase adds no `email` identity when a password is set on an OAuth
  // account, so the list built from identities would show Google alone and
  // call it "the only sign-in method" — while email login demonstrably works.
  mockProviders = ['google'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  expect(screen.getByText(tc.passwordRow)).toBeOnTheScreen();
  expect(
    screen.getByText(tc.passwordRowDesc('jane@example.com')),
  ).toBeOnTheScreen();
});

test('the password row is not duplicated when an email identity does exist', async () => {
  mockProviders = ['google', 'email'];
  mockFetch.mockResolvedValueOnce({ ...janeProfile, hasPassword: true });
  renderScreen();
  await screen.findByText('jane@example.com');

  // The identity row already covers it — `tc.email` and `tc.passwordRow` read
  // the same, so a second row would look like a duplicate entry.
  expect(
    screen.queryByText(tc.passwordRowDesc('jane@example.com')),
  ).not.toBeOnTheScreen();
});
