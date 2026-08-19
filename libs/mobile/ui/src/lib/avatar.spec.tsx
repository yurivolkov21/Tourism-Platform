import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Avatar } from './avatar';
import { ThemeProvider } from './theme-provider';

// expo-image is mocked in ../test-setup.ts.

test('renders the photo when a uri is given, not the fallback', () => {
  render(
    <ThemeProvider scheme="dark">
      <Avatar uri="https://cdn/avatar.jpg" size={56}>
        <Text>J</Text>
      </Avatar>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('avatar-image').props.source).toEqual({
    uri: 'https://cdn/avatar.jpg',
  });
  expect(screen.queryByText('J')).toBeNull();
});

test('renders the fallback children when uri is absent', () => {
  render(
    <ThemeProvider scheme="dark">
      <Avatar uri={null} size={56}>
        <Text>J</Text>
      </Avatar>
    </ThemeProvider>,
  );
  expect(screen.getByText('J')).toBeOnTheScreen();
  expect(screen.queryByTestId('avatar-image')).toBeNull();
});

test('defaults to a circle (radius = size / 2) unless overridden', () => {
  render(
    <ThemeProvider scheme="dark">
      <Avatar uri={null} size={56} testID="tile">
        <Text>J</Text>
      </Avatar>
    </ThemeProvider>,
  );
  expect(screen.getByTestId('tile').props.style.borderRadius).toBe(28);
});
