import { renderHook, act } from '@testing-library/react-native';

let urlListener: ((event: { url: string }) => void) | undefined;
const initialUrl: string | null = null;

jest.mock('expo-linking', () => ({
  addEventListener: (_event: string, cb: (e: { url: string }) => void) => {
    urlListener = cb;
    return { remove: jest.fn() };
  },
  getInitialURL: () => Promise.resolve(initialUrl),
  createURL: (path: string) => `tourism-mobile:///${path.replace(/^\//, '')}`,
}));

import {
  __resetIncomingLink,
  appRedirectUrl,
  useIncomingLink,
} from './deep-link';

beforeEach(() => __resetIncomingLink());

test('normalizes a triple-slashed URL to the form Supabase allow-lists', () => {
  // expo-linking's own `isTripleSlashed: false` is unreliable on dev-client
  // builds, and Supabase matches Redirect URLs exactly.
  expect(appRedirectUrl('/auth/reset')).toBe('tourism-mobile://auth/reset');
});

test('a link that arrives BEFORE the screen mounts is still delivered', () => {
  // This is the warm-start case: the OS delivers the link, expo-router
  // navigates, and only then does the destination screen mount. A hook that
  // starts listening at mount time would miss it and wait forever.
  act(() =>
    urlListener?.({ url: 'tourism-mobile://auth/reset#access_token=a' }),
  );

  const { result } = renderHook(() => useIncomingLink());
  expect(result.current).toBe('tourism-mobile://auth/reset#access_token=a');
});

test('a link that arrives after mounting reaches the hook too', () => {
  const { result } = renderHook(() => useIncomingLink());
  expect(result.current).toBeNull();

  act(() => urlListener?.({ url: 'tourism-mobile://auth/reset?code=c1' }));
  expect(result.current).toBe('tourism-mobile://auth/reset?code=c1');
});

test('unmounting stops the hook receiving further links', () => {
  const { result, unmount } = renderHook(() => useIncomingLink());
  unmount();
  act(() => urlListener?.({ url: 'tourism-mobile://auth/reset?code=late' }));
  expect(result.current).toBeNull();
});
