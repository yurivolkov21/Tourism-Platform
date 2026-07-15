import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Card } from './card';

test('renders children on a themed surface', () => {
  render(
    <ThemeProvider>
      <Card testID="card">
        <Text>Inside</Text>
      </Card>
    </ThemeProvider>,
  );
  expect(screen.getByText('Inside')).toBeOnTheScreen();
});

test('media variant drops the border, shadow and uses xl radius', () => {
  render(
    <ThemeProvider>
      <Card variant="media" testID="media-card" />
    </ThemeProvider>,
  );
  const style = StyleSheet.flatten(
    screen.getByTestId('media-card').props.style,
  );
  expect(style.borderWidth).toBe(0);
  expect(style.boxShadow).toBeUndefined();
});
