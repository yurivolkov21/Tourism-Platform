import { render, screen } from '@testing-library/react-native';
import { messages } from '@tourism/i18n';
import { ThemeProvider } from '@tourism/mobile-ui';
import { BrandSplash } from '../components/brand-splash';

test('renders the monogram, wordmark and tagline', () => {
  render(
    <ThemeProvider scheme="dark">
      <BrandSplash />
    </ThemeProvider>,
  );
  expect(screen.getByText('N')).toBeOnTheScreen();
  expect(screen.getByText(messages.brand.name)).toBeOnTheScreen();
  expect(screen.getByText(messages.brand.tagline)).toBeOnTheScreen();
});
