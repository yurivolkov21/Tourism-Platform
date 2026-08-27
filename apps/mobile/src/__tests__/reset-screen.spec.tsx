import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { messages } from '@tourism/i18n';
import { ThemeProvider } from '@tourism/mobile-ui';
import ResetPasswordScreen from '../app/auth/reset';

let mockUrl: string | null = null;
// The screen reads the link through `deep-link`, which records it at app root
// (see the module's own note on warm starts).
jest.mock('../lib/deep-link', () => ({
  ...jest.requireActual('../lib/deep-link'),
  useIncomingLink: () => mockUrl,
}));

jest.mock('expo-linking', () => ({
  addEventListener: () => ({ remove: jest.fn() }),
  getInitialURL: () => Promise.resolve(null),
  createURL: (path: string) => `tourism-mobile://${path.replace(/^\//, '')}`,
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
}));

const mockSetSession = jest.fn();
const mockVerifyOtp = jest.fn();
const mockExchangeCode = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: (...a: unknown[]) => mockSetSession(...a),
      verifyOtp: (...a: unknown[]) => mockVerifyOtp(...a),
      exchangeCodeForSession: (...a: unknown[]) => mockExchangeCode(...a),
    },
  },
}));

const mockChangePassword = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ changePassword: mockChangePassword }),
}));

const t = messages.auth.reset;

function wrap() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <ResetPasswordScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUrl = null;
  mockSetSession.mockResolvedValue({ error: null });
  mockVerifyOtp.mockResolvedValue({ error: null });
  mockExchangeCode.mockResolvedValue({ error: null });
});

test('adopts the recovery session carried in the link fragment', async () => {
  mockUrl =
    'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1&type=recovery';
  wrap();

  expect(await screen.findByText(t.subtitle)).toBeOnTheScreen();
  // The fragment, not the query string — `useLocalSearchParams` never sees it.
  expect(mockSetSession).toHaveBeenCalledWith({
    access_token: 'a1',
    refresh_token: 'r1',
  });
});

test('an expired link says so and offers a fresh one', async () => {
  mockUrl =
    'tourism-mobile://auth/reset#error=access_denied&error_code=otp_expired';
  wrap();

  expect(await screen.findByText(t.invalidTitle)).toBeOnTheScreen();
  expect(mockSetSession).not.toHaveBeenCalled();

  await userEvent.press(screen.getByRole('button', { name: t.requestNew }));
  expect(mockReplace).toHaveBeenCalledWith('/auth/forgot');
});

test('a rejected session is treated as an invalid link, not a usable form', async () => {
  mockUrl = 'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1';
  mockSetSession.mockResolvedValueOnce({ error: { message: 'bad token' } });
  wrap();

  expect(await screen.findByText(t.invalidTitle)).toBeOnTheScreen();
});

test('the new password must meet the policy before the API is called', async () => {
  mockUrl = 'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1';
  wrap();
  await screen.findByText(t.subtitle);

  await userEvent.type(screen.getByLabelText(t.passwordLabel), 'abcdefgh');
  await userEvent.type(screen.getByLabelText(t.confirmLabel), 'abcdefgh');
  await userEvent.press(screen.getByRole('button', { name: t.submit }));

  expect(
    await screen.findByText(messages.mobile.authErrors.passwordPolicy),
  ).toBeOnTheScreen();
  expect(mockChangePassword).not.toHaveBeenCalled();
});

test('a valid password is set in the app and confirms the other devices are out', async () => {
  mockUrl = 'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1';
  mockChangePassword.mockResolvedValueOnce({});
  wrap();
  await screen.findByText(t.subtitle);

  await userEvent.type(screen.getByLabelText(t.passwordLabel), 'Secret12!');
  await userEvent.type(screen.getByLabelText(t.confirmLabel), 'Secret12!');
  await userEvent.press(screen.getByRole('button', { name: t.submit }));

  expect(await screen.findByText(t.success)).toBeOnTheScreen();
  // No current password: proving the email WAS the re-auth.
  expect(mockChangePassword).toHaveBeenCalledWith('Secret12!');
});

test('a server-side failure is surfaced instead of a silent no-op', async () => {
  mockUrl = 'tourism-mobile://auth/reset#access_token=a1&refresh_token=r1';
  mockChangePassword.mockResolvedValueOnce({ error: 'samePassword' });
  wrap();
  await screen.findByText(t.subtitle);

  await userEvent.type(screen.getByLabelText(t.passwordLabel), 'Secret12!');
  await userEvent.type(screen.getByLabelText(t.confirmLabel), 'Secret12!');
  await userEvent.press(screen.getByRole('button', { name: t.submit }));

  expect(
    await screen.findByText(messages.mobile.authErrors.samePassword),
  ).toBeOnTheScreen();
});

// ── Every link shape Supabase can send (2026-08-27) ────────────────────────
// The screen used to read the fragment ONLY, so a token_hash or PKCE link left
// it spinning on the loader forever with nothing to act on.

test('verifies a token_hash link server-side', async () => {
  mockUrl = 'tourism-mobile://auth/reset?token_hash=h1&type=recovery';
  wrap();

  expect(await screen.findByText(t.subtitle)).toBeOnTheScreen();
  expect(mockVerifyOtp).toHaveBeenCalledWith({
    type: 'recovery',
    token_hash: 'h1',
  });
});

test('exchanges a PKCE code link', async () => {
  mockUrl = 'tourism-mobile://auth/reset?code=c1';
  wrap();

  expect(await screen.findByText(t.subtitle)).toBeOnTheScreen();
  expect(mockExchangeCode).toHaveBeenCalledWith('c1');
});

test('a link whose shape it cannot read fails visibly instead of spinning', async () => {
  jest.useFakeTimers();
  try {
    mockUrl = 'tourism-mobile://auth/reset';
    wrap();
    // Until the timeout it is legitimately still waiting.
    expect(screen.queryByText(t.invalidTitle)).not.toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(8000);
    });
    expect(screen.getByText(t.invalidTitle)).toBeOnTheScreen();
  } finally {
    jest.useRealTimers();
  }
});
