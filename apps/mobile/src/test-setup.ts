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

// expo-image's <Image> mounts via expo-modules-core's NativeViewManagerAdapter,
// which requires react-native's renderer directly and trips a "react and
// react-native-renderer must match" check under react-test-renderer (the
// version it sees differs from the one react-test-renderer itself runs).
// Swap it for a plain View so component tests don't need the native module.
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

// AsyncStorage native module doesn't exist under jest — use the package's own mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated + gesture-handler have native parts jest can't load — use the
// libraries' official mocks (entering/exiting props become no-ops).
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
require('react-native-gesture-handler/jestSetup');

// Haptics are fire-and-forget native calls — a global no-op mock keeps every
// spec deterministic; specs that assert on haptics re-mock locally.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
