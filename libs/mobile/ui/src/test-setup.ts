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
// passthrough, KeyboardAwareScrollView renders as a real ScrollView so
// screen.spec.tsx can assert on `keyboardAware` without a native module.
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

// jest-expo's useColorScheme() returns null → ThemeProvider resolves 'light',
// which on RN means the Navel cream palette; specs assert against
// tokens.colors.mobileLight unless they mock the hook.
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}

// expo-image's <Image> mounts via expo-modules-core's NativeViewManagerAdapter
// (same issue documented in apps/mobile/src/test-setup.ts) — swap it and
// expo-linear-gradient for plain Views. NO JSX in mock factories (babel-hoist).
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, props),
  };
});
