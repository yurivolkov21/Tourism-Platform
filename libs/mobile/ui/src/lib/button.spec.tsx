import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Button } from './button';

test('fires onPress', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={onPress} />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Book now' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('disabled blocks presses', async () => {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={onPress} disabled loading testID="btn" />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByTestId('btn'));
  expect(onPress).not.toHaveBeenCalled();
});
