import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
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
