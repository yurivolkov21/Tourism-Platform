import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { ThemeProvider } from './theme-provider';
import { Accordion } from './accordion';

test('content is hidden until the header is pressed, then toggles', async () => {
  render(
    <ThemeProvider>
      <Accordion title="Day 1: Hanoi">
        <Text>Old Quarter walking tour</Text>
      </Accordion>
    </ThemeProvider>,
  );
  expect(screen.queryByText('Old Quarter walking tour')).not.toBeOnTheScreen();
  const header = screen.getByRole('button', { name: 'Day 1: Hanoi' });
  expect(header.props.accessibilityState).toMatchObject({ expanded: false });
  await userEvent.press(header);
  expect(screen.getByText('Old Quarter walking tour')).toBeOnTheScreen();
  expect(header.props.accessibilityState).toMatchObject({ expanded: true });
  await userEvent.press(header);
  expect(screen.queryByText('Old Quarter walking tour')).not.toBeOnTheScreen();
});

test('initiallyOpen renders the content up front', () => {
  render(
    <ThemeProvider>
      <Accordion title="Day 1" initiallyOpen>
        <Text>Visible</Text>
      </Accordion>
    </ThemeProvider>,
  );
  expect(screen.getByText('Visible')).toBeOnTheScreen();
});
