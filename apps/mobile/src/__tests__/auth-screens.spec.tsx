import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import SignInScreen from '../app/auth/sign-in';
import SignUpScreen from '../app/auth/sign-up';
import ForgotScreen from '../app/auth/forgot';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSendReset = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: 'signedOut',
    user: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    sendReset: mockSendReset,
    signOut: jest.fn(),
  }),
}));

import { router } from 'expo-router';

function wrap(children: React.ReactNode) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

test('sign-in validates before calling supabase', async () => {
  wrap(<SignInScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
  expect(mockSignIn).not.toHaveBeenCalled();
});

test('sign-in success routes back; failure shows the banner', async () => {
  mockSignIn.mockResolvedValueOnce({});
  wrap(<SignInScreen />);
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(router.back).toHaveBeenCalled();

  mockSignIn.mockResolvedValueOnce({ error: 'invalidCredentials' });
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Email or password is incorrect.')).toBeOnTheScreen();
});

test('sign-in shows the wishlist reason line', () => {
  mockParams = { reason: 'wishlist' };
  wrap(<SignInScreen />);
  expect(screen.getByText('Sign in to save tours you love.')).toBeOnTheScreen();
});

test('sign-up shows confirm mismatch and the confirmation-sent state', async () => {
  mockSignUp.mockResolvedValueOnce({ confirmationSent: true });
  wrap(<SignUpScreen />);
  await userEvent.type(screen.getByLabelText('Full name'), 'Jane');
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret123');
  await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
  await userEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByText('Passwords do not match.')).toBeOnTheScreen();

  await userEvent.clear(screen.getByLabelText('Confirm password'));
  await userEvent.type(screen.getByLabelText('Confirm password'), 'secret123');
  await userEvent.press(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Check your inbox')).toBeOnTheScreen();
});

test('forgot sends and shows the sent state', async () => {
  mockSendReset.mockResolvedValueOnce({});
  wrap(<ForgotScreen />);
  await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
  await userEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByText('Check your inbox')).toBeOnTheScreen();
  expect(mockSendReset).toHaveBeenCalledWith('jane@example.com');
});
