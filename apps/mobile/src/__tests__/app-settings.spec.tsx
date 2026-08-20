import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { messages } from '@tourism/i18n';
import AppSettingsScreen from '../app/app-settings';

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

let mockPref = 'system';
const mockSetPref = jest.fn();
jest.mock('../lib/appearance-context', () => ({
  useAppearance: () => ({ pref: mockPref, setPref: mockSetPref }),
}));

let mockStatus = 'signedIn';
const mockSignOutEverywhere = jest.fn();
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    status: mockStatus,
    signOutEverywhere: mockSignOutEverywhere,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <AppSettingsScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = 'signedIn';
  mockPref = 'system';
});

test('signing out everywhere needs the confirm sheet first', async () => {
  mockSignOutEverywhere.mockResolvedValueOnce({});
  renderScreen();

  await userEvent.press(
    screen.getByRole('button', { name: 'Sign out of all devices' }),
  );
  expect(mockSignOutEverywhere).not.toHaveBeenCalled();

  await userEvent.press(
    screen.getByRole('button', { name: 'Yes, sign out everywhere' }),
  );
  expect(mockSignOutEverywhere).toHaveBeenCalled();
});

test('a failed global sign-out stays put and says so', async () => {
  mockSignOutEverywhere.mockResolvedValueOnce({ error: 'generic' });
  renderScreen();

  await userEvent.press(
    screen.getByRole('button', { name: 'Sign out of all devices' }),
  );
  await userEvent.press(
    screen.getByRole('button', { name: 'Yes, sign out everywhere' }),
  );

  expect(
    await screen.findByText(messages.mobile.appSettings.signOutAllError),
  ).toBeOnTheScreen();
});

test('signed-out users are redirected away', () => {
  mockStatus = 'signedOut';
  renderScreen();
  expect(
    screen.queryByRole('button', { name: 'Sign out of all devices' }),
  ).not.toBeOnTheScreen();
});

test('appearance: picking Light stores the choice', async () => {
  renderScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Light' }));
  expect(mockSetPref).toHaveBeenCalledWith('light');
});

test('appearance: the current choice is the selected row', () => {
  mockPref = 'dark';
  renderScreen();
  expect(
    screen.getByRole('button', { name: 'Dark', selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole('button', { name: 'System', selected: true }),
  ).not.toBeOnTheScreen();
});
