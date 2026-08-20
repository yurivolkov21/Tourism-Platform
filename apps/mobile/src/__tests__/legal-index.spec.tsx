import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import LegalIndexScreen from '../app/legal/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <LegalIndexScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test.each([
  ['Privacy policy', '/legal/privacy'],
  ['Terms of service', '/legal/terms'],
  ['Cancellation & refund policy', '/legal/cancellation'],
])('%s opens %s', async (label, route) => {
  renderScreen();
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(mockPush).toHaveBeenCalledWith(route);
});
