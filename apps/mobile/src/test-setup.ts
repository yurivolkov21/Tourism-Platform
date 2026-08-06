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
    // Imperative hook API — plain-JS stand-ins good enough for synchronous
    // render assertions under the test renderer; real motion isn't
    // testable under RTL/jsdom regardless (worklets need the native part).
    // useSharedValue persists its object via useRef — a fresh `{value}` per
    // render (the naive mock) would silently discard mutations made between
    // renders, since real Reanimated shared values keep identity across them.
    useSharedValue: (init: unknown) => {
      const { useRef } = require('react');
      return useRef({ value: init }).current;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    withSequence: (...animations: unknown[]) =>
      animations[animations.length - 1],
    interpolate: (value: number, input: number[], output: number[]) =>
      output[Math.round(value)] ?? output[0],
    interpolateColor: (value: number, input: number[], output: string[]) =>
      output[Math.round(value)] ?? output[0],
    Extrapolation: { IDENTITY: 'identity', CLAMP: 'clamp', EXTEND: 'extend' },
  };
});
// useScrollToTop calls useRoute() internally, which throws outside a real
// NavigationContainer — expo-router provides that at runtime but tests don't
// mount one. Screens that use it aren't testing the scroll-to-top wiring
// itself, so a no-op stub (keeping every other export real) is enough.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useScrollToTop: jest.fn(),
}));

require('react-native-gesture-handler/jestSetup');

// Bottom sheet has native gesture/reanimated internals — render children
// in plain Views; present() is inert, dismiss() fires onDismiss.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView, TextInput } = require('react-native');
  const Modal = React.forwardRef(
    (props: { children?: unknown; onDismiss?: () => void }, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: () => props.onDismiss?.(),
      }));
      return React.createElement(View, null, props.children as never);
    },
  );
  return {
    BottomSheetModal: Modal,
    BottomSheetModalProvider: ({ children }: { children?: unknown }) =>
      children,
    BottomSheetView: View,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
    BottomSheetBackdrop: () => null,
  };
});

// Keyboard controller has native keyboard-tracking internals — provider is a
// passthrough, KeyboardAwareScrollView renders as a real ScrollView so specs
// exercising Screen's `keyboardAware` mode still render/scroll under RTL.
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    KeyboardProvider: ({ children }: { children?: unknown }) => children,
    KeyboardAwareScrollView: React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) =>
        React.createElement(ScrollView, { ...props, ref }),
    ),
  };
});

// Haptics are fire-and-forget native calls — a global no-op mock keeps every
// spec deterministic; specs that assert on haptics re-mock locally.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
