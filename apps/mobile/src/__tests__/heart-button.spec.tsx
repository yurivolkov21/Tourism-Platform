import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { HeartButton } from '../components/heart-button';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const mockUseWishlist = jest.fn();
jest.mock('../lib/wishlist', () => ({
  useWishlist: () => mockUseWishlist(),
}));

import { router } from 'expo-router';

function renderHeart() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <HeartButton tourId="uuid-1" />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test('guest tap routes to sign-in with the wishlist reason', async () => {
  mockUseWishlist.mockReturnValue({ isGuest: true, isSaved: () => false, toggle: jest.fn() });
  renderHeart();
  await userEvent.press(screen.getByRole('button', { name: 'Save tour' }));
  expect(router.push).toHaveBeenCalledWith('/auth/sign-in?reason=wishlist');
});

test('signed-in tap toggles; saved state flips the label', async () => {
  const toggle = jest.fn();
  mockUseWishlist.mockReturnValue({ isGuest: false, isSaved: () => true, toggle });
  renderHeart();
  const btn = screen.getByRole('button', { name: 'Remove from saved' });
  expect(btn.props.accessibilityState).toMatchObject({ selected: true });
  await userEvent.press(btn);
  expect(toggle).toHaveBeenCalledWith('uuid-1');
});
