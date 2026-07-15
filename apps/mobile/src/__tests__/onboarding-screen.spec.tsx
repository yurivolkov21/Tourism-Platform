import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { messages } from '@tourism/i18n';
import { ThemeProvider } from '@tourism/mobile-ui';
import { OnboardingScreen } from '../components/onboarding-screen';

const t = messages.mobile.onboarding;

function renderIt(onDone = jest.fn()) {
  render(
    <SafeAreaProvider>
      <ThemeProvider scheme="dark">
        <OnboardingScreen onDone={onDone} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return onDone;
}

test('renders the first page copy with the arrow control', () => {
  renderIt();
  expect(screen.getByText(t.pages[0].title)).toBeOnTheScreen();
  expect(screen.getByTestId('onboarding-next')).toBeOnTheScreen();
  expect(screen.queryByTestId('onboarding-signin')).toBeNull();
});

test('skip finishes as guest from any page', () => {
  const onDone = renderIt();
  fireEvent.press(screen.getByTestId('onboarding-skip'));
  expect(onDone).toHaveBeenCalledWith('guest');
});

test('advancing to the last page swaps the arrow for the choice pair', () => {
  const onDone = renderIt();
  fireEvent.press(screen.getByTestId('onboarding-next'));
  fireEvent.press(screen.getByTestId('onboarding-next'));
  expect(screen.queryByTestId('onboarding-next')).toBeNull();

  fireEvent.press(screen.getByTestId('onboarding-signin'));
  expect(onDone).toHaveBeenCalledWith('signIn');
  fireEvent.press(screen.getByTestId('onboarding-guest'));
  expect(onDone).toHaveBeenCalledWith('guest');
});
