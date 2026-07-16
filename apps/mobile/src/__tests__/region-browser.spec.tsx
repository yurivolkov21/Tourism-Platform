import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import { DestinationHeroCard } from '../components/destination-hero-card';
import { RegionTabs } from '../components/region-tabs';
import type { DestinationChipVm } from '../lib/destinations';

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider scheme="dark">{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

const REGIONS = ['Northern Vietnam', 'Central Vietnam', 'Southern Vietnam'];

test('RegionTabs marks the active region and switches on press', () => {
  const onChange = jest.fn();
  wrap(
    <RegionTabs
      regions={REGIONS}
      active="Northern Vietnam"
      onChange={onChange}
    />,
  );
  expect(
    screen.getByLabelText('Northern Vietnam').props.accessibilityState.selected,
  ).toBe(true);
  fireEvent.press(screen.getByLabelText('Central Vietnam'));
  expect(onChange).toHaveBeenCalledWith('Central Vietnam');
});

test('DestinationHeroCard shows name, tours count and fires onPress', () => {
  const onPress = jest.fn();
  const vm: DestinationChipVm = {
    slug: 'ha-long-bay',
    name: 'Hạ Long Bay',
    image: 'https://x/img.jpg',
    toursCount: 4,
    region: 'Northern Vietnam',
  };
  wrap(<DestinationHeroCard destination={vm} onPress={onPress} />);
  expect(screen.getByText('Hạ Long Bay')).toBeOnTheScreen();
  expect(screen.getByText(/4/)).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('region-card-ha-long-bay'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
