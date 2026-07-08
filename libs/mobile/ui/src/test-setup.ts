jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
}));

// react-native-safe-area-context's native views need a real onLayout pass to
// report insets, which never fires under the test renderer. Keep the actual
// module (SafeAreaView, types, …) but stub the pieces our components read so
// useSafeAreaInsets()/<SafeAreaProvider> resolve synchronously in tests.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    ...actual,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    SafeAreaProvider: ({ children }: { children?: unknown }) => children,
  };
});

// Reanimated 4's own mock still pulls react-native-worklets (throws without
// the native part), so mock the small surface we actually use: Animated.View
// + chainable entering/exiting/layout builders, all no-ops under jest.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain: Record<string, () => unknown> = {};
  for (const k of ['duration', 'springify', 'damping', 'delay', 'easing']) {
    chain[k] = () => chain;
  }
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    FadeIn: chain,
    FadeOut: chain,
    ZoomIn: chain,
    LinearTransition: chain,
  };
});

// jest-expo's useColorScheme() returns null → ThemeProvider resolves 'light'; specs assert against tokens.colors.light unless they mock the hook.
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
