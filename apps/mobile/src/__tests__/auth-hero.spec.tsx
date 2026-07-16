import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { AuthHero } from '../components/auth-hero';

test('renders the title over the tint + background fade', () => {
  render(
    <ThemeProvider scheme="dark">
      <AuthHero image={1} title="Welcome back" />
    </ThemeProvider>,
  );
  expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  expect(screen.getByTestId('auth-hero-tint')).toBeOnTheScreen();
  expect(screen.getByTestId('auth-hero-fade')).toBeOnTheScreen();
});
