import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

test('merges caller style with the themed style', () => {
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={jest.fn()} style={{ marginTop: 24 }} testID="btn" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('btn').props.style);
  expect(flattened).toMatchObject({ marginTop: 24, minHeight: 44 });
});
