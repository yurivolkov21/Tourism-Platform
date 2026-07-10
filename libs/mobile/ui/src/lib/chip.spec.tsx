import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Chip } from './chip';

test('fires onPress and exposes selected state', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Chip label="2–3 days" selected onPress={onPress} />
    </ThemeProvider>,
  );
  const chip = screen.getByRole('button', { name: '2–3 days' });
  expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  await userEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('unselected by default', () => {
  render(
    <ThemeProvider>
      <Chip label="4+ days" onPress={jest.fn()} />
    </ThemeProvider>,
  );
  expect(
    screen.getByRole('button', { name: '4+ days' }).props.accessibilityState,
  ).toMatchObject({
    selected: false,
  });
});
