import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { GlowBadge } from './glow-badge';
import { ThemeProvider } from './theme-provider';

test('renders children inside the success halo by default', () => {
  render(
    <ThemeProvider scheme="dark">
      <GlowBadge>
        <Text>OK</Text>
      </GlowBadge>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('glow-badge-success')).toBeOnTheScreen();
  expect(screen.getByText('OK')).toBeOnTheScreen();
});

test('error and neutral tones expose their own testIDs', () => {
  render(
    <ThemeProvider scheme="dark">
      <GlowBadge tone="error">
        <Text>X</Text>
      </GlowBadge>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('glow-badge-error')).toBeOnTheScreen();
  screen.unmount();
  render(
    <ThemeProvider scheme="dark">
      <GlowBadge tone="neutral">
        <Text>…</Text>
      </GlowBadge>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('glow-badge-neutral')).toBeOnTheScreen();
});
