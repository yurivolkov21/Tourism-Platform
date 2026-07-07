import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { TextField } from './text-field';

test('renders label and forwards typing', async () => {
  const onChangeText = jest.fn();
  render(
    <ThemeProvider>
      <TextField label="Email" onChangeText={onChangeText} />
    </ThemeProvider>,
  );
  await userEvent.type(screen.getByLabelText('Email'), 'a');
  expect(onChangeText).toHaveBeenCalledWith('a');
});

test('renders the error message', () => {
  render(
    <ThemeProvider>
      <TextField label="Email" error="Please enter a valid email address." />
    </ThemeProvider>,
  );
  expect(screen.getByText('Please enter a valid email address.')).toBeOnTheScreen();
});

test('renders the leading slot', () => {
  render(
    <ThemeProvider>
      <TextField label="Search" leading={<Text>go</Text>} />
    </ThemeProvider>,
  );
  expect(screen.getByText('go')).toBeOnTheScreen();
});
