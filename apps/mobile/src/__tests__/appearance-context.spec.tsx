import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { useTheme } from '@tourism/mobile-ui';
import { APPEARANCE_KEY } from '../lib/appearance';
import { AppearanceProvider } from '../lib/appearance-context';

function Probe() {
  const theme = useTheme();
  return <Text>scheme:{theme.scheme}</Text>;
}

function renderProvider() {
  return render(
    <AppearanceProvider>
      <Probe />
    </AppearanceProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test.each(['light', 'dark'])(
  'a stored %s preference pins the theme',
  async (pref) => {
    await AsyncStorage.setItem(APPEARANCE_KEY, pref);
    renderProvider();
    expect(await screen.findByText(`scheme:${pref}`)).toBeOnTheScreen();
  },
);

test('nothing renders until the stored preference is known (no scheme flash)', () => {
  renderProvider();
  expect(screen.queryByText(/^scheme:/)).not.toBeOnTheScreen();
});
