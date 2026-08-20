import { ScrollView, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { render, screen } from '@testing-library/react-native';
import { theme as tokens } from '@tourism/tokens/theme';
import { ThemeProvider } from './theme-provider';
import { Screen } from './screen';

test('wraps children in a themed safe container', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText('Body')).toBeOnTheScreen();
  expect(screen.getByTestId('screen')).toBeOnTheScreen();
});

test('renders a ScrollView by default', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.UNSAFE_getByType(ScrollView)).toBeTruthy();
});

test('hides the vertical scroll indicator by default', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen>
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(
    screen.UNSAFE_getByType(ScrollView).props.showsVerticalScrollIndicator,
  ).toBe(false);
});

test('does not render KeyboardAwareScrollView by default', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.UNSAFE_queryByType(KeyboardAwareScrollView)).toBeNull();
});

test('renders a KeyboardAwareScrollView when keyboardAware is true', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen" keyboardAware>
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.UNSAFE_getByType(KeyboardAwareScrollView)).toBeTruthy();
});

test('renders a plain View with no ScrollView when scroll={false}', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen" scroll={false}>
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull();
});

test('applies the light theme background color to the root container', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen testID="screen">
          <Text>Body</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  const root = screen.getByTestId('screen');
  expect(root.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        backgroundColor: tokens.colors.mobileLight.background,
      }),
    ]),
  );
});
