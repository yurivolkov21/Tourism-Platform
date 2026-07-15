import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ScrimImage } from './scrim-image';
import { ThemeProvider } from './theme-provider';

// expo-image + expo-linear-gradient are mocked in ../test-setup.ts.

function renderIt(ui: ReactElement) {
  return render(<ThemeProvider scheme="dark">{ui}</ThemeProvider>);
}

test('renders image container, tint, scrim and bottom-aligned children', () => {
  renderIt(
    <ScrimImage uri="https://x/img.jpg" alt="Halong Bay">
      <Text>Halong Bay cruise</Text>
    </ScrimImage>,
  );
  expect(screen.getByLabelText('Halong Bay')).toBeOnTheScreen();
  expect(screen.getByTestId('scrim-tint')).toBeOnTheScreen();
  expect(screen.getByTestId('scrim-grad')).toBeOnTheScreen();
  expect(screen.getByText('Halong Bay cruise')).toBeOnTheScreen();
});

test('tint={false} drops the grade overlay', () => {
  renderIt(<ScrimImage uri="https://x/img.jpg" alt="a" tint={false} />);
  expect(screen.queryByTestId('scrim-tint')).toBeNull();
});

test('scrim={false} drops the legibility gradient', () => {
  renderIt(<ScrimImage uri="https://x/img.jpg" alt="a" scrim={false} />);
  expect(screen.queryByTestId('scrim-grad')).toBeNull();
});
