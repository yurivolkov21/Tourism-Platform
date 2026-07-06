import { Text } from 'react-native';
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
