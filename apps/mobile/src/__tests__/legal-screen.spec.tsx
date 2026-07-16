import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { privacyDoc, termsDoc } from '@tourism/i18n';
import { ThemeProvider } from '@tourism/mobile-ui';
import LegalScreen from '../app/legal/[doc]';

const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

function renderIt() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider scheme="dark">
        <LegalScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

test('renders the privacy document with numbered section headings', () => {
  mockUseLocalSearchParams.mockReturnValue({ doc: 'privacy' });
  renderIt();
  expect(screen.getByText(privacyDoc.title)).toBeOnTheScreen();
  expect(
    screen.getByText(`1. ${privacyDoc.sections[0].heading.toUpperCase()}`),
  ).toBeOnTheScreen();
  expect(screen.getByText(privacyDoc.intro[0])).toBeOnTheScreen();
});

test('renders the terms document when routed to /legal/terms', () => {
  mockUseLocalSearchParams.mockReturnValue({ doc: 'terms' });
  renderIt();
  expect(screen.getByText(termsDoc.title)).toBeOnTheScreen();
});

test('an unknown doc renders nothing (redirects home)', () => {
  mockUseLocalSearchParams.mockReturnValue({ doc: 'nonsense' });
  renderIt();
  expect(screen.queryByText(privacyDoc.title)).toBeNull();
  expect(screen.queryByText(termsDoc.title)).toBeNull();
});
