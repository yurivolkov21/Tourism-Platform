import { createRef } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { AppSheet, type AppSheetRef } from './sheet';

test('renders its content and exposes present/dismiss', () => {
  const ref = createRef<AppSheetRef>();
  render(
    <ThemeProvider>
      <AppSheet ref={ref}>
        <Text>Sheet body</Text>
      </AppSheet>
    </ThemeProvider>,
  );
  expect(screen.getByText('Sheet body')).toBeOnTheScreen();
  expect(typeof ref.current?.present).toBe('function');
  expect(typeof ref.current?.dismiss).toBe('function');
});
