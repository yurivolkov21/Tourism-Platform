import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import ExploreScreen from '../app/(tabs)/explore';

test('explore placeholder renders its copy', () => {
  render(
    <SafeAreaProvider>
      <ThemeProvider>
        <ExploreScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  expect(screen.getByText(/coming in the next update/i)).toBeOnTheScreen();
});
