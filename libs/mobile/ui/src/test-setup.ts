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

// jest-expo's useColorScheme() returns null → ThemeProvider resolves 'light'; specs assert against tokens.colors.light unless they mock the hook.
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
