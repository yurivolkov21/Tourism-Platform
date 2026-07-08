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

// NOTE: android_ripple is intentionally untested here — jest-expo runs as iOS,
// where Pressable strips the prop before the host view and the memo wrapper
// hides it from composite matchers. Ripple is verified in the on-device pass.

test('merges caller style with the themed style', () => {
  render(
    <ThemeProvider>
      <Button label="Book now" onPress={jest.fn()} style={{ marginTop: 24 }} testID="btn" />
    </ThemeProvider>,
  );
  const flattened = StyleSheet.flatten(screen.getByTestId('btn').props.style);
  expect(flattened).toMatchObject({ marginTop: 24, minHeight: 44 });
});
